import { registerHooks } from 'node:module';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
registerHooks({load(url,context,next){
 if(url.endsWith('/src/config/db.js'))return {format:'module',shortCircuit:true,source:'export default {connect(){throw Error("Real database forbidden")},query(){throw Error("Real database forbidden")}}'};
 return next(url,context);
}});
const {default:pool}=await import('../src/config/db.js');
const {default:proof}=await import('../src/services/TerrainPreuveService.js');
const {default:repo}=await import('../src/repositories/TerrainPreuveRepository.js');
const {default:storage}=await import('../src/services/TerrainStorageService.js');
const {default:pesees}=await import('../src/repositories/PeseeRepository.js');
const {verifierEtape,verifierFinMission,verifierReplay}=await import('../src/services/TerrainParcoursService.js');
const {default:missions}=await import('../src/services/TerrainMissionService.js');
const {default:missionRepo}=await import('../src/repositories/TerrainMissionRepository.js');
const m=randomUUID(),c=randomUUID(),op=randomUUID(),user=randomUUID(),org=randomUUID(),agent=randomUUID();
const identity={organisation_id:org,agent_id:agent,utilisateur_id:user};
const instant='2026-09-22T10:00:00.000Z';
const payload={operation_id:op,type_preuve:'avant_collecte',pris_le:instant,latitude:0,longitude:0,precision_gps:1};
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xw7xWQAAAABJRU5ErkJggg==','base64');
const fichier={buffer:bytes,size:bytes.length,mimetype:'image/png'};
let log,uploaded,deleted,created,existing,cx;
beforeEach(()=>{
 log=[];uploaded=[];deleted=[];created=[];existing=null;
 cx={query:async(sql,args)=>{log.push(sql);if(sql.includes('AS debut'))return {rows:[{debut:'2026-09-22T09:00:00Z'}]};return {rows:[]}},release:()=>log.push('RELEASE')};pool.connect=async()=>cx;
 repo.trouverContexte=async(...args)=>{assert.equal(args[4],cx);assert.equal(args[5],true);return {mission_statut:'en_cours',heure_depart_reelle:'2026-09-22T08:00:00Z'}};
 repo.trouverParOperation=async(id,o,connection)=>{assert.equal(connection,cx);return existing};
 repo.creer=async(data,connection)=>{assert.equal(connection,cx);created.push(data);return {id:randomUUID(),...data}};
 storage.envoyerFichier=async data=>uploaded.push(data);storage.supprimerFichier=async p=>deleted.push(p);
 pesees.trouverParOperation=async()=>({mission_id:m,collecte_id:c,utilisateur_id:user,type:'terrain'});
 pesees.lierPreuveParOperation=async(...args)=>{assert.equal(args[6],cx);return {id:'p'}};
});
test('preuve : transaction et verrou opération+mission, chemin immuable incluant SHA256',async()=>{
 const result=await proof.enregistrer(m,c,identity,payload,fichier);
 assert.equal(result.deja_traitee,false);assert.equal(created.length,1);assert.equal(deleted.length,0);
 assert.ok(log.some(sql=>sql.includes('pg_advisory_xact_lock')));assert.deepEqual(log.slice(-2),['COMMIT','RELEASE']);
 assert.ok(uploaded[0].chemin.includes(createHash('sha256').update(bytes).digest('hex')));
});
test('réponse perdue : replay strict de preuve, aucun nouvel upload',async()=>{
 existing={id:randomUUID(),mission_id:m,collecte_id:c,cree_par:user,type_preuve:'avant_collecte',hash_sha256:createHash('sha256').update(bytes).digest('hex'),pris_le:instant,latitude:0,longitude:0,precision_gps:1};
 const result=await proof.enregistrer(m,c,identity,payload,fichier);assert.equal(result.deja_traitee,true);assert.equal(uploaded.length,0);
 for(const change of [{latitude:1},{pris_le:'2026-09-22T10:01:00Z'}])await assert.rejects(proof.enregistrer(m,c,identity,{...payload,...change},fichier),e=>e.statut===409);
 existing.hash_sha256='different';await assert.rejects(proof.enregistrer(m,c,identity,payload,fichier),e=>e.statut===409);
});
test('preuve : défaut association ticket/pesée ne supprime jamais le fichier',async()=>{
 pesees.lierPreuveParOperation=async()=>{throw Error('link interrupted')};
 await assert.rejects(proof.enregistrer(m,c,identity,{...payload,type_preuve:'ticket_balance',pesee_operation_id:randomUUID()},fichier),/link interrupted/);
 assert.equal(uploaded.length,1);assert.equal(deleted.length,0);assert.deepEqual(log.slice(-2),['ROLLBACK','RELEASE']);
});
test('preuve : commit incertain ne déclenche pas de suppression Storage',async()=>{
 const query=cx.query;cx.query=async(sql,args)=>{if(sql==='COMMIT')throw Error('connection lost');return query(sql,args)};
 await assert.rejects(proof.enregistrer(m,c,identity,payload,fichier),/connection lost/);assert.equal(deleted.length,0);
});
test('preuve orpheline connue au retry : réutilise le chemin immuable sans écrasement',async()=>{
 storage.envoyerFichier=async data=>{uploaded.push(data);throw Object.assign(Error('duplicate'),{code:'STORAGE_DUPLICATE'})};
 const result=await proof.enregistrer(m,c,identity,payload,fichier);assert.equal(result.deja_traitee,false);assert.equal(created.length,1);assert.equal(deleted.length,0);
});
test('échec Storage inconnu : rollback sans fausse preuve créée',async()=>{
 storage.envoyerFichier=async()=>{throw Error('storage down')};await assert.rejects(proof.enregistrer(m,c,identity,payload,fichier),/storage down/);assert.equal(created.length,0);assert.equal(deleted.length,0);
});
test('preuve : autre Agent/organisation, contexte absent → 404 sans upload',async()=>{
 repo.trouverContexte=async()=>null;await assert.rejects(proof.enregistrer(m,c,identity,payload,fichier),e=>e.statut===404);assert.equal(uploaded.length,0);
});
test('URL de lecture preuve reste autorisée par le contexte et sans variable connexion hors portée',async()=>{
 repo.trouverPourAgent=async(...args)=>{assert.deepEqual(args,[op,m,c,agent,org]);return {id:op,storage_path:'path'}};
 storage.creerUrlSignee=async()=>({url:'local-test'});await proof.obtenirUrl(m,c,op,identity);
});
for(const action of ['avant_collecte','enregistrer_pesee','terminer_collecte','apres_collecte']) test('ordre serveur '+action+': étapes absentes ou futures refusées',async()=>{
 for(const row of [{},{debut:'2026-09-22T11:00:00Z',avant:'2026-09-22T11:00:00Z',pesee:'2026-09-22T11:00:00Z',fin:'2026-09-22T11:00:00Z'}])
  await assert.rejects(verifierEtape({query:async()=>({rows:[row]})},m,c,action,instant),e=>e.statut===409);
});
test('ordre serveur : parcours normal, pesée après fin interdite',async()=>{
 const row={debut:'2026-09-22T08:00:00Z',avant:'2026-09-22T09:00:00Z',pesee:'2026-09-22T09:30:00Z'};
 for(const action of ['avant_collecte','enregistrer_pesee','terminer_collecte']) await verifierEtape({query:async()=>({rows:[row]})},m,c,action,instant);
 row.fin='2026-09-22T09:45:00Z';await verifierEtape({query:async()=>({rows:[row]})},m,c,'apres_collecte',instant);
 await assert.rejects(verifierEtape({query:async()=>({rows:[row]})},m,c,'enregistrer_pesee',instant),e=>e.statut===409);
});
test('fin mission : preuves/pesées incomplètes refusées, parcours complet accepté',async()=>{
 await assert.rejects(verifierFinMission({query:async()=>({rows:[{incompletes:1}]})},m,instant),e=>e.statut===409);
 await verifierFinMission({query:async(sql,args)=>{assert.match(sql,/apres_collecte/);assert.match(sql,/avant_collecte/);assert.match(sql,/date_heure <= \$2/);assert.deepEqual(args,[m,instant]);return {rows:[{incompletes:0}]}}},m,instant);
});
test('replay événement : GPS, date, poids, motif et résultat sont immuables',()=>{
 const p={survenu_le:instant,latitude:0,longitude:0,precision_gps:1,resultat_terrain:'collectee',poids_reel:10,motif_terrain:null};
 const e={...p,contexte:{resultat_terrain:'collectee',poids_reel_kg:10,motif_terrain:null}};verifierReplay(e,p);
 for(const change of [{latitude:1},{survenu_le:'2026-09-22T10:01:00Z'},{poids_reel:12},{motif_terrain:'changed'},{resultat_terrain:'partielle'}])assert.throws(()=>verifierReplay(e,{...p,...change}),error=>error.statut===409);
});
test('démarrage mission : UUID d’un autre type événement ne vaut pas succès idempotent',async()=>{
 const p={operation_id:op,survenu_le:instant,latitude:0,longitude:0,precision_gps:1};
 missionRepo.trouverMissionPourDemarrage=async()=>({id:m});missionRepo.trouverOperation=async()=>({...p,mission_id:m,cree_par:user,type_evenement:'incident_signale'});
 await assert.rejects(missions.demarrer(m,identity,p),e=>e.statut===409);
});

const {default:weightService}=await import('../src/services/PeseeService.js');
const {default:traceRepo}=await import('../src/repositories/TraceabiliteMatiereRepository.js');
test('pesée réelle du service : preuve avant obligatoire avant insertion',async()=>{
 const balance=randomUUID();pesees.trouverParOperation=async()=>null;
 pesees.trouverContexte=async()=>({mission_statut:'en_cours',agent_id:agent,collecte_demarree_le:'2026-09-22T08:00:00Z'});
 pesees.trouverBalance=async()=>({id:balance,statut:'active',capacite_max_kg:100,precision_kg:1,site_id:null,tricycle_id:null});
 traceRepo.trouverUnitesParCodes=async()=>[];let inserts=0;pesees.creer=async()=>{inserts++};
 await assert.rejects(weightService.enregistrer(m,c,identity,{operation_id:op,balance_id:balance,poids_brut:12,tare:2,date_heure:instant,latitude:0,longitude:0,precision_gps:1}),e=>e.statut===409);
 assert.equal(inserts,0);assert.deepEqual(log.slice(-2),['ROLLBACK','RELEASE']);
});
test('pesée réelle du service : parcours valide insère puis confirme la transaction',async()=>{
 const balance=randomUUID();pesees.trouverParOperation=async()=>null;
 pesees.trouverContexte=async()=>({mission_statut:'en_cours',agent_id:agent,collecte_demarree_le:'2026-09-22T08:00:00Z'});
 pesees.trouverBalance=async()=>({id:balance,statut:'active',capacite_max_kg:100,precision_kg:1,site_id:null,tricycle_id:null});
 traceRepo.trouverUnitesParCodes=async()=>[];pesees.trouverDerniere=async()=>null;
 pesees.creer=async data=>({id:randomUUID(),...data});pesees.mettreAJourPoidsCompatible=async()=>{};
 const query=cx.query;cx.query=async(sql,args)=>sql.includes('AS debut')?{rows:[{debut:'2026-09-22T08:00:00Z',avant:'2026-09-22T09:00:00Z'}]}:query(sql,args);
 const result=await weightService.enregistrer(m,c,identity,{operation_id:op,balance_id:balance,poids_brut:12,tare:2,date_heure:instant,latitude:0,longitude:0,precision_gps:1});
 assert.equal(result.pesee.poids_net,10);assert.deepEqual(log.slice(-2),['COMMIT','RELEASE']);
});
test('replay pesée : GPS altéré refusé avant toute nouvelle insertion',async()=>{
 const balance=randomUUID();pesees.trouverParOperation=async()=>({mission_id:m,collecte_id:c,utilisateur_id:user,type:'terrain',balance_id:balance,poids_brut:12,tare:2,date_heure:instant,latitude:0,longitude:0,precision_gps:1});
 traceRepo.listerCodesPesee=async()=>[];
 await assert.rejects(weightService.enregistrer(m,c,identity,{operation_id:op,balance_id:balance,poids_brut:12,tare:2,date_heure:instant,latitude:1,longitude:0,precision_gps:1}),e=>e.statut===409);
});

test('ticket : liaison déjà occupée ne peut pas être acquittée comme succès',async()=>{
 pesees.lierPreuveParOperation=async()=>null;
 await assert.rejects(proof.enregistrer(m,c,identity,{...payload,type_preuve:'ticket_balance',pesee_operation_id:randomUUID()},fichier),e=>e.statut===409);
 assert.equal(deleted.length,0);assert.deepEqual(log.slice(-2),['ROLLBACK','RELEASE']);
});
