-- Pro Recup / Mission 05 - ETAPE EXPERIMENTALE INTEGRITE
-- A NE PAS APPLIQUER SUR ALPHA, PRODUCTION OU M05_CANONICAL.
-- Requiert la base isolee m05_probe_fondations_02, avec les 21 migrations.
-- Transaction atomique ; les donnees de verification sont annulees par SAVEPOINT.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = pg_catalog, public;

DO $guard$
BEGIN
  IF current_database() <> 'm05_probe_fondations_02'
     OR current_user <> 'm05_lab_admin'
     OR inet_server_addr() IS DISTINCT FROM inet '127.0.0.1'
     OR inet_server_port() <> 15486
     OR replace(current_setting('data_directory'), chr(92), '/')
           <> 'F:/Outils/prorecup-m05-pg-lab/data' THEN
    RAISE EXCEPTION 'M05 LAB : serveur/base/compte non autorise';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.collectes co
    JOIN public.sites_de_collecte s ON s.id = co.site_id
    JOIN public.clients cl ON cl.id = co.client_id
    WHERE s.organisation_id IS DISTINCT FROM cl.organisation_id
  ) THEN
    RAISE EXCEPTION 'M05 LAB : collectes preexistantes inter-organisations detectees';
  END IF;
END;
$guard$;

-- Reutilisation des deux cles uniques composites issues des migrations 11 et 12.
-- Les FK composites interdisent aussi les changements de proprietaire cote parents.
ALTER TABLE public.collectes ADD COLUMN organisation_id uuid;
UPDATE public.collectes co
  SET organisation_id = s.organisation_id
  FROM public.sites_de_collecte s
  WHERE s.id = co.site_id;
ALTER TABLE public.collectes ALTER COLUMN organisation_id SET NOT NULL;

CREATE FUNCTION public.m05_collecte_org_site()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $fn$
DECLARE site_org uuid;
BEGIN
  SELECT s.organisation_id INTO site_org
  FROM public.sites_de_collecte s
  WHERE s.id = NEW.site_id FOR SHARE;
  IF site_org IS NULL THEN
    RAISE EXCEPTION 'M05 : site introuvable ou sans organisation'
      USING ERRCODE = '23503';
  END IF;
  IF NEW.organisation_id IS NOT NULL
     AND NEW.organisation_id IS DISTINCT FROM site_org THEN
    RAISE EXCEPTION 'M05 : organisation de collecte differente du site'
      USING ERRCODE = '23514';
  END IF;
  NEW.organisation_id := site_org;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER m05_collecte_org_site_before
BEFORE INSERT OR UPDATE OF site_id, client_id, organisation_id
ON public.collectes FOR EACH ROW
EXECUTE FUNCTION public.m05_collecte_org_site();

ALTER TABLE public.collectes
  ADD CONSTRAINT m05_collecte_site_org_fk
    FOREIGN KEY (site_id, organisation_id)
    REFERENCES public.sites_de_collecte (id, organisation_id),
  ADD CONSTRAINT m05_collecte_client_org_fk
    FOREIGN KEY (client_id, organisation_id)
    REFERENCES public.clients (id, organisation_id);

-- PostgreSQL NUMERIC accepte NaN : >= 0 seul ne suffit pas.
ALTER TABLE public.stocks
  ADD CONSTRAINT m05_stock_quantite_finie_nonnegative
  CHECK (
    quantite >= 0
    AND quantite <> 'NaN'::numeric
    AND quantite <> 'Infinity'::numeric
  );

-- Les tests suivants ne doivent pas conserver leurs lignes.
SAVEPOINT m05_before_synthetic_tests;
DO $test$
DECLARE
  org_a uuid;
  org_b uuid;
  site_a uuid;
  client_a uuid;
  client_b uuid;
  matiere uuid;
  collecte_a uuid;
  stock_a uuid;
  reference text := gen_random_uuid()::text;
  nombre integer;
BEGIN
  INSERT INTO public.organisations (nom,slug,pays,devise,fuseau_horaire)
  VALUES ('M05 LAB A','m05lab-a-'||reference,'RDC','CDF','Africa/Kinshasa')
  RETURNING id INTO org_a;
  INSERT INTO public.organisations (nom,slug,pays,devise,fuseau_horaire)
  VALUES ('M05 LAB B','m05lab-b-'||reference,'RDC','CDF','Africa/Kinshasa')
  RETURNING id INTO org_b;
  INSERT INTO public.sites_de_collecte (organisation_id,nom)
  VALUES (org_a,'Site laboratoire A') RETURNING id INTO site_a;
  INSERT INTO public.clients (organisation_id,nom,type_client)
  VALUES (org_a,'Client laboratoire A','entreprise') RETURNING id INTO client_a;
  INSERT INTO public.clients (organisation_id,nom,type_client)
  VALUES (org_b,'Client laboratoire B','entreprise') RETURNING id INTO client_b;
  INSERT INTO public.types_dechets (nom)
  VALUES ('M05 LAB '||reference) RETURNING id INTO matiere;

  INSERT INTO public.collectes(site_id,client_id,type_dechet_id)
  VALUES(site_a,client_a,matiere) RETURNING id INTO collecte_a;
  SELECT count(*) INTO nombre FROM public.collectes
  WHERE id = collecte_a AND organisation_id = org_a;
  IF nombre <> 1 THEN
    RAISE EXCEPTION 'ECHEC : organisation non derivee correctement';
  END IF;
  RAISE NOTICE 'OK : collecte valide et organisation derivee du site';

  BEGIN
    INSERT INTO public.collectes(site_id,client_id,type_dechet_id)
    VALUES(site_a,client_b,matiere);
    RAISE EXCEPTION 'ECHEC : collecte inter-organisation inseree';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'OK : insertion inter-organisation refusee';
  END;

  BEGIN
    UPDATE public.collectes SET client_id=client_b WHERE id=collecte_a;
    RAISE EXCEPTION 'ECHEC : collecte changee vers client etranger';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'OK : modification vers client etranger refusee';
  END;

  BEGIN
    UPDATE public.sites_de_collecte SET organisation_id=org_b WHERE id=site_a;
    RAISE EXCEPTION 'ECHEC : transfert de site en rupture de references accepte';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'OK : transfert du site reference bloque';
  END;

  BEGIN
    UPDATE public.clients SET organisation_id=org_b WHERE id=client_a;
    RAISE EXCEPTION 'ECHEC : transfert de client en rupture de references accepte';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'OK : transfert du client reference bloque';
  END;

  INSERT INTO public.stocks(organisation_id,type_dechet_id,quantite)
  VALUES(org_a,matiere,1.125) RETURNING id INTO stock_a;
  IF NOT EXISTS(SELECT 1 FROM public.stocks WHERE id=stock_a AND quantite=1.125) THEN
    RAISE EXCEPTION 'ECHEC : quantite fractionnaire valide';
  END IF;
  RAISE NOTICE 'OK : quantite fractionnaire 1.125 kg acceptee';

  BEGIN
    INSERT INTO public.stocks(organisation_id,type_dechet_id,quantite)
    VALUES(org_b,matiere,'NaN'::numeric);
    RAISE EXCEPTION 'ECHEC : NaN accepte';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK : NaN refuse';
  END;
  BEGIN
    UPDATE public.stocks SET quantite='NaN'::numeric WHERE id=stock_a;
    RAISE EXCEPTION 'ECHEC : NaN accepte en modification';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK : NaN refuse en modification';
  END;
  BEGIN
    UPDATE public.stocks SET quantite=-1 WHERE id=stock_a;
    RAISE EXCEPTION 'ECHEC : stock negatif accepte';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK : stock negatif refuse';
  END;
END;
$test$;
ROLLBACK TO SAVEPOINT m05_before_synthetic_tests;
RELEASE SAVEPOINT m05_before_synthetic_tests;
COMMIT;
-- Validations applicatives/tenant-scope des autres tables : NON CERTIFIEES ici.
