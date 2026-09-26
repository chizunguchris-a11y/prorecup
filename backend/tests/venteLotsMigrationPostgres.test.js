import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import pg from "pg";

const { Pool } = pg;
const urlTest = process.env.TRACEABILITY_TEST_DATABASE_URL;
const migration = fs.readFileSync(
    new URL("../../database/migrations/20260926_05_ventes_lots_fifo_v1.sql", import.meta.url),
    "utf8"
);
const rollback = fs.readFileSync(
    new URL("../../database/rollbacks/20260926_05_ventes_lots_fifo_v1.rollback.sql", import.meta.url),
    "utf8"
);

describe("Cycle réel migration/rollback ventes-lots sur PostgreSQL dédié", function () {
    this.timeout(30000);

    if (!urlTest) {
        it.skip("requiert TRACEABILITY_TEST_DATABASE_URL vers une base PostgreSQL locale dédiée", function () {});
        return;
    }

    let pool;
    let client;
    const schema = `migration_vente_lots_${randomUUID().replaceAll("-", "")}`;

    before(async function () {
        pool = new Pool({ connectionString: urlTest, max: 1 });
        client = await pool.connect();
        await client.query(`CREATE SCHEMA ${schema}`);
        await client.query(`SET search_path TO ${schema}`);
        await client.query(`
            CREATE TABLE lots (
                id uuid PRIMARY KEY,
                organisation_id uuid NOT NULL,
                type_dechet_id uuid NOT NULL,
                poids_reel numeric(12,3),
                statut_lot text,
                modifie_le timestamptz DEFAULT now()
            );
            CREATE TABLE stocks (
                id uuid PRIMARY KEY,
                organisation_id uuid NOT NULL,
                type_dechet_id uuid NOT NULL,
                quantite numeric(12,3) NOT NULL,
                date_mise_a_jour timestamptz DEFAULT now(),
                UNIQUE (organisation_id, type_dechet_id)
            );
            CREATE TABLE ventes (
                id uuid PRIMARY KEY,
                organisation_id uuid NOT NULL,
                stock_id uuid NOT NULL,
                quantite numeric(12,3) NOT NULL
            );
            CREATE TABLE mouvements_stock (
                id uuid PRIMARY KEY,
                stock_id uuid NOT NULL,
                lot_id uuid,
                vente_id uuid,
                type_mouvement text NOT NULL,
                quantite numeric(12,3) NOT NULL,
                date_mouvement timestamptz NOT NULL DEFAULT now()
            );
        `);
    });

    after(async function () {
        if (client) {
            try {
                await client.query("ROLLBACK");
                await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
            } finally {
                client.release();
            }
        }
        if (pool) await pool.end();
    });

    it("applique, protège, rollback puis réapplique la migration", async function () {
        await client.query(migration);

        const objets = await client.query(`
            SELECT
                to_regclass('vente_lots') IS NOT NULL AS table_allocation,
                EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = 'lots'
                      AND column_name = 'quantite_restante_kg'
                ) AS colonne_reste,
                EXISTS (
                    SELECT 1 FROM pg_indexes
                    WHERE schemaname = current_schema()
                      AND indexname = 'mouvements_stock_entree_lot_unique_idx'
                ) AS index_entree_unique,
                (SELECT COUNT(*) FROM pg_trigger
                  WHERE tgrelid IN ('stocks'::regclass, 'lots'::regclass, 'ventes'::regclass, 'vente_lots'::regclass)
                    AND NOT tgisinternal) >= 5 AS triggers_presents;
        `);
        assert.deepEqual(objets.rows[0], {
            table_allocation: true,
            colonne_reste: true,
            index_entree_unique: true,
            triggers_presents: true
        });

        const organisation = "00000000-0000-4000-8000-000000000001";
        const type = "00000000-0000-4000-8000-000000000002";
        const stock = "00000000-0000-4000-8000-000000000003";
        const lot = "00000000-0000-4000-8000-000000000004";
        const mouvement = "00000000-0000-4000-8000-000000000005";

        await client.query("BEGIN");
        await client.query(
            "INSERT INTO stocks (id,organisation_id,type_dechet_id,quantite,tracabilite_lots_active) VALUES ($1,$2,$3,20,false)",
            [stock, organisation, type]
        );
        await client.query(
            "INSERT INTO lots (id,organisation_id,type_dechet_id,poids_reel,quantite_restante_kg,statut_lot) VALUES ($1,$2,$3,20,NULL,'en_stock')",
            [lot, organisation, type]
        );
        await client.query(
            "INSERT INTO mouvements_stock (id,stock_id,lot_id,type_mouvement,quantite) VALUES ($1,$2,$3,'ENTREE',20)",
            [mouvement, stock, lot]
        );
        await client.query("UPDATE stocks SET tracabilite_lots_active=true WHERE id=$1", [stock]);
        await assert.rejects(() => client.query("COMMIT"), /sans quantité restante/);
        await client.query("ROLLBACK");

        await client.query("TRUNCATE vente_lots, mouvements_stock, ventes, lots, stocks CASCADE");
        await assert.rejects(async () => {
            await client.query("BEGIN");
            await client.query(
                "INSERT INTO lots (id,organisation_id,type_dechet_id,poids_reel,quantite_restante_kg,statut_lot) VALUES ($1,$2,$3,10,10,'en_stock')",
                [lot, organisation, type]
            );
            await client.query(rollback);
        }, /Rollback ventes\/lots refusé/);
        await client.query("ROLLBACK");

        await client.query("TRUNCATE vente_lots, mouvements_stock, ventes, lots, stocks CASCADE");
        await client.query(rollback);
        const apresRollback = await client.query(`
            SELECT
                to_regclass('vente_lots') IS NULL AS table_supprimee,
                NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = 'lots'
                      AND column_name = 'quantite_restante_kg'
                ) AS colonne_supprimee;
        `);
        assert.deepEqual(apresRollback.rows[0], {
            table_supprimee: true,
            colonne_supprimee: true
        });

        await client.query(migration);
        const reappliquee = await client.query("SELECT to_regclass('vente_lots') IS NOT NULL AS ok");
        assert.equal(reappliquee.rows[0].ok, true);
    });
});
