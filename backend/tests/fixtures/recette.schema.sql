-- Fixture synthetique EXPLICITE : fondation reconstruite pour les tests,
-- jamais un remplacement du schema initial manquant ni une migration de recette.
ALTER TABLE utilisateurs ADD COLUMN email text;
ALTER TABLE lots ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE stocks ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE types_dechets ADD COLUMN organisation_id uuid REFERENCES organisations(id);
CREATE TABLE clients(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organisation_id uuid NOT NULL REFERENCES organisations(id),nom text,statut text DEFAULT 'actif');
CREATE TABLE client_utilisateurs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organisation_id uuid REFERENCES organisations(id),client_id uuid REFERENCES clients(id),utilisateur_id uuid REFERENCES utilisateurs(id),actif boolean DEFAULT true);
CREATE TABLE sites_de_collecte(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organisation_id uuid NOT NULL REFERENCES organisations(id),client_id uuid REFERENCES clients(id),nom text,adresse text,zone_geographique text,statut text DEFAULT 'actif',cree_le timestamptz DEFAULT now(),modifie_le timestamptz DEFAULT now());
CREATE TABLE agents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organisation_id uuid REFERENCES organisations(id),utilisateur_id uuid REFERENCES utilisateurs(id),statut text DEFAULT 'actif',disponible boolean DEFAULT true,telephone text,modifie_le timestamptz DEFAULT now());
CREATE TABLE tricycles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organisation_id uuid REFERENCES organisations(id),numero_interne text,statut text DEFAULT 'disponible',etat text DEFAULT 'bon',capacite_kg numeric DEFAULT 1000,modifie_le timestamptz DEFAULT now());
CREATE TABLE missions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organisation_id uuid NOT NULL REFERENCES organisations(id),agent_id uuid REFERENCES agents(id),tricycle_id uuid REFERENCES tricycles(id),date_prevue date,heure_depart_prevue time,heure_retour_prevue time,heure_depart_reelle timestamptz,heure_retour_reelle timestamptz,statut text,observations text,cree_par uuid REFERENCES utilisateurs(id),cree_le timestamptz DEFAULT now(),modifie_le timestamptz DEFAULT now());
CREATE TABLE collectes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid REFERENCES clients(id),site_id uuid REFERENCES sites_de_collecte(id),type_dechet_id uuid REFERENCES types_dechets(id),poids_estime numeric(12,3),statut text DEFAULT 'planifiee',date_prevue date,observations text,cree_par uuid REFERENCES utilisateurs(id),cree_le timestamptz DEFAULT now(),modifie_le timestamptz DEFAULT now());
CREATE TABLE missions_collectes(mission_id uuid REFERENCES missions(id),collecte_id uuid REFERENCES collectes(id),ordre_collecte int DEFAULT 1,PRIMARY KEY(mission_id,collecte_id));
CREATE TABLE mission_evenements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),mission_id uuid REFERENCES missions(id),collecte_id uuid REFERENCES collectes(id),type_evenement text,utilisateur_id uuid REFERENCES utilisateurs(id),latitude numeric(9,6),longitude numeric(9,6),precision_gps numeric(10,2),observations text,cree_le timestamptz DEFAULT now());
ALTER TABLE lots ADD COLUMN collecte_id uuid REFERENCES collectes(id),ADD COLUMN cree_par uuid REFERENCES utilisateurs(id),ADD COLUMN createur_id uuid REFERENCES utilisateurs(id);
ALTER TABLE sites_de_collecte ADD COLUMN responsable_nom text;
ALTER TABLE collectes ADD COLUMN agent_id uuid REFERENCES utilisateurs(id),ADD COLUMN date_collecte timestamptz DEFAULT now();
ALTER TABLE missions_collectes ADD COLUMN cree_le timestamptz DEFAULT now();
ALTER TABLE mission_evenements ADD COLUMN cree_par uuid REFERENCES utilisateurs(id);
CREATE TABLE client_sites(organisation_id uuid REFERENCES organisations(id),client_id uuid REFERENCES clients(id),site_id uuid REFERENCES sites_de_collecte(id),actif boolean DEFAULT true,PRIMARY KEY(client_id,site_id));
-- Adaptation explicite au contrat runtime du portail. photo_url ne figure pas
-- dans le schema utilisateurs fourni (photo_profil) : incompatibilite auditee.
CREATE TABLE roles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),nom text NOT NULL,actif boolean DEFAULT true);
ALTER TABLE utilisateurs ADD COLUMN role_id uuid REFERENCES roles(id),ADD COLUMN telephone text,ADD COLUMN photo_url text;
ALTER TABLE clients ADD COLUMN type_client text DEFAULT 'entreprise',ADD COLUMN secteur_activite text,ADD COLUMN contact_email text,ADD COLUMN contact_telephone text,ADD COLUMN adresse_siege text;
