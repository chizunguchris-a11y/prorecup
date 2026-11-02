import {pool,verifierIsolation} from './mission04.pg-setup.mjs';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const {default:missionService}=await import('../src/services/MissionService.js');
const {default:affecter}=await import('../src/services/MissionCollecteService.js');
const {default:siteService}=await import('../src/services/SiteService.js');
const {default:collecteService}=await import('../src/services/CollecteService.js');
const {default:terrain}=await import('../src/services/TerrainMissionService.js');
const {default:collectes}=await import('../src/services/TerrainCollecteService.js');
const {default:preuves}=await import('../src/services/TerrainPreuveService.js');
const {default:pesees}=await import('../src/services/PeseeService.js');
const {default:qr}=await import('../src/services/TraceabiliteMatiereService.js');
const {default:ventes}=await import('../src/services/VenteService.js');
const {consulterQr}=await import('../src/services/PortailTracabiliteService.js');
const {default:storage}=await import('../src/services/TerrainStorageService.js');
const {default:express}=await import('express');const {default:request}=await import('supertest');const {default:jwt}=await import('jsonwebtoken');
const {default:venteRoutes}=await import('../src/routes/venteRoutes.js');
const {default:portailRoutes}=await import('../src/routes/PortailClientRoutes.js');
// Storage SIMULE en memoire : aucune assertion d'infrastructure Supabase reelle.
const objects=new Map();let failStorage=false;
process.env.SUPABASE_STORAGE_BUCKET='synthetic-only';
storage.obtenirConfiguration=()=>({url:'https://storage.invalid',cle:'synthetic-only',bucket:'synthetic-only'});
storage.envoyerFichier=async({chemin,buffer})=>{if(failStorage)throw Error('storage indisponible simule');objects.set(chemin,Buffer.from(buffer));return {}};
const ids=Object.fromEntries(['org','foreign','manager','user','customer','otherCustomer','agent','tricycle','client','foreignClient','mat','balance','depotBalance','factor'].map(k=>[k,randomUUID()]));
let site,depot,collecte,mission,contenant,lot,sale,stock;const base=Math.floor((Date.now()-3600000)/1000)*1000+123;
const event=n=>({operation_id:randomUUID(),survenu_le:new Date(base+n*10000).toISOString(),latitude:0,longitude:0,precision_gps:5});
const identity={organisation_id:ids.org,utilisateur_id:ids.user,agent_id:ids.agent};
after(async()=>pool.end());
test('E2E PostgreSQL : Manager site collecte mission agent preuves pesees depot QR lot stock vente portail',async t=>{
 await verifierIsolation();
 await pool.query('TRUNCATE organisations,types_dechets CASCADE');
 await pool.query("INSERT INTO organisations(id,devise) VALUES($1,'CDF'),($2,'CDF')",[ids.org,ids.foreign]);
 for(const id of [ids.manager,ids.user,ids.customer,ids.otherCustomer])await pool.query("INSERT INTO utilisateurs(id,organisation_id,nom) VALUES($1,$2,'Synthetique')",[id,ids.org]);
 await pool.query("INSERT INTO clients(id,organisation_id,nom) VALUES($1,$3,'Client synth'),($2,$4,'Etranger synth')",[ids.client,ids.foreignClient,ids.org,ids.foreign]);
 await pool.query('INSERT INTO client_utilisateurs(organisation_id,client_id,utilisateur_id) VALUES($1,$2,$3)',[ids.org,ids.client,ids.customer]);
 await pool.query("INSERT INTO types_dechets(id,nom,organisation_id) VALUES($1,'Acier synth',$2)",[ids.mat,ids.org]);
 await pool.query('INSERT INTO agents(id,organisation_id,utilisateur_id) VALUES($1,$2,$3)',[ids.agent,ids.org,ids.user]);
 await pool.query("INSERT INTO tricycles(id,organisation_id,numero_interne) VALUES($1,$2,'SYNTH-01')",[ids.tricycle,ids.org]);
 await t.test('Creation par les vrais services et affectation',async()=>{
  site=await siteService.creer({organisation_id:ids.org,nom:'Site synth'});depot=await siteService.creer({organisation_id:ids.org,nom:'Depot synth'});
  await pool.query('UPDATE sites_de_collecte SET latitude=0,longitude=0 WHERE id=$1',[site.id]);
  await pool.query('INSERT INTO client_sites VALUES($1,$2,$3,true)',[ids.org,ids.client,site.id]);
  await assert.rejects(collecteService.creer({organisation_id:ids.foreign,site_id:site.id,client_id:ids.client,type_dechet_id:ids.mat,poids_estime:10}),e=>e.statut===404);
  await assert.rejects(collecteService.creer({organisation_id:ids.org,site_id:site.id,client_id:ids.foreignClient,type_dechet_id:ids.mat,poids_estime:10}),e=>e.statut===404);
  await assert.rejects(collecteService.creer({organisation_id:ids.org,site_id:depot.id,client_id:ids.client,type_dechet_id:ids.mat,poids_estime:10}),e=>e.statut===404);
  await assert.rejects(collecteService.creer({organisation_id:ids.org,site_id:site.id,client_id:ids.client,type_dechet_id:ids.mat,poids_estime:Infinity}),e=>e.statut===400);
  collecte=await collecteService.creer({organisation_id:ids.org,site_id:site.id,client_id:ids.client,type_dechet_id:ids.mat,poids_estime:10});
  mission=await missionService.creer(ids.org,ids.manager,{agent_id:ids.agent,tricycle_id:ids.tricycle,date_prevue:new Date(base).toISOString().slice(0,10),heure_depart_prevue:'08:00',heure_retour_prevue:'10:00'});
  await affecter.ajouter(mission.id,ids.org,{collecte_id:collecte.id,ordre_collecte:1});
  await missionService.creer(ids.org,ids.manager,{agent_id:ids.agent,tricycle_id:ids.tricycle,date_prevue:new Date(base).toISOString().slice(0,10),heure_depart_prevue:'10:00',heure_retour_prevue:'11:00'});
  await assert.rejects(missionService.creer(ids.org,ids.manager,{agent_id:ids.agent,tricycle_id:ids.tricycle,date_prevue:new Date(base).toISOString().slice(0,10),heure_depart_prevue:'09:00',heure_retour_prevue:'11:00'}),e=>e.statut===409);
 });
 await t.test('QR affecte au client/site et balances terrain/depot',async()=>{
  contenant=await qr.creerContenant(ids.org,ids.manager,{type_contenant:'sac',code_qr:'PR-C-SYNTHETIQUE01',tare_kg:1,site_courant_id:site.id,client_courant_id:ids.client,type_dechet_id:ids.mat});
  await pool.query("INSERT INTO balances(id,organisation_id,numero_interne,capacite_max_kg,precision_kg,tricycle_id) VALUES($1,$2,'TERRAIN',100,0.001,$3)",[ids.balance,ids.org,ids.tricycle]);
  await pool.query("INSERT INTO balances(id,organisation_id,numero_interne,capacite_max_kg,precision_kg,site_id) VALUES($1,$2,'DEPOT',100,0.001,$3)",[ids.depotBalance,ids.org,depot.id]);
 });
 await t.test('Demarrage arrivee et doublons UUID reels',async()=>{
  const p=event(0);await terrain.demarrer(mission.id,identity,p);assert.equal((await terrain.demarrer(mission.id,identity,p)).deja_traitee,true);
  await assert.rejects(terrain.demarrer(mission.id,identity,{...p,latitude:1}),e=>e.statut===409);
  await collectes.enregistrerArrivee(mission.id,collecte.id,identity,event(1));await collectes.demarrerCollecte(mission.id,collecte.id,identity,event(2));
 });
 const file={buffer:Buffer.from('89504e470d0a1a0a00000000','hex'),mimetype:'image/png',size:12};
 const before={operation_id:randomUUID(),type_preuve:'avant_collecte',pris_le:event(3).survenu_le,latitude:0,longitude:0,precision_gps:5};
 await t.test('Erreur storage simulee : aucune preuve SQL puis reprise meme UUID',async()=>{
  failStorage=true;await assert.rejects(preuves.enregistrer(mission.id,collecte.id,identity,before,file),/storage indisponible/);failStorage=false;
  assert.equal((await pool.query('SELECT count(*) FROM preuves_collecte')).rows[0].count,'0');
  await preuves.enregistrer(mission.id,collecte.id,identity,before,file);await preuves.enregistrer(mission.id,collecte.id,identity,before,file);
  assert.equal(objects.size,1);assert.equal((await pool.query('SELECT count(*) FROM preuves_collecte')).rows[0].count,'1');
 });
 await t.test('Pesee terrain reelle puis fin collecte preuves apres et mission',async()=>{
  const p={operation_id:randomUUID(),balance_id:ids.balance,poids_brut:11,tare:1,date_heure:event(4).survenu_le,latitude:0,longitude:0,precision_gps:5,codes_qr:[contenant.code_qr]};
  await pesees.enregistrer(mission.id,collecte.id,identity,p);assert.equal((await pesees.enregistrer(mission.id,collecte.id,identity,p)).deja_traitee,true);
  await assert.rejects(terrain.terminer(mission.id,identity,event(5)),e=>e.statut===409);
  await collectes.terminerCollecte(mission.id,collecte.id,identity,{...event(5),resultat_terrain:'collectee',poids_reel:10});
  await preuves.enregistrer(mission.id,collecte.id,identity,{...before,operation_id:randomUUID(),type_preuve:'apres_collecte',pris_le:event(6).survenu_le},file);
  await terrain.terminer(mission.id,identity,event(7));
  // Validation manager reelle du service (et non UPDATE du statut dans la fixture).
  await collecteService.valider(collecte.id,ids.org);
 });
 await t.test('Pesee depot individuelle, reception et regroupement sans double stock',async()=>{
  await pesees.enregistrer(mission.id,collecte.id,{...identity,utilisateur_id:ids.manager},{operation_id:randomUUID(),balance_id:ids.depotBalance,poids_brut:11,tare:1,date_heure:event(8).survenu_le,codes_qr:[contenant.code_qr]},'depot');
  const p={operation_id:randomUUID(),site_id:depot.id,codes_qr:[contenant.code_qr],survenu_le:event(9).survenu_le};lot=await qr.regrouper(ids.org,ids.manager,p);
  assert.equal((await qr.regrouper(ids.org,ids.manager,p)).id,lot.id);
  stock=(await pool.query('SELECT * FROM stocks WHERE organisation_id=$1',[ids.org])).rows[0];assert.equal(Number(stock.quantite),10);
 });
 await t.test('Vente via API HTTP JWT reelle, rejeu identique et bilan SQL',async()=>{
  await pool.query("INSERT INTO facteurs_carbone(id,type_dechet_id,facteur_kg_co2e_par_kg,statut,date_debut_validite) VALUES($1,$2,2,'valide','2000-01-01')",[ids.factor,ids.mat]);
  const app=express();app.use(express.json());app.use('/api/ventes',venteRoutes);app.use((e,req,res,next)=>res.status(e.statut||500).json({error:e.message}));
  const token=jwt.sign({id:ids.manager,organisationId:ids.org,role:'manager'},process.env.JWT_SECRET);
  const p={operation_id:randomUUID(),stock_id:stock.id,quantite:4,prix_unitaire:500,devise:'CDF',acheteur_nom:'Acheteur synth'};
  const post=()=>request(app).post('/api/ventes').set('Authorization','Bearer '+token).send(p);
  const first=await post().expect(201),second=await post().expect(201);assert.equal(first.text,second.text);sale=first.body.data;
  assert.equal(Number(sale.impact_carbone.co2e_estime_kg),8);assert.equal(Number((await pool.query('SELECT quantite FROM stocks WHERE id=$1',[stock.id])).rows[0].quantite),6);
 });
 await t.test('Portail client : provenance autorisee, aucun client voisin ni organisation etrangere',async()=>{
  const visible=await consulterQr(ids.customer,ids.org,lot.code_qr);assert.equal(visible.contributions.length,1);assert.equal(visible.contributions[0].quantite_origine_kg,10);assert.equal(visible.contributions[0].reste_attribuable_kg,null);
  assert.equal(visible.contributions[0].co2e_attribuable_kg,null);assert.ok(!JSON.stringify(visible).includes('Acheteur synth'));
  await assert.rejects(consulterQr(ids.otherCustomer,ids.org,lot.code_qr),e=>e.statut===404);await assert.rejects(consulterQr(ids.customer,ids.foreign,lot.code_qr),e=>e.statut===404);
 });
 await t.test('API portail reelle : autorisations rechargees en SQL, JWT expire et role trompeur refuses',async()=>{
  const role=(await pool.query("INSERT INTO roles(nom) VALUES('client') RETURNING id")).rows[0].id;
  await pool.query('UPDATE utilisateurs SET role_id=$1 WHERE id=ANY($2::uuid[])',[role,[ids.customer,ids.otherCustomer]]);
  const app=express();app.use('/api/portail-client',portailRoutes);app.use((e,req,res,next)=>res.status(e.statut||500).json({error:e.message}));
  const token=(id,changes={})=>jwt.sign({id,organisationId:ids.org,role:'client',...changes},process.env.JWT_SECRET);
  const path='/api/portail-client/tracabilite/'+lot.code_qr;
  const get=t=>request(app).get(path).set('Authorization','Bearer '+t);
  const visible=await get(token(ids.customer)).expect(200);assert.equal(visible.body.data.contributions.length,1);
  await get(token(ids.otherCustomer)).expect(403);await get(token(ids.manager)).expect(403);
  await get(token(ids.customer,{exp:Math.floor(Date.now()/1000)-60})).expect(401);
  await request(app).get(path).expect(401);
  await pool.query('UPDATE client_utilisateurs SET actif=false WHERE utilisateur_id=$1',[ids.customer]);await get(token(ids.customer)).expect(403);
 });
});
