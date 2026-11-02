-- PRO RECUP | MISSION 05 | LOT 03 V2 / DURCISSEMENT EXPERIMENTAL
-- SAUF TEST SUR UNE INSTANCE LOCALE ISOLEE. JAMAIS SUR RENDER/ALPHA/PROD.
-- Prerequis : base m05_probe_fondations_02, 21 migrations, lot 02 deja installe.
-- Le script est transactionnel, arrete sur la premiere erreur et annule les fixtures.
-- Revision V2 : role client global cree par migration 11 conserve et verifie.
-- NON EXECUTE PAR L'AUTEUR SUR LE POSTGRESQL WINDOWS DE L'UTILISATEUR.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '90s';

DO $guard$
DECLARE t record; nonvide boolean; n integer;
BEGIN
  IF current_database() <> 'm05_probe_fondations_02'
     OR current_user <> 'm05_lab_admin'
     OR inet_server_addr() IS DISTINCT FROM inet '127.0.0.1'
     OR inet_server_port() <> 15486
     OR replace(current_setting('data_directory'), chr(92), '/')
        <> 'F:/Outils/prorecup-m05-pg-lab/data'
  THEN RAISE EXCEPTION 'M05 LOT03 : instance non autorisee'; END IF;

  SELECT COUNT(*) INTO n
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace ns ON ns.oid=c.relnamespace
  WHERE ns.nspname='public' AND c.relkind IN ('r','p');
  IF n <> 35 THEN RAISE EXCEPTION 'M05 LOT03 : % tables au lieu de 35',n; END IF;

  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_constraint
                WHERE conname='m05_collecte_client_org_fk' AND convalidated)
     OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_constraint
                WHERE conname='m05_collecte_site_org_fk' AND convalidated)
     OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_constraint
                WHERE conname='m05_stock_quantite_finie_nonnegative' AND convalidated)
  THEN RAISE EXCEPTION 'M05 LOT03 : lot 02 non certifie'; END IF;

  -- La migration historique 11 cree volontairement UN role global "client".
  -- C'est une donnee systeme, pas une fixture a supprimer.
  IF (SELECT count(*) FROM public.roles) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.roles
       WHERE lower(btrim(nom)) = 'client'
         AND organisation_id IS NULL
         AND actif IS TRUE
     ) THEN
    RAISE EXCEPTION 'M05 LOT03 : seuls le role systeme client actif est autorise';
  END IF;

  -- Les autres tables doivent etre vides (aucune destruction, meme de test).
  FOR t IN SELECT table_schema,table_name FROM information_schema.tables
           WHERE table_schema='public' AND table_type='BASE TABLE'
             AND table_name <> 'roles'
  LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I LIMIT 1)',
                   t.table_schema,t.table_name) INTO nonvide;
    IF nonvide THEN RAISE EXCEPTION 'M05 LOT03 : table non vide %.%',
                                 t.table_schema,t.table_name; END IF;
  END LOOP;
  RAISE NOTICE 'OK GARDES : 35 tables, seul role client historique present';
END;
$guard$;

-- Les identifiants UUID sont deja uniques, les doubles cles restent necessaires
-- pour que PostgreSQL puisse comparer l'organisation des deux cotes.
ALTER TABLE public.stocks ADD CONSTRAINT m05_l3_stocks_id_org_uq UNIQUE(id, organisation_id);
ALTER TABLE public.tricycles ADD CONSTRAINT m05_l3_tricycles_id_org_uq UNIQUE(id, organisation_id);
ALTER TABLE public.missions ADD CONSTRAINT m05_l3_missions_id_org_uq UNIQUE(id, organisation_id);
ALTER TABLE public.collectes ADD CONSTRAINT m05_l3_collectes_id_org_uq UNIQUE(id, organisation_id);
ALTER TABLE public.balances ADD CONSTRAINT m05_l3_balances_id_org_uq UNIQUE(id, organisation_id);
ALTER TABLE public.preuves_collecte ADD CONSTRAINT m05_l3_preuves_collecte_id_org_uq UNIQUE(id, organisation_id);
ALTER TABLE public.contenants ADD CONSTRAINT m05_l3_contenants_id_org_uq UNIQUE(id, organisation_id);
ALTER TABLE public.pesees ADD CONSTRAINT m05_l3_pesees_id_org_uq UNIQUE(id, organisation_id);

-- Cloisonnement des references inter-organisations. Les FK simples historiques restent.
ALTER TABLE public.balances
  ADD CONSTRAINT m05_l3_balances_site_org_fk
  FOREIGN KEY (site_id, organisation_id) REFERENCES public.sites_de_collecte(id, organisation_id);
ALTER TABLE public.balances
  ADD CONSTRAINT m05_l3_balances_tricycle_org_fk
  FOREIGN KEY (tricycle_id, organisation_id) REFERENCES public.tricycles(id, organisation_id);
ALTER TABLE public.missions
  ADD CONSTRAINT m05_l3_missions_tricycle_org_fk
  FOREIGN KEY (tricycle_id, organisation_id) REFERENCES public.tricycles(id, organisation_id);
ALTER TABLE public.collectes
  ADD CONSTRAINT m05_l3_collectes_agent_org_fk
  FOREIGN KEY (agent_id, organisation_id) REFERENCES public.utilisateurs(id, organisation_id);
ALTER TABLE public.collectes
  ADD CONSTRAINT m05_l3_collectes_peseur_org_fk
  FOREIGN KEY (poids_reel_saisi_par, organisation_id) REFERENCES public.utilisateurs(id, organisation_id);
ALTER TABLE public.lots
  ADD CONSTRAINT m05_l3_lots_collecte_org_fk
  FOREIGN KEY (collecte_id, organisation_id) REFERENCES public.collectes(id, organisation_id);
ALTER TABLE public.lots
  ADD CONSTRAINT m05_l3_lots_site_org_fk
  FOREIGN KEY (site_courant_id, organisation_id) REFERENCES public.sites_de_collecte(id, organisation_id);
ALTER TABLE public.lots
  ADD CONSTRAINT m05_l3_lots_client_org_fk
  FOREIGN KEY (client_courant_id, organisation_id) REFERENCES public.clients(id, organisation_id);
ALTER TABLE public.contenants
  ADD CONSTRAINT m05_l3_contenants_collecte_org_fk
  FOREIGN KEY (collecte_origine_id, organisation_id) REFERENCES public.collectes(id, organisation_id);
ALTER TABLE public.contenants
  ADD CONSTRAINT m05_l3_contenants_site_org_fk
  FOREIGN KEY (site_courant_id, organisation_id) REFERENCES public.sites_de_collecte(id, organisation_id);
ALTER TABLE public.contenants
  ADD CONSTRAINT m05_l3_contenants_client_org_fk
  FOREIGN KEY (client_courant_id, organisation_id) REFERENCES public.clients(id, organisation_id);
ALTER TABLE public.preuves_collecte
  ADD CONSTRAINT m05_l3_preuves_collecte_mission_org_fk
  FOREIGN KEY (mission_id, organisation_id) REFERENCES public.missions(id, organisation_id);
ALTER TABLE public.preuves_collecte
  ADD CONSTRAINT m05_l3_preuves_collecte_collecte_org_fk
  FOREIGN KEY (collecte_id, organisation_id) REFERENCES public.collectes(id, organisation_id);
ALTER TABLE public.preuves_collecte
  ADD CONSTRAINT m05_l3_preuves_collecte_auteur_org_fk
  FOREIGN KEY (cree_par, organisation_id) REFERENCES public.utilisateurs(id, organisation_id);
ALTER TABLE public.pesees
  ADD CONSTRAINT m05_l3_pesees_mission_org_fk
  FOREIGN KEY (mission_id, organisation_id) REFERENCES public.missions(id, organisation_id);
ALTER TABLE public.pesees
  ADD CONSTRAINT m05_l3_pesees_collecte_org_fk
  FOREIGN KEY (collecte_id, organisation_id) REFERENCES public.collectes(id, organisation_id);
ALTER TABLE public.pesees
  ADD CONSTRAINT m05_l3_pesees_balance_org_fk
  FOREIGN KEY (balance_id, organisation_id) REFERENCES public.balances(id, organisation_id);
ALTER TABLE public.pesees
  ADD CONSTRAINT m05_l3_pesees_user_org_fk
  FOREIGN KEY (utilisateur_id, organisation_id) REFERENCES public.utilisateurs(id, organisation_id);
ALTER TABLE public.pesees
  ADD CONSTRAINT m05_l3_pesees_preuve_org_fk
  FOREIGN KEY (preuve_id, organisation_id) REFERENCES public.preuves_collecte(id, organisation_id);
ALTER TABLE public.ventes
  ADD CONSTRAINT m05_l3_ventes_stock_org_fk
  FOREIGN KEY (stock_id, organisation_id) REFERENCES public.stocks(id, organisation_id);
ALTER TABLE public.ventes
  ADD CONSTRAINT m05_l3_ventes_auteur_org_fk
  FOREIGN KEY (cree_par, organisation_id) REFERENCES public.utilisateurs(id, organisation_id);
ALTER TABLE public.notifications
  ADD CONSTRAINT m05_l3_notifications_user_org_fk
  FOREIGN KEY (utilisateur_id, organisation_id) REFERENCES public.utilisateurs(id, organisation_id);
ALTER TABLE public.tracabilite_matiere_evenements
  ADD CONSTRAINT m05_l3_tracabilite_matiere_evenements_contenant_org_fk
  FOREIGN KEY (contenant_id, organisation_id) REFERENCES public.contenants(id, organisation_id);
ALTER TABLE public.tracabilite_matiere_evenements
  ADD CONSTRAINT m05_l3_tracabilite_matiere_evenements_lot_org_fk
  FOREIGN KEY (organisation_id, lot_id) REFERENCES public.lots(organisation_id, id);
ALTER TABLE public.tracabilite_matiere_evenements
  ADD CONSTRAINT m05_l3_tracabilite_matiere_evenements_collecte_org_fk
  FOREIGN KEY (collecte_id, organisation_id) REFERENCES public.collectes(id, organisation_id);
ALTER TABLE public.tracabilite_matiere_evenements
  ADD CONSTRAINT m05_l3_tracabilite_matiere_evenements_mission_org_fk
  FOREIGN KEY (mission_id, organisation_id) REFERENCES public.missions(id, organisation_id);
ALTER TABLE public.tracabilite_matiere_evenements
  ADD CONSTRAINT m05_l3_tracabilite_matiere_evenements_pesee_org_fk
  FOREIGN KEY (pesee_id, organisation_id) REFERENCES public.pesees(id, organisation_id);
ALTER TABLE public.tracabilite_matiere_evenements
  ADD CONSTRAINT m05_l3_tracabilite_matiere_evenements_site_org_fk
  FOREIGN KEY (site_id, organisation_id) REFERENCES public.sites_de_collecte(id, organisation_id);
ALTER TABLE public.tracabilite_matiere_evenements
  ADD CONSTRAINT m05_l3_tracabilite_matiere_evenements_client_org_fk
  FOREIGN KEY (client_id, organisation_id) REFERENCES public.clients(id, organisation_id);
ALTER TABLE public.tracabilite_matiere_evenements
  ADD CONSTRAINT m05_l3_tracabilite_matiere_evenements_auteur_org_fk
  FOREIGN KEY (utilisateur_id, organisation_id) REFERENCES public.utilisateurs(id, organisation_id);

-- Numeric PostgreSQL accepte NaN ; les bornes habituelles ne suffisent pas.
ALTER TABLE public.collectes
  ADD CONSTRAINT m05_l3_collectes_poids_estime_finite
  CHECK (poids_estime IS NULL OR (poids_estime >= 0 AND poids_estime IS DISTINCT FROM 'NaN'::numeric AND poids_estime IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.collectes
  ADD CONSTRAINT m05_l3_collectes_poids_reel_finite
  CHECK (poids_reel IS NULL OR (poids_reel >= 0 AND poids_reel IS DISTINCT FROM 'NaN'::numeric AND poids_reel IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.lots
  ADD CONSTRAINT m05_l3_lots_poids_reel_finite
  CHECK (poids_reel IS NULL OR (poids_reel >= 0 AND poids_reel IS DISTINCT FROM 'NaN'::numeric AND poids_reel IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.lots
  ADD CONSTRAINT m05_l3_lots_quantite_restante_kg_finite
  CHECK (quantite_restante_kg IS NULL OR (quantite_restante_kg >= 0 AND quantite_restante_kg IS DISTINCT FROM 'NaN'::numeric AND quantite_restante_kg IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.contenants
  ADD CONSTRAINT m05_l3_contenants_tare_kg_finite
  CHECK (tare_kg IS NULL OR (tare_kg >= 0 AND tare_kg IS DISTINCT FROM 'NaN'::numeric AND tare_kg IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.contenants
  ADD CONSTRAINT m05_l3_contenants_poids_courant_kg_finite
  CHECK (poids_courant_kg IS NULL OR (poids_courant_kg >= 0 AND poids_courant_kg IS DISTINCT FROM 'NaN'::numeric AND poids_courant_kg IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.tricycles
  ADD CONSTRAINT m05_l3_tricycles_capacite_kg_finite
  CHECK (capacite_kg IS NULL OR (capacite_kg >= 0 AND capacite_kg IS DISTINCT FROM 'NaN'::numeric AND capacite_kg IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.balances
  ADD CONSTRAINT m05_l3_balances_capacite_max_kg_finite
  CHECK (capacite_max_kg IS NULL OR (capacite_max_kg > 0 AND capacite_max_kg IS DISTINCT FROM 'NaN'::numeric AND capacite_max_kg IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.balances
  ADD CONSTRAINT m05_l3_balances_precision_kg_finite
  CHECK (precision_kg IS NULL OR (precision_kg > 0 AND precision_kg IS DISTINCT FROM 'NaN'::numeric AND precision_kg IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.pesees
  ADD CONSTRAINT m05_l3_pesees_poids_brut_finite
  CHECK (poids_brut IS NULL OR (poids_brut >= 0 AND poids_brut IS DISTINCT FROM 'NaN'::numeric AND poids_brut IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.pesees
  ADD CONSTRAINT m05_l3_pesees_tare_finite
  CHECK (tare IS NULL OR (tare >= 0 AND tare IS DISTINCT FROM 'NaN'::numeric AND tare IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.ventes
  ADD CONSTRAINT m05_l3_ventes_quantite_finite
  CHECK (quantite IS NULL OR (quantite > 0 AND quantite IS DISTINCT FROM 'NaN'::numeric AND quantite IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.ventes
  ADD CONSTRAINT m05_l3_ventes_prix_unitaire_finite
  CHECK (prix_unitaire IS NULL OR (prix_unitaire >= 0 AND prix_unitaire IS DISTINCT FROM 'NaN'::numeric AND prix_unitaire IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.ventes
  ADD CONSTRAINT m05_l3_ventes_montant_total_finite
  CHECK (montant_total IS NULL OR (montant_total >= 0 AND montant_total IS DISTINCT FROM 'NaN'::numeric AND montant_total IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.vente_lots
  ADD CONSTRAINT m05_l3_vente_lots_quantite_kg_finite
  CHECK (quantite_kg IS NULL OR (quantite_kg > 0 AND quantite_kg IS DISTINCT FROM 'NaN'::numeric AND quantite_kg IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.mouvements_stock
  ADD CONSTRAINT m05_l3_mouvements_stock_quantite_finite
  CHECK (quantite IS NULL OR (quantite > 0 AND quantite IS DISTINCT FROM 'NaN'::numeric AND quantite IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.facteurs_carbone
  ADD CONSTRAINT m05_l3_facteurs_carbone_facteur_finite
  CHECK (facteur IS NULL OR (facteur IS DISTINCT FROM 'NaN'::numeric AND facteur IS DISTINCT FROM 'Infinity'::numeric AND facteur IS DISTINCT FROM '-Infinity'::numeric));
ALTER TABLE public.impacts_carbone
  ADD CONSTRAINT m05_l3_impacts_carbone_quantite_kg_finite
  CHECK (quantite_kg IS NULL OR (quantite_kg >= 0 AND quantite_kg IS DISTINCT FROM 'NaN'::numeric AND quantite_kg IS DISTINCT FROM 'Infinity'::numeric));
ALTER TABLE public.impacts_carbone
  ADD CONSTRAINT m05_l3_impacts_carbone_facteur_utilise_finite
  CHECK (facteur_utilise IS NULL OR (facteur_utilise IS DISTINCT FROM 'NaN'::numeric AND facteur_utilise IS DISTINCT FROM 'Infinity'::numeric AND facteur_utilise IS DISTINCT FROM '-Infinity'::numeric));
ALTER TABLE public.impacts_carbone
  ADD CONSTRAINT m05_l3_impacts_carbone_co2e_estime_kg_finite
  CHECK (co2e_estime_kg IS NULL OR (co2e_estime_kg IS DISTINCT FROM 'NaN'::numeric AND co2e_estime_kg IS DISTINCT FROM 'Infinity'::numeric AND co2e_estime_kg IS DISTINCT FROM '-Infinity'::numeric));

-- Quatre anciennes contraintes NOT VALID : leur validation ne reecrit pas les migrations.
ALTER TABLE public.lots VALIDATE CONSTRAINT lots_quantite_restante_valide;
ALTER TABLE public.lots VALIDATE CONSTRAINT lots_quantite_statut_coherent;
ALTER TABLE public.lots VALIDATE CONSTRAINT lots_statut_vente_valide;
ALTER TABLE public.mouvements_stock VALIDATE CONSTRAINT mouvements_stock_references_valides;

DO $catalogue$
DECLARE nfks integer; nchecks integer; ninvalides integer;
BEGIN
 SELECT COUNT(*) INTO nfks FROM pg_catalog.pg_constraint
 WHERE conname LIKE 'm05_l3_%_org_fk' AND contype='f' AND convalidated;
 IF nfks <> 30 THEN RAISE EXCEPTION 'Attendu 30 FK organisation, trouve %',nfks; END IF;
 SELECT COUNT(*) INTO nchecks FROM pg_catalog.pg_constraint
 WHERE conname LIKE 'm05_l3_%_finite' AND contype='c' AND convalidated;
 IF nchecks <> 20 THEN RAISE EXCEPTION 'Attendu 20 controles numeriques, trouve %',nchecks; END IF;
 SELECT COUNT(*) INTO ninvalides FROM pg_catalog.pg_constraint c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.connamespace
 WHERE n.nspname='public' AND c.convalidated IS FALSE;
 IF ninvalides <> 0 THEN RAISE EXCEPTION '% contraintes restent NOT VALID',ninvalides; END IF;
 RAISE NOTICE 'OK CATALOGUE : % FK, % CHECK, zero contrainte non validee',nfks,nchecks;
END;
$catalogue$;

-- Scenarios synthetiques (annules pour conserver la base vierge).
SAVEPOINT m05_l3_fixture;
DO $tests$
DECLARE
 org_a uuid;org_b uuid;site_a uuid;client_a uuid;client_b uuid;
 collecte_a uuid; matiere uuid;stock_a uuid;stock_b uuid;lot_a uuid;
 lot_code text := 'PR-L-' || upper(replace(gen_random_uuid()::text,'-',''));
 ref text := gen_random_uuid()::text;
 n integer;
BEGIN
 INSERT INTO public.organisations(nom,slug,pays,devise,fuseau_horaire)
 VALUES('M05 L3 A','l3-a-'||ref,'RDC','CDF','Africa/Kinshasa') RETURNING id INTO org_a;
 INSERT INTO public.organisations(nom,slug,pays,devise,fuseau_horaire)
 VALUES('M05 L3 B','l3-b-'||ref,'RDC','CDF','Africa/Kinshasa') RETURNING id INTO org_b;
 INSERT INTO public.types_dechets(nom) VALUES('M05 L3-'||ref) RETURNING id INTO matiere;
 INSERT INTO public.sites_de_collecte(organisation_id,nom)
 VALUES(org_a,'site L3') RETURNING id INTO site_a;
 INSERT INTO public.clients(organisation_id,nom,type_client)
 VALUES(org_a,'client L3 A','entreprise') RETURNING id INTO client_a;
 INSERT INTO public.clients(organisation_id,nom,type_client)
 VALUES(org_b,'client L3 B','entreprise') RETURNING id INTO client_b;
 INSERT INTO public.collectes(site_id,client_id,type_dechet_id)
 VALUES(site_a,client_a,matiere) RETURNING id INTO collecte_a;
 IF NOT EXISTS(SELECT 1 FROM public.collectes
  WHERE id=collecte_a AND organisation_id=org_a) THEN
  RAISE EXCEPTION 'collecte valide non creee'; END IF;

 INSERT INTO public.stocks(organisation_id,type_dechet_id,quantite)
 VALUES(org_a,matiere,1.125) RETURNING id INTO stock_a;
 INSERT INTO public.stocks(organisation_id,type_dechet_id,quantite)
 VALUES(org_b,matiere,2.375) RETURNING id INTO stock_b;

 INSERT INTO public.ventes(organisation_id,stock_id,quantite,prix_unitaire,montant_total,devise)
 VALUES(org_a,stock_a,0.125,10,1.25,'USD');
 RAISE NOTICE 'OK : vente legitime fractionnaire 0.125 kg';

 BEGIN
  INSERT INTO public.ventes(organisation_id,stock_id,quantite,prix_unitaire,montant_total,devise)
  VALUES(org_a,stock_b,0.125,10,1.25,'USD');
  RAISE EXCEPTION 'ECHEC : vente cross-tenant acceptee';
 EXCEPTION WHEN foreign_key_violation THEN
  RAISE NOTICE 'OK : vente sur stock etranger refusee';
 END;

 BEGIN
  INSERT INTO public.lots(organisation_id,collecte_id,poids_reel,type_dechet_id,code_qr)
  VALUES(org_b,collecte_a,1.125,matiere,lot_code);
  RAISE EXCEPTION 'ECHEC : lot cross-tenant accepte';
 EXCEPTION WHEN foreign_key_violation THEN
  RAISE NOTICE 'OK : lot rattache a une collecte etrangere refuse';
 END;

 BEGIN
  INSERT INTO public.ventes(organisation_id,stock_id,quantite,prix_unitaire,montant_total,devise)
  VALUES(org_a,stock_a,'NaN'::numeric,10,1,'USD');
  RAISE EXCEPTION 'ECHEC : NaN vente accepte';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK : quantite NaN refusee pour vente';
 END;

 BEGIN
  INSERT INTO public.lots(organisation_id,poids_reel,type_dechet_id,code_qr)
  VALUES(org_a,'NaN'::numeric,matiere,lot_code);
  RAISE EXCEPTION 'ECHEC : NaN poids lot accepte';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK : poids NaN refuse pour lot';
 END;

 BEGIN
  UPDATE public.stocks SET quantite='NaN'::numeric WHERE id=stock_a;
  RAISE EXCEPTION 'ECHEC : NaN stock accepte';
 EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK : contrainte stock lot02 conservee';
 END;

 SELECT COUNT(*) INTO n FROM public.ventes WHERE organisation_id=org_a;
 IF n<>1 THEN RAISE EXCEPTION 'vente valide inattendue : %',n; END IF;
 RAISE NOTICE 'OK : ecritures rejetees sans ligne metier parasite';
END;
$tests$;
ROLLBACK TO SAVEPOINT m05_l3_fixture;
RELEASE SAVEPOINT m05_l3_fixture;
COMMIT;
-- FIN : durcissement partiel seulement. Restent jonctions sans tenant_id,
-- RLS, droits SQL runtime, autorisations E2E, workflow et vrais peripheriques.
