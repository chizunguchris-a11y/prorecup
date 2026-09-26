import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const urlTest = process.env.TRACEABILITY_TEST_DATABASE_URL;

describe("Concurrence réelle PostgreSQL des allocations vente/lot", function () {
    this.timeout(30000);

    if (!urlTest) {
        it.skip("requiert TRACEABILITY_TEST_DATABASE_URL vers une base PostgreSQL locale dédiée", function () {});
        return;
    }

    let administration;
    let poolApplication;
    let facteurCarboneRepository;
    let impactCarboneRepository;
    let trouverFacteurOriginal;
    let trouverImpactOriginal;
    let venteService;
    const schema = `trace_vente_lots_${randomUUID().replaceAll("-", "")}`;
    const ids = {
        organisation: "00000000-0000-4000-8000-000000000001",
        type: "00000000-0000-4000-8000-000000000002",
        stock: "00000000-0000-4000-8000-000000000003",
        lot: "00000000-0000-4000-8000-000000000004",
        utilisateur: "00000000-0000-4000-8000-000000000005"
    };

    before(async function () {
        administration = new Pool({ connectionString: urlTest, max: 2 });
        await administration.query(`CREATE SCHEMA ${schema}`);
        await administration.query(`
            CREATE TABLE ${schema}.stocks (
                id uuid PRIMARY KEY,
                organisation_id uuid NOT NULL,
                type_dechet_id uuid NOT NULL,
                quantite numeric(12,3) NOT NULL,
                unite text NOT NULL DEFAULT 'kg',
                tracabilite_lots_active boolean NOT NULL,
                date_mise_a_jour timestamptz DEFAULT now()
            );
            CREATE TABLE ${schema}.lots (
                id uuid PRIMARY KEY,
                organisation_id uuid NOT NULL,
                type_dechet_id uuid NOT NULL,
                code_qr text NOT NULL,
                poids_reel numeric(12,3) NOT NULL,
                quantite_restante_kg numeric(12,3),
                statut_lot text NOT NULL,
                modifie_le timestamptz DEFAULT now()
            );
            CREATE TABLE ${schema}.ventes (
                id uuid PRIMARY KEY DEFAULT (md5(random()::text || clock_timestamp()::text)::uuid),
                organisation_id uuid NOT NULL,
                stock_id uuid NOT NULL,
                quantite numeric(12,3) NOT NULL,
                prix_unitaire numeric(12,2) NOT NULL,
                montant_total numeric(12,2) NOT NULL,
                acheteur_nom text NOT NULL,
                reference_vente text,
                statut text NOT NULL,
                cree_par uuid,
                provenance_lots_statut text NOT NULL,
                date_vente timestamptz DEFAULT now()
            );
            CREATE TABLE ${schema}.mouvements_stock (
                id uuid PRIMARY KEY DEFAULT (md5(random()::text || clock_timestamp()::text)::uuid),
                stock_id uuid NOT NULL,
                lot_id uuid,
                vente_id uuid,
                type_mouvement text NOT NULL,
                quantite numeric(12,3) NOT NULL,
                date_mouvement timestamptz DEFAULT now()
            );
            CREATE TABLE ${schema}.vente_lots (
                id uuid PRIMARY KEY DEFAULT (md5(random()::text || clock_timestamp()::text)::uuid),
                organisation_id uuid NOT NULL,
                vente_id uuid NOT NULL,
                lot_id uuid NOT NULL,
                quantite_kg numeric(12,3) NOT NULL,
                cree_le timestamptz DEFAULT now()
            );
        `);
        await administration.query(`
            INSERT INTO ${schema}.stocks
                (id, organisation_id, type_dechet_id, quantite, tracabilite_lots_active)
            VALUES ($1, $2, $3, 10, true);
        `, [ids.stock, ids.organisation, ids.type]);
        await administration.query(`
            INSERT INTO ${schema}.lots
                (id, organisation_id, type_dechet_id, code_qr, poids_reel, quantite_restante_kg, statut_lot)
            VALUES ($1, $2, $3, 'PR-L-CONCURRENCE', 10, 10, 'en_stock');
        `, [ids.lot, ids.organisation, ids.type]);
        await administration.query(`
            INSERT INTO ${schema}.mouvements_stock
                (stock_id, lot_id, vente_id, type_mouvement, quantite)
            VALUES ($1, $2, NULL, 'ENTREE', 10);
        `, [ids.stock, ids.lot]);

        const applicationUrl = new URL(urlTest);
        applicationUrl.searchParams.set("options", `-c search_path=${schema}`);
        process.env.DATABASE_URL = applicationUrl.toString();
        process.env.SKIP_DATABASE_STARTUP_CHECK = "1";

        [
            { default: venteService },
            { default: poolApplication },
            { default: facteurCarboneRepository },
            { default: impactCarboneRepository }
        ] = await Promise.all([
            import("../src/services/VenteService.js"),
            import("../src/config/db.js"),
            import("../src/repositories/FacteurCarboneRepository.js"),
            import("../src/repositories/ImpactCarboneRepository.js")
        ]);
        trouverFacteurOriginal = facteurCarboneRepository.trouverFacteurApplicable;
        trouverImpactOriginal = impactCarboneRepository.trouverParVenteId;
        facteurCarboneRepository.trouverFacteurApplicable = async () => null;
        impactCarboneRepository.trouverParVenteId = async () => null;
    });

    after(async function () {
        if (facteurCarboneRepository) {
            facteurCarboneRepository.trouverFacteurApplicable = trouverFacteurOriginal;
        }
        if (impactCarboneRepository) {
            impactCarboneRepository.trouverParVenteId = trouverImpactOriginal;
        }
        if (poolApplication) await poolApplication.end();
        if (administration) {
            await administration.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
            await administration.end();
        }
    });

    it("sérialise deux ventes concurrentes sans double allocation", async function () {
        const vente = suffixe => venteService.creer({
            organisation_id: ids.organisation,
            stock_id: ids.stock,
            quantite: 7,
            prix_unitaire: 500,
            acheteur_nom: `Acheteur ${suffixe}`,
            reference_vente: `VTE-CONC-${suffixe}`,
            cree_par: ids.utilisateur
        });

        const resultats = await Promise.allSettled([vente("A"), vente("B")]);
        const diagnostic = resultats.map((item, index) =>
            item.status === "fulfilled"
                ? `vente ${index + 1}: succès`
                : `vente ${index + 1}: ${item.reason?.message || item.reason}`
        ).join(" | ");
        assert.equal(
            resultats.filter(item => item.status === "fulfilled").length,
            1,
            diagnostic
        );
        assert.equal(resultats.filter(item => item.status === "rejected").length, 1);
        assert.match(
            resultats.find(item => item.status === "rejected").reason.message,
            /Stock insuffisant/
        );

        const verification = await administration.query(`
            SELECT
                (SELECT quantite FROM ${schema}.stocks WHERE id = $1) AS stock,
                (SELECT quantite_restante_kg FROM ${schema}.lots WHERE id = $2) AS lot,
                (SELECT COUNT(*) FROM ${schema}.ventes) AS ventes,
                (SELECT COALESCE(SUM(quantite_kg), 0) FROM ${schema}.vente_lots) AS allocations,
                (SELECT COUNT(*) FROM ${schema}.mouvements_stock WHERE type_mouvement = 'SORTIE') AS sorties;
        `, [ids.stock, ids.lot]);
        assert.equal(Number(verification.rows[0].stock), 3);
        assert.equal(Number(verification.rows[0].lot), 3);
        assert.equal(Number(verification.rows[0].ventes), 1);
        assert.equal(Number(verification.rows[0].allocations), 7);
        assert.equal(Number(verification.rows[0].sorties), 1);
    });
});
