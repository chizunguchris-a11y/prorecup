import './mission03.setup.mjs';
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
const {default:repository}=await import('../src/repositories/PortailClientRepository.js');
const {default:trace}=await import('../src/repositories/TraceabiliteMatiereRepository.js');
const {projectionClient,consulterQr}=await import('../src/services/PortailTracabiliteService.js');
const {default:pool}=await import('../src/config/db.js');
const {default:express}=await import('express');const {default:jwt}=await import('jsonwebtoken');const {default:request}=await import('supertest');
const {default:clientRoutes}=await import('../src/routes/PortailClientRoutes.js');const {default:lotRoutes}=await import('../src/routes/lotRoutes.js');
const org=randomUUID(),otherOrg=randomUUID(),user=randomUUID(),secondUser=randomUUID(),manager=randomUUID(),clientA=randomUUID(),clientB=randomUUID(),clientX=randomUUID(),site=randomUUID(),foreignSite=randomUUID(),coA=randomUUID(),coB=randomUUID(),coX=randomUUID(),lot=randomUUID(),foreignLot=randomUUID();
const db=new DatabaseSync(':memory:');
db.exec(`CREATE TABLE clients(id TEXT PRIMARY KEY,organisation_id TEXT,nom TEXT);
CREATE TABLE sites_de_collecte(id TEXT PRIMARY KEY,organisation_id TEXT,nom TEXT);
CREATE TABLE collectes(id TEXT PRIMARY KEY,client_id TEXT,site_id TEXT,type_dechet_id TEXT,poids_reel REAL,statut TEXT);
CREATE TABLE client_utilisateurs(utilisateur_id TEXT,organisation_id TEXT,client_id TEXT,actif INTEGER);
CREATE TABLE lots(id TEXT PRIMARY KEY,organisation_id TEXT,collecte_id TEXT,type_dechet_id TEXT,poids_reel REAL,quantite_restante_kg REAL,statut_lot TEXT,code_qr TEXT);
CREATE TABLE contenants(id TEXT PRIMARY KEY,organisation_id TEXT,collecte_origine_id TEXT,type_dechet_id TEXT,poids_courant_kg REAL,code_qr TEXT);
CREATE TABLE lot_contenants(lot_id TEXT,contenant_id TEXT);
CREATE TABLE missions(id TEXT,organisation_id TEXT);
CREATE TABLE pesees(id TEXT,organisation_id TEXT,poids_brut REAL,tare REAL,poids_net REAL,type TEXT);
CREATE TABLE tracabilite_matiere_evenements(id TEXT,organisation_id TEXT,contenant_id TEXT,lot_id TEXT,type_evenement TEXT,survenu_le TEXT,cree_le TEXT,collecte_id TEXT,mission_id TEXT,pesee_id TEXT,site_id TEXT,client_id TEXT,details TEXT);`);
after(()=>db.close());
const sqlConnection={query:async(sql,args)=>{
 const statement=db.prepare(sql.replace(/::(?:uuid|numeric|text|timestamptz|integer)/g,''));
 return {rows:statement.all(Object.fromEntries(args.map((v,i)=>['$'+(i+1),v])))};
}};
const originalTrace=repository.tracabiliteAutorisee.bind(repository);
beforeEach(()=>{
 for(const table of ['clients','sites_de_collecte','collectes','client_utilisateurs','lots','contenants','lot_contenants','missions','pesees','tracabilite_matiere_evenements'])db.exec('DELETE FROM '+table);
 const insert=(table,values)=>db.prepare('INSERT INTO '+table+' VALUES ('+values.map(()=>'?').join(',')+')').run(...values);
 insert('clients',[clientA,org,'Client A']);insert('clients',[clientB,org,'SECRET CLIENT B']);insert('clients',[clientX,otherOrg,'SECRET ORGANISATION']);
 insert('sites_de_collecte',[site,org,'Site commun']);insert('sites_de_collecte',[foreignSite,otherOrg,'Site étranger']);
 insert('collectes',[coA,clientA,site,'acier',20,'valide']);insert('collectes',[coB,clientB,site,'acier',80,'valide']);insert('collectes',[coX,clientX,foreignSite,'acier',900,'valide']);
 insert('client_utilisateurs',[user,org,clientA,1]);insert('client_utilisateurs',[secondUser,org,clientB,1]);
 insert('lots',[lot,org,null,'acier',100,40,'partiellement_vendu','PR-L-ABCDEF']);
 insert('lots',[foreignLot,otherOrg,coX,'acier',900,900,'en_stock','PR-L-SECRET']);
 const c1=randomUUID(),c2=randomUUID();insert('contenants',[c1,org,coA,'acier',20,'PR-C-AAAAAA']);insert('contenants',[c2,org,coB,'acier',80,'PR-C-BBBBBB']);
 insert('lot_contenants',[lot,c1]);insert('lot_contenants',[lot,c2]);
 repository.tracabiliteAutorisee=async(u,o,c=null,code=null)=>originalTrace(u,o,c,code,sqlConnection);
 repository.trouverUtilisateur=async(u,o)=>o===org&&[user,secondUser,manager].includes(u)?{utilisateur_id:u,organisation_id:o,utilisateur_actif:true,role_actif:true,role_nom:u===manager?'manager':'client'}:null;
 repository.listerClientsAutorises=async(u,o)=>o===org?[{client_id:u===user?clientA:clientB}]:[];
 pool.query=async(sql,args)=>{
  assert.match(sql,/auth_epoch/);return {rows:[{actif:true,auth_epoch:1}]};
 };
});
const app=express();app.use(express.json());app.use('/api/portail-client',clientRoutes);app.use('/api/lots',lotRoutes);
app.use((error,req,res,next)=>res.status(error.statut||500).json({success:false,message:error.message}));
const token=(id=user,organisationId=org,role='client',options={})=>jwt.sign({id,organisationId,role,...options},process.env.JWT_SECRET,{expiresIn:'1h'});
test('SQL exécuté : lot partagé, seul 20 kg du client A ; aucun prorata de reste',async()=>{
 const rows=await repository.tracabiliteAutorisee(user,org,coA);const result=projectionClient(rows);
 assert.equal(result.length,1);assert.equal(result[0].quantite_origine_kg,20);assert.equal(result[0].reste_attribuable_kg,null);assert.equal(result[0].co2e_attribuable_kg,null);
 assert.doesNotMatch(JSON.stringify(result),/SECRET|acheteur|prix/);
});
test('SQL exécuté : client B voit uniquement ses 80 kg malgré le même site',async()=>{
 const rows=await repository.tracabiliteAutorisee(secondUser,org);assert.equal(rows.length,1);assert.equal(rows[0].collecte_id,coB);assert.equal(rows[0].quantite_origine_kg,80);
 assert.equal((await repository.tracabiliteAutorisee(user,org,coB)).length,0);
});
test('SQL exécuté : QR étranger, liaison inactive et organisation différente invisibles',async()=>{
 assert.equal((await repository.tracabiliteAutorisee(user,org,null,'PR-L-SECRET')).length,0);
 assert.equal((await repository.tracabiliteAutorisee(user,otherOrg)).length,0);
 db.exec('UPDATE client_utilisateurs SET actif=0');assert.equal((await repository.tracabiliteAutorisee(user,org)).length,0);
});
test('SQL exécuté : poids de contenant inconnu ou somme incohérente → origine indéterminée',async()=>{
 db.prepare('UPDATE contenants SET poids_courant_kg=NULL WHERE collecte_origine_id=?').run(coB);
 let rows=await repository.tracabiliteAutorisee(user,org);assert.equal(rows[0].quantite_origine_kg,null);
 db.prepare('UPDATE contenants SET poids_courant_kg=81 WHERE collecte_origine_id=?').run(coB);
 rows=await repository.tracabiliteAutorisee(user,org);assert.equal(rows[0].quantite_origine_kg,null);
});
test('SQL exécuté : lot direct historique conserve reste NULL, pas zéro',async()=>{
 db.exec('DELETE FROM lot_contenants');
 db.prepare('UPDATE lots SET collecte_id=?,poids_reel=20,quantite_restante_kg=NULL WHERE id=?').run(coA,lot);
 const rows=await repository.tracabiliteAutorisee(user,org);assert.equal(rows.length,1);assert.equal(rows[0].quantite_origine_kg,20);assert.equal(projectionClient(rows)[0].reste_attribuable_kg,null);
});
test('projection allowlist : données commerciales/co-clients retirées, NaN jamais affiché',()=>{
 const result=projectionClient([{lot_id:lot,collecte_id:coA,source_type:'regroupement',quantite_origine_kg:'NaN',reste_attribuable_kg:40,client_nom:'SECRET',poids_lot:100,stock:999,prix:12}]);
 assert.equal(result[0].quantite_origine_kg,null);assert.equal(result[0].reste_attribuable_kg,null);assert.doesNotMatch(JSON.stringify(result),/SECRET|prix|stock|poids_lot/);
});
test('HTTP réel : QR client authentifié ne retourne que sa contribution',async()=>{
 const response=await request(app).get('/api/portail-client/tracabilite/PR-L-ABCDEF').set('Authorization','Bearer '+token()).expect(200);
 assert.equal(response.body.data.contributions[0].quantite_origine_kg,20);assert.doesNotMatch(JSON.stringify(response.body),/SECRET|acheteur|prix|poids_lot/);
});
test('HTTP réel : sans token, session révoquée ou mauvais rôle refusés',async()=>{
 await request(app).get('/api/portail-client/tracabilite/PR-L-ABCDEF').expect(401);
 await request(app).get('/api/portail-client/tracabilite/PR-L-ABCDEF').set('Authorization','Bearer '+token(user,org,'client',{authEpoch:2})).expect(401);
 await request(app).get('/api/portail-client/tracabilite/PR-L-ABCDEF').set('Authorization','Bearer '+token(manager,org,'manager')).expect(403);
});
test('HTTP réel : QR non autorisé et inexistant donnent le même 404 ; paramètres usurpés ignorés',async()=>{
 const auth='Bearer '+token();
 for(const code of ['PR-L-SECRET','PR-L-INCONNU'])await request(app).get('/api/portail-client/tracabilite/'+code+'?client_id='+clientX+'&organisation_id='+otherOrg).set('Authorization',auth).expect(404);
 await request(app).get('/api/portail-client/tracabilite/'+encodeURIComponent('<script>')).set('Authorization',auth).expect(400);
});
test('HTTP réel : client interdit sur historiques Manager, étiquettes et création',async()=>{
 const auth='Bearer '+token();for(const path of ['/tracabilite/PR-L-ABCDEF','/etiquette/PR-L-ABCDEF','/unites'])await request(app).get('/api/lots'+path).set('Authorization',auth).expect(403);
 await request(app).post('/api/lots/regroupements').set('Authorization',auth).send({}).expect(403);
});
test('SQL exécuté : événement QR d’une autre organisation ou pesée étrangère exclu',async()=>{
 const add=(eventOrg,pesee)=>db.prepare('INSERT INTO tracabilite_matiere_evenements VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),eventOrg,null,lot,'creation','2026-10-31','2026-10-31',null,null,pesee,null,null,'{}');
 add(otherOrg,null);const p=randomUUID();db.prepare('INSERT INTO pesees VALUES (?,?,?,?,?,?)').run(p,otherOrg,900,0,900,'terrain');add(org,p);
 const rows=await trace.historique(org,'PR-L-ABCDEF',sqlConnection);assert.equal(rows.length,1);assert.equal(rows[0].type_evenement,null);assert.equal(rows[0].poids_net,null);
});

test('HTTP réel : impact client conserve CO2e non disponible sans attribution inventée',async()=>{
 repository.obtenirImpactAutorise=async()=>({resume:{poids_reel_kg:20},repartition_matieres:[],evolution_mensuelle:[],par_client:[]});
 const response=await request(app).get('/api/portail-client/impact').set('Authorization','Bearer '+token()).expect(200);
 assert.equal(response.body.data.carbone.disponible,false);assert.equal(response.body.data.carbone.co2e_estime_kg,null);
 assert.equal(response.body.data.resume.poids_reel_kg,20);
});

test('SQL exécuté : poids historique de lot incompatible avec collecte → aucune contribution affirmée',async()=>{
 db.prepare('UPDATE collectes SET poids_reel=19 WHERE id=?').run(coA);
 let rows=await repository.tracabiliteAutorisee(user,org);assert.equal(rows[0].quantite_origine_kg,null);
 db.prepare('UPDATE lots SET collecte_id=?,poids_reel=20 WHERE id=?').run(coA,lot);
 rows=await repository.tracabiliteAutorisee(user,org);assert.equal(rows[0].quantite_origine_kg,null);assert.equal(rows[0].reste_attribuable_kg,null);
});
