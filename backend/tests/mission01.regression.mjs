import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
// Replace only the DB boundary before imports: no dotenv, credentials or network.
registerHooks({load(url, context, next) {
  if (url.endsWith('/src/config/db.js')) return {format:'module',shortCircuit:true,source:'export default { connect() { throw new Error("Real DB forbidden"); }, query() { throw new Error("Real DB forbidden"); } };'};
  return next(url, context);
}});
const {default:pool}=await import('../src/config/db.js');
const {default:service}=await import('../src/services/MissionService.js');
const {default:repo}=await import('../src/repositories/MissionRepository.js');
const {default:day}=await import('../src/services/TerrainJourneeService.js');
const {default:dayRepo}=await import('../src/repositories/TerrainJourneeRepository.js');
const {default:trace}=await import('../src/repositories/TraceabiliteMatiereRepository.js');
const data={agent_id:'agent',tricycle_id:'velo',date_prevue:'2026-10-31',heure_depart_prevue:'10:00',heure_retour_prevue:'11:00'};
const original=Object.fromEntries(Object.getOwnPropertyNames(Object.getPrototypeOf(repo)).filter(k=>k!=="constructor").map(k=>[k,repo[k]]));
function fixture() {
  Object.assign(repo,original);
  const log=[];
  const cx={query:async q=>{log.push(q);return {rows:[]}},release:()=>log.push('RELEASE')};
  pool.connect=async()=>cx;
  repo.trouverAgentPourMiseAJour=async()=>({id:'agent',statut:'actif',disponible:true});
  repo.trouverTricyclePourMiseAJour=async()=>({id:'velo',etat:'bon',statut:'disponible'});
  repo.existeConflitAgent=async()=>false;repo.existeConflitTricycle=async()=>false;
  repo.creer=async d=>d;repo.modifier=async(id,org,d)=>d;
  repo.trouverParIdPourOrganisation=async()=>({...data,id:'mission',statut:'planifiee'});
  return {log,cx};
}
test('creation: horaires transmis aux deux controles sous transaction',async()=>{
 const {log,cx}=fixture();let n=0;
 for(const key of ['existeConflitAgent','existeConflitTricycle']) repo[key]=async(...a)=>{n++;assert.equal(a[3],cx);assert.deepEqual(a.slice(4),['10:00','11:00']);return false};
 await service.creer('org','manager',data);assert.equal(n,2);assert.deepEqual(log,['BEGIN','COMMIT','RELEASE']);
});
test('modification: fusion horaires et exclusion de soi',async()=>{
 fixture();repo.existeConflitAgent=async(...a)=>{assert.equal(a[2],'mission');assert.deepEqual(a.slice(4),['10:30','11:00']);return false};
 await service.modifier('mission','org',{heure_depart_prevue:'10:30'});
});
for(const resource of ['existeConflitAgent','existeConflitTricycle']) test('conflit '+resource+': rollback et liberation',async()=>{
 const {log}=fixture();repo[resource]=async()=>true;
 await assert.rejects(service.creer('org','manager',data),e=>e.statut===409);
 assert.deepEqual(log,['BEGIN','ROLLBACK','RELEASE']);
});
test('echec insertion: rollback, reprise possible',async()=>{
 const {log}=fixture();repo.creer=async()=>{throw Error('interruption')};
 await assert.rejects(service.creer('org','manager',data),/interruption/);assert.deepEqual(log,['BEGIN','ROLLBACK','RELEASE']);
});
test('agent etranger absent: 404 sans creation',async()=>{
 fixture();repo.trouverAgentPourMiseAJour=async()=>null;
 await assert.rejects(service.creer('org','manager',data),e=>e.statut===404);
});
test('horaires: secondes normalisees, bornes egales/inversees et valeurs malformees refusees',()=>{
 service.validerDonnees({...data,heure_depart_prevue:'10:00',heure_retour_prevue:'10:00:01'});
 for(const retour of ['10:00:00','09:59','25:00']) assert.throws(()=>service.validerDonnees({...data,heure_retour_prevue:retour}),e=>e.statut===400);
});
for(const key of ['existeConflitAgent','existeConflitTricycle']) test('SQL '+key+': intervalles stricts, horaires absents, statuts actifs, requete parametree',async()=>{
 await original[key].call(repo,'id','2026-10-31','self',{query:async(sql,args)=>{
 assert.match(sql,/heure_depart_prevue < \$5::time AND heure_retour_prevue > \$4::time/);
 assert.match(sql,/\$4::time IS NULL OR \$5::time IS NULL/);assert.match(sql,/heure_depart_prevue IS NULL OR heure_retour_prevue IS NULL/);
 assert.match(sql,/'planifiee',[\s\S]*'en_cours'/);assert.match(sql,/id <> \$3/);
 assert.deepEqual(args,['id','2026-10-31','self','10:00','11:00']);return {rows:[]};
 }},'10:00','11:00');
});
test('annuler une mission planifiee ne libere pas une autre mission active',async()=>{
 fixture();repo.modifierDisponibiliteAgent=repo.modifierStatutTricycle=async()=>assert.fail('ressource liberee');
 repo.modifierStatut=async()=>({statut:'annulee'});
 await service.modifierStatut('mission','org','annulee');
});
function dayFixture(collectes) {
 dayRepo.listerMissions=async(a,o,d)=>{assert.deepEqual([a,o,d],['agent','org','2026-10-31']);return [{id:'mission',statut:'planifiee'}]};
 dayRepo.listerCollectes=async(m,o)=>{assert.deepEqual([m,o],['mission','org']);return collectes};
 dayRepo.listerIncidentsMission=async()=>[];dayRepo.listerBalances=async()=>[];trace.listerPourTerrain=async()=>[];
}
test('mission attribuee sans association: 0 collecte et aucun depart propose',async()=>{
 dayFixture([]);const result=await day.obtenir({agent_id:'agent',organisation_id:'org'},'2026-10-31');
 assert.equal(result.resume.nombre_missions,1);assert.equal(result.resume.nombre_collectes,0);assert.equal(result.missions[0].action_suivante,'aucune');
});
test('association presente: API expose 0/1 puis 1/1 avec evenement de fin',async()=>{
 for(const done of [false,true]) {
 dayFixture([{id:'collecte',site_id:'site',evenements:done?[{type:'collecte_terminee'}]:[]}]);
 const result=await day.obtenir({agent_id:'agent',organisation_id:'org'},'2026-10-31');
 assert.equal(result.missions[0].collectes[0].id,'collecte');assert.equal(result.missions[0].progression.nombre_collectes,1);
 assert.equal(result.resume.collectes_terminees,Number(done));
 }
});
test('PWA: message de recuperation et versions du shell coherentes',()=>{
 const app=readFileSync(new URL('../../agent-app/js/app.js',import.meta.url),'utf8');assert.match(app,/Mission à préparer : aucune collecte associée/);
 const sw=readFileSync(new URL('../../agent-app/sw.js',import.meta.url),'utf8');const html=readFileSync(new URL('../../agent-app/index.html',import.meta.url),'utf8');
 assert.ok(sw.includes('app.js?v=1-21'));assert.ok(html.includes('app.js?v=1-21'));
});

test('PWA hors ligne: mission vide sans depart ni fin proposes',async()=>{
 const {runInNewContext}=await import('node:vm');
 const app=readFileSync(new URL('../../agent-app/js/app.js',import.meta.url),'utf8');
 const code=app.slice(app.indexOf('const etapeMission ='),app.indexOf('const contexteOperation ='));
 const etape=runInNewContext(code+'; etapeMission', {preuvePresente:()=>true});
 for(const statut of ['planifiee','en_cours']) assert.equal(etape({statut,collectes:[]}).action,'aucune');
 assert.equal(etape({statut:'planifiee',collectes:[{id:'c'}]}).action,'demarrer_mission');
});
test('SQL reel sous SQLite: disjoints, contigus, chevauchements, inconnus, statuts, exclusion',async()=>{
 const {DatabaseSync}=await import('node:sqlite');
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE missions(id TEXT,agent_id TEXT,tricycle_id TEXT,date_prevue TEXT,statut TEXT,heure_depart_prevue TEXT,heure_retour_prevue TEXT)');
 const cases=[
  ['08:00:00','09:00:00','planifiee','other',false],
  ['09:00:00','10:00:00','planifiee','other',false],
  ['11:00:00','12:00:00','planifiee','other',false],
  ['09:00:00','10:01:00','planifiee','other',true],
  ['10:00:00','11:00:00','en_cours','other',true],
  ['10:15:00','10:45:00','planifiee','other',true],
  [null,'09:00:00','planifiee','other',true],
  ['10:00:00',null,'planifiee','other',true],
  ['10:00:00','11:00:00','annulee','other',false],
  ['10:00:00','11:00:00','terminee','other',false],
  ['10:00:00','11:00:00','planifiee','self',false]
 ];
 try {
 for(const key of ['existeConflitAgent','existeConflitTricycle']) {
  for(const [start,end,status,id,expected] of cases) {
   db.exec('DELETE FROM missions');
   db.prepare('INSERT INTO missions VALUES (?,?,?,?,?,?,?)').run(id,'id','id','2026-10-31',status,start,end);
   const found=await original[key].call(repo,'id','2026-10-31','self',{query:async(sql,args)=>{
    // PostgreSQL casts only are removed; execute the repository WHERE predicate unchanged.
    const stmt=db.prepare(sql.replace(/::(?:time|uuid)/g,''));
    const bindings=Object.fromEntries(args.map((v,i)=>['$'+(i+1),v]));
    return {rows:stmt.all(bindings)};
   }},'10:00:00','11:00:00');
   assert.equal(found,expected,JSON.stringify({key,start,end,status,id}));
  }
 }
 } finally {db.close()}
});
