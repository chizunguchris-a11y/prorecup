import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const testUrl = process.env.TEST_DATABASE_URL;
const productionUrl = process.env.DATABASE_URL;

if (!testUrl) {
    throw new Error("TEST_DATABASE_URL est requise.");
}
if (productionUrl && testUrl === productionUrl) {
    throw new Error("Refus de préparer une base qui correspond à DATABASE_URL.");
}
if (!process.env.INTEGRATION_TEST_EMAIL || !process.env.INTEGRATION_TEST_PASSWORD) {
    throw new Error("INTEGRATION_TEST_EMAIL et INTEGRATION_TEST_PASSWORD sont requis.");
}

const pool = new Pool({ connectionString: testUrl, max: 1 });
const dossierCourant = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(dossierCourant, "../../database/migrations");

const baseSchema = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    nom_court VARCHAR(50),
    email VARCHAR(255),
    telephone VARCHAR(30),
    adresse TEXT,
    ville VARCHAR(100),
    pays VARCHAR(100) NOT NULL DEFAULT 'RDC',
    devise VARCHAR(10) NOT NULL DEFAULT 'USD',
    fuseau_horaire VARCHAR(100) NOT NULL DEFAULT 'Africa/Kinshasa',
    logo TEXT,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    supprime_le TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    supprime_le TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS utilisateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    role_id UUID REFERENCES roles(id),
    nom VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe TEXT NOT NULL,
    telephone VARCHAR(40),
    photo_url TEXT,
    email_verifie_le TIMESTAMPTZ,
    telephone_verifie_le TIMESTAMPTZ,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    dernier_acces TIMESTAMPTZ,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    supprime_le TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL UNIQUE REFERENCES utilisateurs(id),
    telephone VARCHAR(40),
    photo_url TEXT,
    statut VARCHAR(30) NOT NULL DEFAULT 'actif',
    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    date_embauche DATE,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(180) NOT NULL,
    type_client VARCHAR(30),
    contact_email VARCHAR(254),
    contact_telephone VARCHAR(40),
    adresse_siege TEXT,
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sites_de_collecte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(180) NOT NULL,
    adresse TEXT,
    zone_geographique VARCHAR(180),
    responsable_nom VARCHAR(150),
    organisation_id UUID REFERENCES organisations(id),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS types_dechets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id),
    nom VARCHAR(150) NOT NULL,
    description TEXT,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tricycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    numero_interne VARCHAR(100) NOT NULL,
    plaque_identification VARCHAR(100),
    marque VARCHAR(100),
    modele VARCHAR(100),
    capacite_kg NUMERIC(12,3) NOT NULL,
    statut VARCHAR(30) NOT NULL DEFAULT 'disponible',
    etat VARCHAR(30) NOT NULL DEFAULT 'bon',
    date_mise_en_service DATE,
    observations TEXT,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organisation_id, numero_interne),
    UNIQUE (organisation_id, plaque_identification)
);

CREATE TABLE IF NOT EXISTS collectes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites_de_collecte(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    agent_id UUID REFERENCES utilisateurs(id),
    type_dechet_id UUID NOT NULL REFERENCES types_dechets(id),
    date_collecte TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    poids_estime NUMERIC(12,3) NOT NULL,
    statut VARCHAR(30) NOT NULL DEFAULT 'en_attente',
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    agent_id UUID NOT NULL REFERENCES agents(id),
    tricycle_id UUID NOT NULL REFERENCES tricycles(id),
    date_prevue DATE NOT NULL,
    heure_depart_prevue TIME,
    heure_retour_prevue TIME,
    heure_depart_reelle TIMESTAMPTZ,
    heure_retour_reelle TIMESTAMPTZ,
    statut VARCHAR(30) NOT NULL DEFAULT 'planifiee',
    observations TEXT,
    cree_par UUID REFERENCES utilisateurs(id),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS missions_collectes (
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    collecte_id UUID NOT NULL REFERENCES collectes(id) ON DELETE CASCADE,
    ordre_collecte INTEGER NOT NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (mission_id, collecte_id),
    UNIQUE (mission_id, ordre_collecte)
);

CREATE TABLE IF NOT EXISTS mission_evenements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    collecte_id UUID REFERENCES collectes(id),
    type_evenement VARCHAR(50) NOT NULL,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    precision_gps NUMERIC(10,2),
    observations TEXT,
    cree_par UUID REFERENCES utilisateurs(id),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collecte_id UUID NOT NULL REFERENCES collectes(id),
    type_dechet_id UUID NOT NULL REFERENCES types_dechets(id),
    poids_estime NUMERIC(12,3),
    poids_reel NUMERIC(12,3),
    statut_lot VARCHAR(30),
    cree_par UUID REFERENCES utilisateurs(id)
);

CREATE TABLE IF NOT EXISTS stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    type_dechet_id UUID NOT NULL REFERENCES types_dechets(id),
    quantite NUMERIC(12,3) NOT NULL DEFAULT 0,
    unite VARCHAR(20) NOT NULL DEFAULT 'kg',
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organisation_id, type_dechet_id)
);

CREATE TABLE IF NOT EXISTS ventes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    stock_id UUID NOT NULL REFERENCES stocks(id),
    quantite NUMERIC(12,3) NOT NULL,
    prix_unitaire NUMERIC(12,2) NOT NULL,
    montant_total NUMERIC(12,2) NOT NULL,
    acheteur_nom VARCHAR(180) NOT NULL,
    reference_vente VARCHAR(120),
    statut VARCHAR(30) NOT NULL DEFAULT 'confirmee',
    cree_par UUID REFERENCES utilisateurs(id),
    date_vente TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mouvements_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL REFERENCES stocks(id),
    lot_id UUID REFERENCES lots(id),
    vente_id UUID REFERENCES ventes(id),
    type_mouvement VARCHAR(30) NOT NULL,
    quantite NUMERIC(12,3) NOT NULL,
    date_mouvement TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facteurs_carbone (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_dechet_id UUID NOT NULL REFERENCES types_dechets(id),
    facteur_kg_co2e_par_kg NUMERIC(14,6) NOT NULL,
    source TEXT,
    version_source VARCHAR(100),
    zone_geographique VARCHAR(150),
    statut VARCHAR(30) NOT NULL DEFAULT 'valide',
    date_debut_validite DATE NOT NULL,
    date_fin_validite DATE
);

CREATE TABLE IF NOT EXISTS impacts_carbone (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vente_id UUID NOT NULL UNIQUE REFERENCES ventes(id),
    facteur_carbone_id UUID NOT NULL REFERENCES facteurs_carbone(id),
    quantite_kg NUMERIC(12,3) NOT NULL,
    facteur_utilise NUMERIC(14,6) NOT NULL,
    co2e_estime_kg NUMERIC(14,3) NOT NULL,
    date_calcul TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID REFERENCES utilisateurs(id),
    organisation_id UUID REFERENCES organisations(id),
    action VARCHAR(100) NOT NULL,
    entite VARCHAR(100),
    entite_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journaux_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id),
    utilisateur_id UUID REFERENCES utilisateurs(id),
    action VARCHAR(100) NOT NULL,
    ressource VARCHAR(100) NOT NULL,
    ressource_id UUID,
    methode_http VARCHAR(20),
    route TEXT,
    adresse_ip VARCHAR(64),
    navigateur TEXT,
    ancien_etat JSONB,
    nouvel_etat JSONB,
    contexte JSONB,
    succes BOOLEAN NOT NULL DEFAULT TRUE,
    message_erreur TEXT,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    utilisateur_id UUID REFERENCES utilisateurs(id),
    type VARCHAR(50) NOT NULL,
    categorie VARCHAR(100) NOT NULL,
    titre VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    ressource VARCHAR(100),
    ressource_id UUID,
    lien TEXT,
    contexte JSONB,
    expire_le TIMESTAMPTZ,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications_utilisateurs (
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    lue BOOLEAN NOT NULL DEFAULT FALSE,
    lue_le TIMESTAMPTZ,
    supprimee BOOLEAN NOT NULL DEFAULT FALSE,
    supprimee_le TIMESTAMPTZ,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id, utilisateur_id)
);
`;

const migrations = (await fs.readdir(migrationsDir))
    .filter((nom) => nom.endsWith(".sql"))
    .sort();

async function appliquerMigrations(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS prorecup_test_migrations (
            nom TEXT PRIMARY KEY,
            appliquee_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    for (const nom of migrations) {
        const dejaAppliquee = await client.query(
            "SELECT 1 FROM prorecup_test_migrations WHERE nom=$1",
            [nom]
        );
        if (dejaAppliquee.rowCount) continue;

        const sql = (await fs.readFile(path.join(migrationsDir, nom), "utf8"))
            .replace(/^\uFEFF/, "");
        await client.query(sql);
        await client.query(
            "INSERT INTO prorecup_test_migrations(nom) VALUES($1)",
            [nom]
        );
    }
}

async function creerFixtures(client) {
    const organisationId = process.env.PRORECUP_INTERNAL_ORGANISATION_ID;
    if (!organisationId) throw new Error("PRORECUP_INTERNAL_ORGANISATION_ID est requise.");

    const ids = {
        admin: "10000000-0000-4000-8000-000000000001",
        manager: "10000000-0000-4000-8000-000000000002",
        agent: "10000000-0000-4000-8000-000000000003",
        clientUser: "10000000-0000-4000-8000-000000000004",
        client: "20000000-0000-4000-8000-000000000001",
        site: "30000000-0000-4000-8000-000000000001",
        waste: "40000000-0000-4000-8000-000000000001",
        agentProfile: "50000000-0000-4000-8000-000000000001",
        tricycle: "60000000-0000-4000-8000-000000000001",
        collecte: "70000000-0000-4000-8000-000000000001"
    };
    const passwordHash = await bcrypt.hash(process.env.INTEGRATION_TEST_PASSWORD, 10);

    await client.query("BEGIN");
    try {
        await client.query(`
            INSERT INTO organisations(id,nom,slug,nom_court,email,pays,devise,fuseau_horaire)
            VALUES($1,'Pro Récup RDC','prorecup-rdc','Pro Récup','support-test@prorecup.test','RDC','USD','Africa/Kinshasa')
            ON CONFLICT(id) DO UPDATE SET nom=EXCLUDED.nom, actif=true, modifie_le=CURRENT_TIMESTAMP
        `, [organisationId]);

        const rolesClient = await client.query(`
            SELECT id FROM roles
            WHERE organisation_id IS NULL AND LOWER(nom)='client'
            ORDER BY cree_le, id
        `);
        if (rolesClient.rows.length > 1) {
            const roleCanonique = rolesClient.rows[0].id;
            const doublons = rolesClient.rows.slice(1).map((role) => role.id);
            await client.query(
                "UPDATE utilisateurs SET role_id=$1 WHERE role_id=ANY($2::uuid[])",
                [roleCanonique, doublons]
            );
            await client.query("DELETE FROM roles WHERE id=ANY($1::uuid[])", [doublons]);
        }

        const roles = ["admin", "manager", "agent_valorisation_carbone", "client"];
        const roleIds = {};
        for (const role of roles) {
            const roleOrganisation = role === "client" ? null : organisationId;
            const resultat = await client.query(`
                INSERT INTO roles(organisation_id,nom,description,actif)
                SELECT $1,$2::varchar,'Fixture recette Product Finish',true
                WHERE NOT EXISTS (
                    SELECT 1 FROM roles
                    WHERE LOWER(nom)=LOWER($2::varchar)
                      AND organisation_id IS NOT DISTINCT FROM $1::uuid
                )
                RETURNING id
            `, [roleOrganisation, role]);
            const trouve = resultat.rows[0] || (await client.query(
                "SELECT id FROM roles WHERE LOWER(nom)=LOWER($1) ORDER BY organisation_id NULLS LAST LIMIT 1",
                [role]
            )).rows[0];
            roleIds[role] = trouve.id;
        }

        const utilisateurs = [
            [ids.admin, "Administrateur Recette", process.env.INTEGRATION_TEST_EMAIL, roleIds.admin],
            [ids.manager, "Manager Recette", "qa.manager@prorecup.test", roleIds.manager],
            [ids.agent, "Agent Carbone Recette", "qa.agent@prorecup.test", roleIds.agent_valorisation_carbone],
            [ids.clientUser, "Client Portail Recette", "qa.client@prorecup.test", roleIds.client]
        ];
        for (const [id, nom, email, roleId] of utilisateurs) {
            await client.query(`
                INSERT INTO utilisateurs(id,organisation_id,role_id,nom,email,mot_de_passe,actif,email_verifie_le,auth_epoch)
                VALUES($1,$2,$3,$4,$5,$6,true,CURRENT_TIMESTAMP,1)
                ON CONFLICT(id) DO UPDATE SET role_id=EXCLUDED.role_id,nom=EXCLUDED.nom,email=EXCLUDED.email,
                    mot_de_passe=EXCLUDED.mot_de_passe,actif=true,email_verifie_le=CURRENT_TIMESTAMP,
                    invitation_en_attente=false,invitation_statut=NULL,modifie_le=CURRENT_TIMESTAMP
            `, [id, organisationId, roleId, nom, email, passwordHash]);
        }

        await client.query(`
            DELETE FROM agents a
            WHERE a.utilisateur_id=$1
              AND NOT EXISTS (SELECT 1 FROM missions m WHERE m.agent_id=a.id)
        `, [ids.admin]);

        await client.query(`
            INSERT INTO clients(id,nom,type_client,secteur_activite,contact_email,organisation_id)
            VALUES($1,'Client Recette Product Finish','entreprise','recyclage','qa.client@prorecup.test',$2)
            ON CONFLICT(id) DO UPDATE SET nom=EXCLUDED.nom,type_client=EXCLUDED.type_client
        `, [ids.client, organisationId]);
        await client.query(`
            INSERT INTO client_utilisateurs(organisation_id,client_id,utilisateur_id,actif)
            VALUES($1,$2,$3,true) ON CONFLICT(client_id,utilisateur_id) DO UPDATE SET actif=true
        `, [organisationId, ids.client, ids.clientUser]);
        await client.query(`
            INSERT INTO sites_de_collecte(id,nom,adresse,zone_geographique,responsable_nom,organisation_id)
            VALUES($1,'Site Recette Product Finish','Adresse synthétique','Kinshasa','Responsable Recette',$2)
            ON CONFLICT(id) DO UPDATE SET nom=EXCLUDED.nom
        `, [ids.site, organisationId]);
        await client.query(`
            INSERT INTO client_sites(organisation_id,client_id,site_id,actif)
            VALUES($1,$2,$3,true) ON CONFLICT(client_id,site_id) DO UPDATE SET actif=true
        `, [organisationId, ids.client, ids.site]);
        await client.query(`
            INSERT INTO types_dechets(id,organisation_id,nom,description,actif)
            VALUES($1,$2,'Plastique recette','Fixture synthétique',true)
            ON CONFLICT(id) DO UPDATE SET actif=true
        `, [ids.waste, organisationId]);
        await client.query(`
            INSERT INTO agents(id,utilisateur_id,telephone,statut,disponible,date_embauche)
            VALUES($1,$2,'+243900000001','actif',true,CURRENT_DATE)
            ON CONFLICT(utilisateur_id) DO UPDATE SET statut='actif',disponible=true,modifie_le=CURRENT_TIMESTAMP
        `, [ids.agentProfile, ids.agent]);
        await client.query(`
            INSERT INTO tricycles(id,organisation_id,numero_interne,plaque_identification,marque,modele,capacite_kg,statut,etat)
            VALUES($1,$2,'TRI-RECETTE-BASE','PR-TEST-BASE','Fixture','Product Finish',250,'disponible','bon')
            ON CONFLICT(id) DO UPDATE SET statut='disponible',etat='bon',modifie_le=CURRENT_TIMESTAMP
        `, [ids.tricycle, organisationId]);
        await client.query(`
            INSERT INTO collectes(id,site_id,client_id,agent_id,type_dechet_id,poids_estime,statut)
            VALUES($1,$2,$3,$4,$5,25,'en_attente')
            ON CONFLICT(id) DO UPDATE SET statut='en_attente',modifie_le=CURRENT_TIMESTAMP
        `, [ids.collecte, ids.site, ids.client, ids.agent, ids.waste]);
        await client.query("COMMIT");
    } catch (erreur) {
        await client.query("ROLLBACK");
        throw erreur;
    }
}

const client = await pool.connect();
try {
    await client.query(baseSchema);
    await appliquerMigrations(client);
    await creerFixtures(client);
    const etat = await client.query("SELECT COUNT(*)::int AS migrations FROM prorecup_test_migrations");
    console.log(`TEST_DATABASE_PREPARED=true MIGRATIONS=${etat.rows[0].migrations}`);
} finally {
    client.release();
    await pool.end();
}
