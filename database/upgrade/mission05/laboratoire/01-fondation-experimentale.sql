-- PRO RECUP / Mission 05 -- RECONSTRUCTION EXPERIMENTALE, NON VALIDEE
-- A EXECUTER UNIQUEMENT dans m05_probe_fondations_01, base synthetique neuve.
-- Jamais sur Alpha, Production, ni sur une base existante.
-- L'ordre des 21 migrations historiques reste inchange et distinct de ce fichier.
BEGIN;
DO $$
BEGIN
 IF current_database() <> 'm05_probe_fondations_01' THEN
   RAISE EXCEPTION 'Base interdite: %', current_database();
 END IF;
 IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')) THEN
   RAISE EXCEPTION 'La base de test doit etre vierge';
 END IF;
END $$;

CREATE TABLE organisations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 nom VARCHAR(150) NOT NULL, slug VARCHAR(150) NOT NULL UNIQUE, nom_court VARCHAR(50),
 email VARCHAR(255), telephone VARCHAR(30), adresse TEXT, ville VARCHAR(100),
 pays VARCHAR(100) NOT NULL, devise VARCHAR(10) NOT NULL, fuseau_horaire VARCHAR(100) NOT NULL,
 numero_identification VARCHAR(150), site_web TEXT, description TEXT, logo_url TEXT,
 actif BOOLEAN NOT NULL DEFAULT TRUE,
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), modifie_le TIMESTAMPTZ NOT NULL DEFAULT now(),
 supprime_le TIMESTAMPTZ
);
CREATE TABLE roles (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID REFERENCES organisations(id),
 nom VARCHAR(100) NOT NULL, description TEXT, actif BOOLEAN NOT NULL DEFAULT TRUE,
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), modifie_le TIMESTAMPTZ NOT NULL DEFAULT now(),
 supprime_le TIMESTAMPTZ,
 CONSTRAINT roles_globaux_seulement CHECK (organisation_id IS NULL),
 CONSTRAINT roles_nom_unique UNIQUE (nom)
);
CREATE UNIQUE INDEX roles_nom_normalise_unique ON roles(lower(btrim(nom)));
CREATE TABLE utilisateurs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 organisation_id UUID NOT NULL REFERENCES organisations(id), role_id UUID NOT NULL REFERENCES roles(id),
 nom VARCHAR(150) NOT NULL, prenom VARCHAR(100), sexe VARCHAR(20),
 telephone VARCHAR(30), telephone_verifie_le TIMESTAMPTZ,
 email VARCHAR(255), email_verifie_le TIMESTAMPTZ, mot_de_passe TEXT NOT NULL,
 photo_url TEXT, langue VARCHAR(10) NOT NULL DEFAULT 'fr', actif BOOLEAN NOT NULL DEFAULT TRUE,
 derniere_connexion TIMESTAMPTZ, derniere_activite_le TIMESTAMPTZ, dernier_acces TIMESTAMPTZ,
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), modifie_le TIMESTAMPTZ NOT NULL DEFAULT now(),
 supprime_le TIMESTAMPTZ,
 CONSTRAINT utilisateurs_langue_valide CHECK (langue IN ('fr','en'))
);
CREATE UNIQUE INDEX utilisateurs_email_global_unique ON utilisateurs(lower(btrim(email))) WHERE email IS NOT NULL;
CREATE INDEX utilisateurs_role_idx ON utilisateurs(role_id);
CREATE INDEX utilisateurs_org_idx ON utilisateurs(organisation_id);
CREATE INDEX utilisateurs_phone_idx ON utilisateurs(telephone);

CREATE TABLE clients (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES organisations(id),
 nom VARCHAR(180) NOT NULL, type_client VARCHAR(30) NOT NULL,
 secteur_activite TEXT, contact_email VARCHAR(255), contact_telephone VARCHAR(30), adresse_siege TEXT,
 actif BOOLEAN NOT NULL DEFAULT TRUE,
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), modifie_le TIMESTAMPTZ NOT NULL DEFAULT now(),
 supprime_le TIMESTAMPTZ
);
CREATE TABLE sites_de_collecte (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES organisations(id),
 nom VARCHAR(180) NOT NULL, adresse TEXT, zone_geographique TEXT, responsable_nom VARCHAR(150),
 actif BOOLEAN NOT NULL DEFAULT TRUE,
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), modifie_le TIMESTAMPTZ NOT NULL DEFAULT now(),
 supprime_le TIMESTAMPTZ
);
CREATE TABLE types_dechets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom VARCHAR(150) NOT NULL UNIQUE,
 description TEXT, unite VARCHAR(20) NOT NULL DEFAULT 'kg', actif BOOLEAN NOT NULL DEFAULT TRUE,
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE facteurs_carbone (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type_dechet_id UUID NOT NULL REFERENCES types_dechets(id),
 facteur NUMERIC(18,6), unite VARCHAR(30), source TEXT, version_source TEXT, zone_geographique TEXT,
 statut VARCHAR(30) NOT NULL DEFAULT 'provisoire', date_debut_validite DATE NOT NULL,
 date_fin_validite DATE, cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE agents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), utilisateur_id UUID NOT NULL UNIQUE REFERENCES utilisateurs(id),
 telephone VARCHAR(30), photo_url TEXT, statut VARCHAR(30) NOT NULL DEFAULT 'actif',
 disponible BOOLEAN NOT NULL DEFAULT TRUE, date_embauche DATE,
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE tricycles (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES organisations(id),
 numero_interne VARCHAR(100) NOT NULL, plaque_identification VARCHAR(100), marque TEXT, modele TEXT,
 capacite_kg NUMERIC(12,3), statut VARCHAR(30) NOT NULL DEFAULT 'disponible',
 etat VARCHAR(30) NOT NULL DEFAULT 'bon', date_mise_en_service DATE, observations TEXT,
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), modifie_le TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (organisation_id,numero_interne)
);
CREATE TABLE collectes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), site_id UUID NOT NULL REFERENCES sites_de_collecte(id),
 client_id UUID NOT NULL REFERENCES clients(id), agent_id UUID REFERENCES utilisateurs(id),
 type_dechet_id UUID NOT NULL REFERENCES types_dechets(id),
 poids_estime NUMERIC(12,3), statut VARCHAR(35) NOT NULL DEFAULT 'en_attente',
 date_collecte TIMESTAMPTZ NOT NULL DEFAULT now(),
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE missions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES organisations(id),
 agent_id UUID NOT NULL REFERENCES agents(id), tricycle_id UUID NOT NULL REFERENCES tricycles(id),
 date_prevue DATE NOT NULL, heure_depart_prevue TIME, heure_retour_prevue TIME,
 statut VARCHAR(30) NOT NULL DEFAULT 'planifiee', observations TEXT, cree_par UUID REFERENCES utilisateurs(id),
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now(), modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE missions_collectes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), mission_id UUID NOT NULL REFERENCES missions(id),
 collecte_id UUID NOT NULL REFERENCES collectes(id), ordre_collecte INTEGER NOT NULL,
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(mission_id, collecte_id), UNIQUE(mission_id, ordre_collecte)
);
CREATE TABLE mission_evenements (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), mission_id UUID NOT NULL REFERENCES missions(id),
 collecte_id UUID REFERENCES collectes(id), type_evenement VARCHAR(70) NOT NULL,
 latitude NUMERIC(9,6), longitude NUMERIC(9,6), precision_gps NUMERIC(10,2),
 observations TEXT, cree_par UUID REFERENCES utilisateurs(id),
 cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE lots (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), collecte_id UUID NOT NULL REFERENCES collectes(id),
 poids_reel NUMERIC(12,3) NOT NULL, type_dechet_id UUID NOT NULL REFERENCES types_dechets(id),
 statut_lot VARCHAR(30) NOT NULL DEFAULT 'en_stock'
);
CREATE TABLE stocks (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES organisations(id),
 type_dechet_id UUID NOT NULL REFERENCES types_dechets(id), quantite NUMERIC(12,3) NOT NULL DEFAULT 0,
 unite VARCHAR(20) NOT NULL DEFAULT 'kg', date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (organisation_id,type_dechet_id)
);
CREATE TABLE ventes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES organisations(id),
 stock_id UUID NOT NULL REFERENCES stocks(id), quantite NUMERIC(12,3) NOT NULL,
 prix_unitaire NUMERIC(12,2) NOT NULL, montant_total NUMERIC(12,2) NOT NULL,
 acheteur_nom TEXT, reference_vente VARCHAR(120), statut VARCHAR(30) NOT NULL DEFAULT 'confirmee',
 cree_par UUID REFERENCES utilisateurs(id), date_vente TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE mouvements_stock (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), stock_id UUID NOT NULL REFERENCES stocks(id),
 lot_id UUID REFERENCES lots(id), vente_id UUID REFERENCES ventes(id), type_mouvement VARCHAR(20) NOT NULL,
 quantite NUMERIC(12,3) NOT NULL, date_mouvement TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE impacts_carbone (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), vente_id UUID NOT NULL REFERENCES ventes(id),
 facteur_carbone_id UUID NOT NULL REFERENCES facteurs_carbone(id), quantite_kg NUMERIC(12,3) NOT NULL,
 facteur_utilise NUMERIC(18,6) NOT NULL, co2e_estime_kg NUMERIC(24,6) NOT NULL,
 date_calcul TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(vente_id)
);
CREATE TABLE notifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES organisations(id),
 utilisateur_id UUID REFERENCES utilisateurs(id), type VARCHAR(60), categorie VARCHAR(60), titre TEXT,
 message TEXT, ressource VARCHAR(100), ressource_id UUID, lien TEXT, contexte JSONB,
 expire_le TIMESTAMPTZ, cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE notifications_utilisateurs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), notification_id UUID NOT NULL REFERENCES notifications(id),
 utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id), lue BOOLEAN DEFAULT FALSE,
 lue_le TIMESTAMPTZ, supprimee BOOLEAN DEFAULT FALSE, supprimee_le TIMESTAMPTZ,
 UNIQUE(notification_id,utilisateur_id)
);
CREATE TABLE journaux_audit (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID REFERENCES organisations(id),
 utilisateur_id UUID REFERENCES utilisateurs(id), action TEXT NOT NULL, ressource TEXT NOT NULL,
 ressource_id UUID, methode_http VARCHAR(10), route TEXT, adresse_ip TEXT, navigateur TEXT,
 ancien_etat JSONB, nouvel_etat JSONB, contexte JSONB, succes BOOLEAN NOT NULL DEFAULT TRUE,
 message_erreur TEXT, cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMIT;
