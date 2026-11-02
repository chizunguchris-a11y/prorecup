import './mission03.setup.mjs';
import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const {default:pool}=await import('../src/config/db.js');
const {default:service}=await import('../src/services/PeseeService.js');
const {default:repository}=await import('../src/repositories/PeseeRepository.js');
const {default:trace}=await import('../src/repositories/TraceabiliteMatiereRepository.js');
const org=randomUUID(),agent=randomUUID(),user=randomUUID(),m=randomUUID(),c=randomUUID(),balance=randomUUID(),mat=randomUUID();
const p={operation_id:randomUUID(),balance_id:balance,poids_brut:12,tare:2,date_heure:'2026-09-22T10:00:00Z',latitude:0,longitude:0,precision_gps:1,codes_qr:['PR-C-ABCDEF']};
const identity={organisation_id:org,agent_id:agent,utilisateur_id:user};let unit,writes;
beforeEach(()=>{
 writes=0;pool.connect=async()=>({query:async()=>({rows:[]}),release(){}});
 repository.trouverParOperation=async()=>null;repository.trouverContexte=async()=>({agent_id:agent,mission_statut:'en_cours',type_dechet_id:mat,collecte_demarree_le:'2026-09-22T08:00:00Z'});
 repository.trouverBalance=async()=>({id:balance,statut:'active',capacite_max_kg:100,precision_kg:1});
 unit={id:randomUUID(),nature:'contenant',type_dechet_id:mat,statut:'en_collecte',collecte_origine_id:c};
 trace.trouverUnitesParCodes=async()=>[unit];trace.lotDirectPourCollecte=async()=>false;
 repository.creer=async()=>{writes++;throw Error('unexpected write')};
});
for(const kind of ['autre collecte','déjà dans lot','QR lot','déjà stockée','autre matière'])test('pesée refuse une provenance incompatible : '+kind,async()=>{
 let type='terrain';if(kind==='autre collecte')unit.collecte_origine_id=randomUUID();
 if(kind==='déjà dans lot'){unit.statut='dans_lot';type='depot'}
 if(kind==='QR lot')unit.nature='lot';if(kind==='déjà stockée')trace.lotDirectPourCollecte=async()=>true;
 if(kind==='autre matière')unit.type_dechet_id=randomUUID();
 await assert.rejects(service.enregistrer(m,c,identity,p,type),e=>e.statut===409);assert.equal(writes,0);
});
test('replay de pesée confirmé reste possible après regroupement : aucun nouveau QR ni mouvement',async()=>{
 repository.trouverParOperation=async()=>({id:randomUUID(),...p,mission_id:m,collecte_id:c,utilisateur_id:user,type:'terrain'});
 trace.listerCodesPesee=async()=>p.codes_qr;trace.trouverUnitesParCodes=async()=>assert.fail('Revalidation d’un événement déjà confirmé');
 const result=await service.enregistrer(m,c,identity,p);assert.equal(result.deja_traitee,true);assert.equal(writes,0);
});
test('SQL exécuté : pesée collective ne conserve pas des poids individuels périmés',async()=>{
 const db=new DatabaseSync(':memory:');try{
 db.exec(`CREATE TABLE contenants(id TEXT,organisation_id TEXT,statut TEXT,collecte_origine_id TEXT,site_courant_id TEXT,client_courant_id TEXT,type_dechet_id TEXT,poids_courant_kg REAL,modifie_le TEXT);
 CREATE TABLE pesees(id TEXT,organisation_id TEXT,type TEXT,date_heure TEXT);
 CREATE TABLE pesees_unites(pesee_id TEXT,contenant_id TEXT,lot_id TEXT);`);
 const a=randomUUID(),b=randomUUID(),weigh=randomUUID();
 for(const id of [a,b])db.prepare('INSERT INTO contenants VALUES (?,?,?,?,?,?,?,?,?)').run(id,org,'en_collecte',c,null,null,mat,99,null);
 db.prepare('INSERT INTO pesees VALUES (?,?,?,?)').run(weigh,org,'depot',p.date_heure);
 const cx={query:async(sql,args)=>{
  if(sql.includes('tracabilite_matiere_evenements'))return {rows:[]};
  const stmt=db.prepare(sql.replace(/::(?:text|uuid|timestamptz|integer|numeric)/g,''));const result=stmt.run(Object.fromEntries(args.map((v,i)=>['$'+(i+1),v ?? null])));return {rows:[],rowCount:result.changes};
 }};
 await trace.lierPesee(weigh,[{id:a,nature:'contenant'},{id:b,nature:'contenant'}],{organisation_id:org,utilisateur_id:user,operation_id:randomUUID(),collecte_id:c,mission_id:m,type_dechet_id:mat,survenu_le:p.date_heure,poids_net:20,nombre_unites:2,type:'depot'},cx);
 assert.deepEqual(db.prepare('SELECT poids_courant_kg FROM contenants').all().map(row=>row.poids_courant_kg),[null,null]);
 }finally{db.close()}
});
