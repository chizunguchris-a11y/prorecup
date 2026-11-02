import {pool,verifierIsolation} from './mission04.pg-setup.mjs';
import {test,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {default:service}=await import('../src/services/VenteService.js');
const {default:operations}=await import('../src/repositories/VenteOperationRepository.js');
const {default:alloc}=await import('../src/repositories/VenteLotRepository.js');
const {default:express}=await import('express');const {default:request}=await import('supertest');const {default:jwt}=await import('jsonwebtoken');
const {default:routes}=await import('../src/routes/venteRoutes.js');
const ids={org:randomUUID(),org2:randomUUID(),user:randomUUID(),other:randomUUID(),user2:randomUUID(),mat:randomUUID(),stock:randomUUID(),stock2:randomUUID(),lot1:randomUUID(),lot2:randomUUID(),lot3:randomUUID(),factor:randomUUID()};
const originalConnect=pool.connect.bind(pool),originalFinish=operations.terminer,originalReserve=operations.reserver,originalAlloc=alloc.creer;
const data=(changes={})=>({operation_id:randomUUID(),organisation_id:ids.org,cree_par:ids.user,stock_id:ids.stock,quantite:7,prix_unitaire:500,devise:'CDF',acheteur_nom:'Acheteur synthétique',reference_vente:'M04-SYNTH',...changes});
beforeEach(async()=>{
 pool.connect=originalConnect;operations.terminer=originalFinish;operations.reserver=originalReserve;alloc.creer=originalAlloc;
 await verifierIsolation();
 await pool.query('TRUNCATE vente_operations,vente_lots,mouvements_stock,impacts_carbone,ventes,facteurs_carbone,lots,stocks,utilisateurs,organisations,types_dechets CASCADE');
 const seed=await originalConnect();try{await seed.query('BEGIN');
 await seed.query('INSERT INTO organisations VALUES ($1,$3),($2,$3)',[ids.org,ids.org2,'CDF']);
 await seed.query("INSERT INTO utilisateurs(id,organisation_id,nom) VALUES($1,$4,'Auteur'),($2,$4,'Autre auteur'),($3,$5,'Autre organisation')",[ids.user,ids.other,ids.user2,ids.org,ids.org2]);
 await seed.query("INSERT INTO types_dechets VALUES($1,'Acier synthétique')",[ids.mat]);
 await seed.query('INSERT INTO stocks(id,organisation_id,type_dechet_id,quantite,tracabilite_lots_active) VALUES($1,$3,$5,20,true),($2,$4,$5,20,true)',[ids.stock,ids.stock2,ids.org,ids.org2,ids.mat]);
 await seed.query("INSERT INTO lots(id,organisation_id,type_dechet_id,code_qr,poids_reel,quantite_restante_kg,statut_lot) VALUES($1,$4,$6,'PR-L-M04AAAA',5,5,'en_stock'),($2,$4,$6,'PR-L-M04BBBB',15,15,'en_stock'),($3,$5,$6,'PR-L-M04CCCC',20,20,'en_stock')",[ids.lot1,ids.lot2,ids.lot3,ids.org,ids.org2,ids.mat]);
 await seed.query("INSERT INTO mouvements_stock(stock_id,lot_id,type_mouvement,quantite,date_mouvement) VALUES($1,$3,'ENTREE',5,'2026-01-01'),($1,$4,'ENTREE',15,'2026-01-02'),($2,$5,'ENTREE',20,'2026-01-01')",[ids.stock,ids.stock2,ids.lot1,ids.lot2,ids.lot3]);
 await seed.query("INSERT INTO facteurs_carbone(id,type_dechet_id,facteur_kg_co2e_par_kg,statut,date_debut_validite) VALUES($1,$2,2,'valide','2000-01-01')",[ids.factor,ids.mat]);
 await seed.query('COMMIT');}catch(error){await seed.query('ROLLBACK');throw error}finally{seed.release()}
});
after(async()=>{pool.connect=originalConnect;await pool.end()});
const serial=value=>JSON.parse(JSON.stringify(value));
async function etat(){const {rows:[r]}=await pool.query(`SELECT
 (SELECT quantite FROM stocks WHERE id=$1) AS stock,
 (SELECT SUM(quantite_restante_kg) FROM lots WHERE organisation_id=$2) AS lots,
 (SELECT COUNT(*) FROM ventes WHERE organisation_id=$2) AS ventes,
 (SELECT COUNT(*) FROM vente_operations WHERE organisation_id=$2) AS operations,
 (SELECT COUNT(*) FROM mouvements_stock m JOIN ventes v ON v.id=m.vente_id WHERE v.organisation_id=$2 AND m.type_mouvement='SORTIE') AS sorties,
 (SELECT COALESCE(SUM(vl.quantite_kg),0) FROM vente_lots vl WHERE vl.organisation_id=$2) AS alloue,
 (SELECT COUNT(*) FROM impacts_carbone ic JOIN ventes v ON v.id=ic.vente_id WHERE v.organisation_id=$2) AS impacts`,[ids.stock,ids.org]);return Object.fromEntries(Object.entries(r).map(([k,v])=>[k,Number(v)]))}
const token=(user=ids.user,org=ids.org,role='manager')=>jwt.sign({id:user,organisationId:org,role},process.env.JWT_SECRET,{expiresIn:'1h'});
const app=express();app.use(express.json());app.use('/api/ventes',routes);app.use((e,req,res,next)=>res.status(e.statut||500).json({success:false,message:e.message,code:e.code}));
const post=(p,t=token())=>request(app).post('/api/ventes').set('Authorization','Bearer '+t).send(p);
test('PostgreSQL réel : transaction FIFO, stock, impact et reçu uniques',async()=>{
 const p=data();const first=await service.creer(p),second=await service.creer(p);
 assert.deepEqual(serial(first),serial(second));assert.equal(first.allocations_lots.length,2);
 assert.deepEqual(await etat(),{stock:13,lots:13,ventes:1,operations:1,sorties:1,alloue:7,impacts:1});
});
test('HTTP réel : mêmes UUID et paramètres, même statut et corps byte pour byte',async()=>{
 const p=data();const first=await post(p).expect(201),second=await post(p).expect(201);
 assert.equal(first.text,second.text);assert.equal(first.body.data.operation_id,p.operation_id);
 assert.equal((await etat()).ventes,1);
});
test('HTTP réel : consultation du reçu réservée à son auteur et organisation',async()=>{
 const p=data();const first=await service.creer(p);
 const get=t=>request(app).get('/api/ventes/operations/'+p.operation_id).set('Authorization','Bearer '+t);
 const receipt=await get(token()).expect(200);assert.deepEqual(receipt.body.data,first);
 await get(token(ids.other)).expect(404);await get(token(ids.user2,ids.org2)).expect(404);
});
test('PostgreSQL réel : huit requêtes concurrentes pour le même UUID, une vente',async()=>{
 const p=data();const result=await Promise.all(Array.from({length:8},()=>service.creer({...p})));
 result.forEach(item=>assert.deepEqual(item,result[0]));assert.deepEqual(await etat(),{stock:13,lots:13,ventes:1,operations:1,sorties:1,alloue:7,impacts:1});
});
test('PostgreSQL réel : paramètres différents en concurrence, un succès et un conflit',async()=>{
 const p=data();const result=await Promise.allSettled([service.creer(p),service.creer({...p,quantite:8})]);
 assert.equal(result.filter(x=>x.status==='fulfilled').length,1);assert.equal(result.find(x=>x.status==='rejected').reason.statut,409);
 assert.equal((await etat()).ventes,1);
});
test('PostgreSQL réel : deux UUID distincts ne sur-vendent pas le stock',async()=>{
 const result=await Promise.allSettled([service.creer(data({quantite:15})),service.creer(data({quantite:15}))]);
 assert.equal(result.filter(x=>x.status==='fulfilled').length,1);assert.equal(result.find(x=>x.status==='rejected').reason.statut,409);
 assert.deepEqual(await etat(),{stock:5,lots:5,ventes:1,operations:1,sorties:1,alloue:15,impacts:1});
});
test('PostgreSQL réel : UUID distincts légitimes, allocations non dupliquées',async()=>{
 await Promise.all([service.creer(data()),service.creer(data())]);assert.deepEqual(await etat(),{stock:6,lots:6,ventes:2,operations:2,sorties:2,alloue:14,impacts:2});
});
test('PostgreSQL réel : conflit sur chaque paramètre et sur auteur',async()=>{
 const p=data();await service.creer(p);
 for(const change of [{stock_id:ids.stock2},{quantite:8},{prix_unitaire:501},{devise:'USD'},{acheteur_nom:'Autre acheteur'},{reference_vente:'Autre référence'},{cree_par:ids.other}])
  await assert.rejects(service.creer({...p,...change}),e=>e.statut===409);
 assert.equal((await etat()).ventes,1);
});
test('PostgreSQL réel : normalisation équivalente, aucune fausse divergence',async()=>{
 const p=data();const first=await service.creer(p);
 const replay=await service.creer({...p,operation_id:p.operation_id.toUpperCase(),quantite:'7.000',prix_unitaire:'500.00',devise:' cdf ',acheteur_nom:'  Acheteur synthétique  '});assert.deepEqual(replay,first);
});
test('PostgreSQL réel : même UUID dans deux organisations, deux intentions isolées',async()=>{
 const p=data();const a=await service.creer(p);const b=await service.creer({...p,organisation_id:ids.org2,cree_par:ids.user2,stock_id:ids.stock2});
 assert.notEqual(a.vente.id,b.vente.id);assert.equal((await pool.query('SELECT COUNT(*) FROM vente_operations')).rows[0].count,'2');
 await assert.rejects(service.consulterOperation(ids.org,ids.other,p.operation_id),e=>e.statut===404);
});
test('HTTP réel : pas de UUID, rôle client ou stock étranger refusés sans effet',async()=>{
 const p=data();delete p.operation_id;await post(p).expect(400);
 await post(data(),token(ids.user,ids.org,'client')).expect(403);
 await post(data({stock_id:ids.stock2})).expect(404);
 assert.equal((await etat()).ventes,0);
});
test('PostgreSQL réel : réponse perdue après COMMIT, retry identique sans recalcul',async()=>{
 let lost=true;pool.connect=async()=>{const c=await originalConnect();const savedQuery=c.query,query=savedQuery.bind(c),release=c.release.bind(c);c.release=(...a)=>{c.query=savedQuery;release(...a)};c.query=async(sql,...args)=>{const result=await query(sql,...args);if(sql==='COMMIT'&&lost){lost=false;throw Object.assign(Error('response lost'),{code:'ECONNRESET'})}return result};return c};
 const p=data();await assert.rejects(service.creer(p),e=>e.statut===503&&e.code==='VENTE_RESULTAT_INCERTAIN');pool.connect=originalConnect;
 const before=await etat();assert.equal(before.ventes,1);
 await pool.query('UPDATE facteurs_carbone SET facteur_kg_co2e_par_kg=9');const replay=await service.creer(p);
 assert.equal(Number(replay.impact_carbone.co2e_estime_kg),14);assert.deepEqual(await etat(),before);
});
test('PostgreSQL réel : terminaison connexion avant COMMIT, rollback puis retry sûr',async()=>{
 let kill=true;pool.connect=async()=>{const c=await originalConnect();const savedQuery=c.query,query=savedQuery.bind(c),release=c.release.bind(c);c.release=(...a)=>{c.query=savedQuery;release(...a)};c.query=async(sql,...args)=>{
  if(sql==='COMMIT'&&kill){kill=false;const killer=await originalConnect();try{await killer.query('SELECT pg_terminate_backend($1)',[c.processID])}finally{killer.release()}}return query(sql,...args)
 };c.on('error',()=>{});return c};
 const p=data();await assert.rejects(service.creer(p),e=>e.statut===503);pool.connect=originalConnect;
 assert.equal((await etat()).ventes,0);await service.creer(p);assert.equal((await etat()).ventes,1);
});
test('PostgreSQL réel : erreur après première allocation, aucune écriture partielle',async()=>{
 let n=0;alloc.creer=async(...args)=>{if(++n===2)throw Error('allocation interrompue');return originalAlloc.apply(alloc,args)};
 const p=data();await assert.rejects(service.creer(p),/allocation interrompue/);alloc.creer=originalAlloc;
 assert.deepEqual(await etat(),{stock:20,lots:20,ventes:0,operations:0,sorties:0,alloue:0,impacts:0});await service.creer(p);assert.equal((await etat()).ventes,1);
});
test('PostgreSQL réel : échec après impact avant reçu, impact et stock rollbackés',async()=>{
 operations.terminer=async()=>{throw Error('journal interrompu')};await assert.rejects(service.creer(data()),/journal interrompu/);operations.terminer=originalFinish;
 assert.deepEqual(await etat(),{stock:20,lots:20,ventes:0,operations:0,sorties:0,alloue:0,impacts:0});
});
test('PostgreSQL réel : lock_timeout réel, même UUID réutilisable après libération',async()=>{
 const blocker=await pool.connect();await blocker.query('BEGIN');await blocker.query('SELECT id FROM stocks WHERE id=$1 FOR UPDATE',[ids.stock]);
 const p=data();try{await assert.rejects(service.creer(p),e=>e.statut===503&&e.code==='VENTE_RETRY_SAME_OPERATION')}finally{await blocker.query('ROLLBACK');blocker.release()}
 assert.equal((await etat()).ventes,0);await service.creer(p);assert.equal((await etat()).ventes,1);
});
test('PostgreSQL réel : statement_timeout réel et rollback complet',async()=>{
 alloc.creer=async(...args)=>{const c=args[1];await c.query("SET LOCAL statement_timeout='30ms'");await c.query('SELECT pg_sleep(0.2)');return originalAlloc.apply(alloc,args)};
 const p=data();await assert.rejects(service.creer(p),e=>e.statut===503&&e.code==='VENTE_RETRY_SAME_OPERATION');alloc.creer=originalAlloc;
 assert.equal((await etat()).operations,0);await service.creer(p);assert.equal((await etat()).ventes,1);
});
test('PostgreSQL réel : absence de facteur figée même après ajout ultérieur',async()=>{
 await pool.query('DELETE FROM facteurs_carbone');const p=data();const first=await service.creer(p);assert.equal(first.impact_carbone,null);
 await pool.query("INSERT INTO facteurs_carbone(id,type_dechet_id,facteur_kg_co2e_par_kg,statut,date_debut_validite) VALUES($1,$2,2,'valide','2000-01-01')",[ids.factor,ids.mat]);
 assert.deepEqual(await service.creer(p),first);assert.equal((await etat()).impacts,0);
});
test('PostgreSQL réel : devise par défaut et stock du reçu restent ceux du COMMIT initial',async()=>{
 const p=data();delete p.devise;const first=await service.creer(p);
 await pool.query("UPDATE organisations SET devise='USD' WHERE id=$1",[ids.org]);await service.creer(data({quantite:2,devise:'USD'}));
 assert.deepEqual(await service.creer(p),first);assert.equal(first.vente.devise,'CDF');assert.equal(Number(first.stock.quantite),13);assert.equal((await etat()).stock,11);
});
test('PostgreSQL réel : stock historique, pas d’allocations ni provenance inventées',async()=>{
 await pool.query('UPDATE stocks SET tracabilite_lots_active=false WHERE id=$1',[ids.stock]);await pool.query('UPDATE lots SET quantite_restante_kg=NULL WHERE organisation_id=$1',[ids.org]);
 const p=data();const a=await service.creer(p);const b=await service.creer(p);assert.deepEqual(a,b);assert.equal(a.vente.provenance_lots_statut,'non_determinee');assert.equal(a.allocations_lots.length,0);assert.equal((await etat()).stock,13);
});
test('PostgreSQL réel : contraintes uniques sorties/impact et immutabilité du journal',async()=>{
 const result=await service.creer(data());
 await assert.rejects(pool.query("INSERT INTO mouvements_stock(stock_id,vente_id,type_mouvement,quantite) VALUES($1,$2,'SORTIE',7)",[ids.stock,result.vente.id]),e=>e.code==='23505');
 await assert.rejects(pool.query('INSERT INTO impacts_carbone(vente_id,facteur_carbone_id,quantite_kg,facteur_utilise,co2e_estime_kg) VALUES($1,$2,7,2,14)',[result.vente.id,ids.factor]),e=>e.code==='23505');
 await assert.rejects(pool.query('UPDATE vente_operations SET reponse=reponse'),e=>e.code==='23514');
 await assert.rejects(pool.query('UPDATE ventes SET quantite=8 WHERE id=$1',[result.vente.id]),e=>e.code==='23514');
});
test('PostgreSQL réel : ancienne voie sans journal refuse COMMIT, aucune vente persistée',async()=>{
 await assert.rejects(pool.query("INSERT INTO ventes(organisation_id,stock_id,quantite,prix_unitaire,montant_total,devise,acheteur_nom,statut,cree_par,provenance_lots_statut) VALUES($1,$2,1,1,1,'CDF','Ancien appel','confirmee',$3,'non_determinee')",[ids.org,ids.stock,ids.user]),e=>e.code==='23514');
 assert.equal((await etat()).ventes,0);
});
test('PostgreSQL réel : schéma de journal absent, création suspendue sans déduction',async()=>{
 await pool.query('ALTER TABLE vente_operations RENAME TO vente_operations_temp');
 try{await assert.rejects(service.creer(data()),e=>e.statut===503&&e.code==='VENTE_IDEMPOTENCE_SCHEMA_REQUIRED')}finally{await pool.query('ALTER TABLE vente_operations_temp RENAME TO vente_operations')}
 assert.equal((await etat()).stock,20);assert.equal((await etat()).ventes,0);
});
test('PostgreSQL réel : retour arriere vide teste, journal utilise protege et recu prepare pour redemarrage',async()=>{
 const ctx=JSON.parse(await readFile(process.env.M04_ISOLATED_CONTEXT,'utf8'));
 if(!ctx.rollback)throw Error('--rollback requis pour verifier la proposition de retour arriere');
 const rollback=await readFile(ctx.rollback,'utf8'),proposal=await readFile(ctx.proposal,'utf8');
 const client=await pool.connect();try{
  await assert.rejects(client.query(rollback));await client.query('ROLLBACK');
  await client.query("SET app.m04_migration_approved='yes'");await client.query(rollback);await client.query(proposal);
 }finally{client.release()}
 const p=data();const result=await service.creer(p);
 const used=await pool.connect();try{await used.query("SET app.m04_migration_approved='yes'");await assert.rejects(used.query(rollback),/Journal utilise/);await used.query('ROLLBACK')}finally{used.release()}
 await writeFile(path.join(ctx.runDir,'restart-receipt.json'),JSON.stringify({p,result,state:await etat()}));
});
