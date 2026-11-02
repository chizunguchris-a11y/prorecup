\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

DO $g$
DECLARE t text; occupe boolean;
BEGIN
 IF current_database() <> 'm05_probe_fondations_02'
    OR current_user <> 'm05_lab_admin'
    OR inet_server_addr() IS DISTINCT FROM inet '127.0.0.1'
    OR inet_server_port() <> 15486
    OR replace(current_setting('data_directory'),chr(92),'/')
       <> 'F:/Outils/prorecup-m05-pg-lab/data'
 THEN RAISE EXCEPTION 'Laboratoire non autorise'; END IF;

 IF (SELECT count(*) FROM pg_constraint
     WHERE conname LIKE 'm05_l3_%_org_fk' AND convalidated) <> 30
 OR (SELECT count(*) FROM pg_constraint
     WHERE conname LIKE 'm05_l3_%_finite' AND convalidated) <> 20
 THEN RAISE EXCEPTION 'Lot 03 absent ou incomplet'; END IF;

 IF (SELECT count(*) FROM public.roles) <> 1
 OR NOT EXISTS(
    SELECT 1 FROM public.roles
    WHERE lower(btrim(nom))='client'
      AND organisation_id IS NULL AND actif
 ) THEN RAISE EXCEPTION 'Roles historiques inattendus'; END IF;

 FOR t IN
  SELECT tablename FROM pg_tables
  WHERE schemaname='public' AND tablename <> 'roles'
 LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I)',t)
    INTO occupe;
  IF occupe THEN
    RAISE EXCEPTION 'Table non vide : %',t;
  END IF;
 END LOOP;

 RAISE NOTICE 'OK : laboratoire confirme, tables metier vides';
END;
$g$;

CREATE FUNCTION public.m05_l4_derive_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $f$
DECLARE attendu uuid;
BEGIN
 CASE TG_TABLE_NAME
 WHEN 'agents' THEN
  SELECT organisation_id INTO attendu
  FROM public.utilisateurs WHERE id=NEW.utilisateur_id
  FOR KEY SHARE;
 WHEN 'missions_collectes' THEN
  SELECT organisation_id INTO attendu
  FROM public.missions WHERE id=NEW.mission_id
  FOR KEY SHARE;
 WHEN 'mission_evenements' THEN
  SELECT organisation_id INTO attendu
  FROM public.missions WHERE id=NEW.mission_id
  FOR KEY SHARE;
 WHEN 'mouvements_stock' THEN
  SELECT organisation_id INTO attendu
  FROM public.stocks WHERE id=NEW.stock_id
  FOR KEY SHARE;
 WHEN 'lot_contenants' THEN
  SELECT organisation_id INTO attendu
  FROM public.lots WHERE id=NEW.lot_id
  FOR KEY SHARE;
 WHEN 'pesees_unites' THEN
  SELECT organisation_id INTO attendu
  FROM public.pesees WHERE id=NEW.pesee_id
  FOR KEY SHARE;
 WHEN 'notifications_utilisateurs' THEN
  SELECT organisation_id INTO attendu
  FROM public.notifications WHERE id=NEW.notification_id
  FOR KEY SHARE;
 ELSE
  RAISE EXCEPTION 'Table non autorisee';
 END CASE;

 IF attendu IS NULL THEN
  RAISE EXCEPTION 'Parent introuvable'
    USING ERRCODE='23503';
 END IF;

 IF NEW.organisation_id IS NOT NULL
    AND NEW.organisation_id IS DISTINCT FROM attendu THEN
  RAISE EXCEPTION 'Organisation incoherente'
    USING ERRCODE='23514';
 END IF;

 NEW.organisation_id := attendu;
 RETURN NEW;
END;
$f$;

DO $creation$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY[
  'agents','missions_collectes','mission_evenements',
  'mouvements_stock','lot_contenants','pesees_unites',
  'notifications_utilisateurs'
 ] LOOP
  EXECUTE format(
   'ALTER TABLE public.%I ADD COLUMN organisation_id uuid NOT NULL',t
  );
  EXECUTE format(
   'CREATE TRIGGER m05_l4_derive_org_before
    BEFORE INSERT OR UPDATE ON public.%I
    FOR EACH ROW EXECUTE FUNCTION public.m05_l4_derive_org()',t
  );
 END LOOP;
END;
$creation$;

ALTER TABLE public.agents
 ADD CONSTRAINT m05_l4_agents_id_org_uq
 UNIQUE(id,organisation_id);

ALTER TABLE public.notifications
 ADD CONSTRAINT m05_l4_notifications_id_org_uq
 UNIQUE(id,organisation_id);

DO $fk$
DECLARE x record; n integer;
BEGIN
 FOR x IN
  SELECT * FROM (VALUES
   ('agents','agents_user','utilisateur_id,organisation_id',
    'utilisateurs','id,organisation_id'),
   ('missions','missions_agent','agent_id,organisation_id',
    'agents','id,organisation_id'),
   ('pesees','pesees_agent','agent_id,organisation_id',
    'agents','id,organisation_id'),
   ('missions_collectes','mc_mission','mission_id,organisation_id',
    'missions','id,organisation_id'),
   ('missions_collectes','mc_collecte','collecte_id,organisation_id',
    'collectes','id,organisation_id'),
   ('mission_evenements','me_mission','mission_id,organisation_id',
    'missions','id,organisation_id'),
   ('mission_evenements','me_collecte','collecte_id,organisation_id',
    'collectes','id,organisation_id'),
   ('mission_evenements','me_auteur','cree_par,organisation_id',
    'utilisateurs','id,organisation_id'),
   ('mouvements_stock','ms_stock','stock_id,organisation_id',
    'stocks','id,organisation_id'),
   ('mouvements_stock','ms_lot','organisation_id,lot_id',
    'lots','organisation_id,id'),
   ('mouvements_stock','ms_vente','organisation_id,vente_id',
    'ventes','organisation_id,id'),
   ('lot_contenants','lc_lot','organisation_id,lot_id',
    'lots','organisation_id,id'),
   ('lot_contenants','lc_contenant','contenant_id,organisation_id',
    'contenants','id,organisation_id'),
   ('pesees_unites','pu_pesee','pesee_id,organisation_id',
    'pesees','id,organisation_id'),
   ('pesees_unites','pu_contenant','contenant_id,organisation_id',
    'contenants','id,organisation_id'),
   ('pesees_unites','pu_lot','organisation_id,lot_id',
    'lots','organisation_id,id'),
   ('notifications_utilisateurs','nu_notification',
    'notification_id,organisation_id',
    'notifications','id,organisation_id'),
   ('notifications_utilisateurs','nu_utilisateur',
    'utilisateur_id,organisation_id',
    'utilisateurs','id,organisation_id')
  ) AS v(tab,nom,colonnes,parent,colonnes_parent)
 LOOP
  EXECUTE format(
   'ALTER TABLE public.%I ADD CONSTRAINT %I
    FOREIGN KEY (%s) REFERENCES public.%I (%s)',
   x.tab,'m05_l4_'||x.nom||'_fk',
   x.colonnes,x.parent,x.colonnes_parent
  );
 END LOOP;

 SELECT count(*) INTO n FROM pg_constraint
 WHERE conname LIKE 'm05_l4_%_fk'
 AND contype='f' AND convalidated;

 IF n <> 18 THEN
  RAISE EXCEPTION '18 FK attendues, trouve %',n;
 END IF;

 RAISE NOTICE 'OK : 7 tables derivees, 18 FK validees';
END;
$fk$;

SAVEPOINT m05_l4_tests;

DO $tests$
DECLARE
 oa uuid; ob uuid; ua uuid; ub uuid;
 ra uuid; aa uuid; ab uuid; ta uuid; ma uuid;
 ca uuid; cb uuid; sa uuid; sb uuid;
 cla uuid; clb uuid; mat uuid; na uuid;
 ref text := gen_random_uuid()::text;
BEGIN
 SELECT id INTO ra FROM public.roles
 WHERE lower(btrim(nom))='client';

 INSERT INTO public.organisations
  (nom,slug,pays,devise,fuseau_horaire)
 VALUES
  ('L4 A','l4-a-'||ref,'RDC','CDF','Africa/Kinshasa')
 RETURNING id INTO oa;

 INSERT INTO public.organisations
  (nom,slug,pays,devise,fuseau_horaire)
 VALUES
  ('L4 B','l4-b-'||ref,'RDC','CDF','Africa/Kinshasa')
 RETURNING id INTO ob;

 INSERT INTO public.utilisateurs
  (organisation_id,role_id,nom,mot_de_passe)
 VALUES(oa,ra,'Essai A','test-only')
 RETURNING id INTO ua;

 INSERT INTO public.utilisateurs
  (organisation_id,role_id,nom,mot_de_passe)
 VALUES(ob,ra,'Essai B','test-only')
 RETURNING id INTO ub;

 INSERT INTO public.agents(utilisateur_id)
 VALUES(ua) RETURNING id INTO aa;

 INSERT INTO public.agents(utilisateur_id)
 VALUES(ub) RETURNING id INTO ab;

 INSERT INTO public.tricycles(organisation_id,numero_interne)
 VALUES(oa,'L4-'||ref) RETURNING id INTO ta;

 INSERT INTO public.missions
  (organisation_id,agent_id,tricycle_id,date_prevue)
 VALUES(oa,aa,ta,CURRENT_DATE)
 RETURNING id INTO ma;

 INSERT INTO public.types_dechets(nom)
 VALUES('L4-'||ref) RETURNING id INTO mat;

 INSERT INTO public.sites_de_collecte(organisation_id,nom)
 VALUES(oa,'Site A') RETURNING id INTO sa;

 INSERT INTO public.sites_de_collecte(organisation_id,nom)
 VALUES(ob,'Site B') RETURNING id INTO sb;

 INSERT INTO public.clients(organisation_id,nom,type_client)
 VALUES(oa,'Client A','entreprise') RETURNING id INTO ca;

 INSERT INTO public.clients(organisation_id,nom,type_client)
 VALUES(ob,'Client B','entreprise') RETURNING id INTO cb;

 INSERT INTO public.collectes(site_id,client_id,type_dechet_id)
 VALUES(sa,ca,mat) RETURNING id INTO cla;

 INSERT INTO public.collectes(site_id,client_id,type_dechet_id)
 VALUES(sb,cb,mat) RETURNING id INTO clb;

 INSERT INTO public.missions_collectes
  (mission_id,collecte_id,ordre_collecte)
 VALUES(ma,cla,1);

 RAISE NOTICE 'OK : association mission/collecte legitime';

 BEGIN
  INSERT INTO public.missions_collectes
   (mission_id,collecte_id,ordre_collecte)
  VALUES(ma,clb,2);
  RAISE EXCEPTION 'ECHEC : association etrangere acceptee';
 EXCEPTION WHEN foreign_key_violation THEN
  RAISE NOTICE 'OK : collecte etrangere refusee';
 END;

 BEGIN
  INSERT INTO public.missions
   (organisation_id,agent_id,tricycle_id,date_prevue)
  VALUES(oa,ab,ta,CURRENT_DATE);
  RAISE EXCEPTION 'ECHEC : agent etranger accepte';
 EXCEPTION WHEN foreign_key_violation THEN
  RAISE NOTICE 'OK : agent etranger refuse';
 END;

 INSERT INTO public.notifications(organisation_id,titre)
 VALUES(oa,'Test') RETURNING id INTO na;

 INSERT INTO public.notifications_utilisateurs
  (notification_id,utilisateur_id)
 VALUES(na,ua);

 RAISE NOTICE 'OK : notification legitime';

 BEGIN
  INSERT INTO public.notifications_utilisateurs
   (notification_id,utilisateur_id)
  VALUES(na,ub);
  RAISE EXCEPTION 'ECHEC : notification etrangere acceptee';
 EXCEPTION WHEN foreign_key_violation THEN
  RAISE NOTICE 'OK : notification etrangere refusee';
 END;

 INSERT INTO public.mission_evenements
  (mission_id,collecte_id,type_evenement,cree_par)
 VALUES(ma,cla,'test_l4',ua);

 RAISE NOTICE 'OK : evenement legitime';

 BEGIN
  INSERT INTO public.mission_evenements
   (mission_id,collecte_id,type_evenement,cree_par)
  VALUES(ma,clb,'test_l4',ua);
  RAISE EXCEPTION 'ECHEC : evenement etranger accepte';
 EXCEPTION WHEN foreign_key_violation THEN
  RAISE NOTICE 'OK : evenement etranger refuse';
 END;
END;
$tests$;

ROLLBACK TO SAVEPOINT m05_l4_tests;
RELEASE SAVEPOINT m05_l4_tests;

COMMIT;

SELECT '=== CONTROLE FINAL ===';
SELECT
 (SELECT count(*) FROM pg_constraint
  WHERE conname LIKE 'm05_l4_%_fk'
    AND contype='f' AND convalidated) AS fk,
 (SELECT count(*) FROM pg_trigger
  WHERE tgname='m05_l4_derive_org_before'
    AND NOT tgisinternal) AS triggers,
 (SELECT count(*) FROM pg_constraint
  WHERE connamespace='public'::regnamespace
    AND NOT convalidated) AS non_validees;