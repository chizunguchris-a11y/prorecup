import './mission03.setup.mjs';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const {default:pool}=await import('../src/config/db.js');
const {default:lots}=await import('../src/services/LotService.js');
const {default:qr}=await import('../src/services/TraceabiliteMatiereService.js');
const {default:stock}=await import('../src/services/StockService.js');
const {default:repo}=await import('../src/repositories/TraceabiliteMatiereRepository.js');
const {default:lotRepo}=await import('../src/repositories/LotRepository.js');
const {default:collecteRepo}=await import('../src/repositories/CollecteRepository.js');
const {default:stockRepo}=await import('../src/repositories/StockRepository.js');
const {default:movRepo}=await import('../src/repositories/MouvementStockRepository.js');
const {default:ventes}=await import('../src/services/VenteService.js');
const {kilos}=await import('../src/services/TracabiliteRules.js');
const org=randomUUID(),user=randomUUID(),c=randomUUID(),site=randomUUID(),mat=randomUUID(),lid=randomUUID(),cont=randomUUID();
let log,entries,origin,units,duplicate,measure,existingLot;
const data={organisation_id:org,utilisateur_id:user,collecte_id:c,type_dechet_id:mat,poids_reel:20};
const operation=randomUUID();const group={operation_id:operation,site_id:site,codes_qr:['PR-C-ABCDEF'],poids_reel:20,code_qr:'PR-L-ABCDEF'};
beforeEach(()=>{
 log=[];entries=[];duplicate=false;existingLot=null;
 origin={id:c,organisation_id:org,statut:'valide',poids_reel:20,type_dechet_id:mat,site_id:site,client_id:randomUUID(),deja_loti_kg:0,lot_direct:false,parcours_present:true,parcours_complet:true};
 units=[{id:cont,nature:'contenant',code_qr:'PR-C-ABCDEF',statut:'recu_depot',site_courant_id:site,type_dechet_id:mat,poids_courant:20,tare_kg:null,collecte_origine_id:c}];
 measure=[{id:cont,collecte_id:c,poids_net:20,tare:1,date_heure:'2026-09-22T08:00:00Z'}];
 pool.connect=async()=>({query:async(sql,args)=>{log.push(sql);return {rows:[]}},release:()=>log.push('RELEASE')});
 collecteRepo.trouverParIdPourOrganisation=async(id,o,connection,lock)=>{assert.equal(o,org);assert.equal(lock,true);return origin};
 lotRepo.trouverParCollecteId=async()=>existingLot;lotRepo.creer=async d=>({id:lid,...d});
 stockRepo.trouverParTypeDechet=async()=>({id:'stock',quantite:20});
 repo.contenantsPourCollecte=async()=>duplicate;repo.originesPourMiseAJour=async()=>[origin];
 repo.creerEvenement=async()=>{};repo.trouverLotParOperation=async()=>null;
 repo.verifierReferences=async()=>({site_ok:true,client_ok:true,type_ok:true,site_client_ok:true});
 repo.trouverUnitesParCodes=async()=>units;repo.mesuresContenants=async()=>measure;
 repo.regrouperLot=async d=>({id:lid,operation_id:operation,...d,quantite_restante_kg:d.poids_reel});
 stock.ajouterAuStock=async(...a)=>{entries.push(a);return {id:'stock',quantite:20,tracabilite_lots_active:true}};
 repo.trouverContenantParCode=async()=>null;
 repo.creerContenant=async d=>({id:cont,...d});
});
for(const invalid of [NaN,Infinity,-1,0,0.0001,'','NaN','Infinity',true,1e9,1.1234])test('quantité non comptabilisable rejetée : '+String(invalid),()=>assert.throws(()=>kilos(invalid),e=>e.statut===400));
test('grammes exacts : 0,001 kg et trois décimales acceptés',()=>{assert.equal(kilos('0.001'),0.001);assert.equal(kilos(12.123),12.123)});
test('lot direct : source verrouillée, quantité validée, une entrée stock',async()=>{
 const result=await lots.creer(data);assert.equal(result.lot.poids_reel,20);assert.equal(entries.length,1);assert.deepEqual(log,['BEGIN','COMMIT','RELEASE']);
});
test('lot direct : poids différent, origine QR, parcours incomplet ou tenant étranger refusés',async()=>{
 origin.poids_reel=19;await assert.rejects(lots.creer(data),e=>e.statut===409);origin.poids_reel=20;
 duplicate=true;await assert.rejects(lots.creer(data),e=>e.statut===409);duplicate=false;
 origin.parcours_complet=false;await assert.rejects(lots.creer(data),e=>e.statut===409);origin.parcours_complet=true;
 collecteRepo.trouverParIdPourOrganisation=async()=>null;await assert.rejects(lots.creer(data),e=>e.statut===404);assert.equal(entries.length,0);
});
test('lot direct : perte de réponse rejoue le même lot sans seconde entrée',async()=>{
 existingLot={id:lid,...data};const result=await lots.creer(data);assert.equal(result.deja_traitee,true);assert.equal(result.lot.id,lid);assert.equal(entries.length,0);
 await assert.rejects(lots.creer({...data,poids_reel:21}),e=>e.statut===409);
});
test('regroupement : masse = somme, tare = pesées documentées, origine verrouillée avant contenants',async()=>{
 const order=[];repo.originesPourMiseAJour=async()=>{order.push('origine');return [origin]};repo.trouverUnitesParCodes=async(o,codes,cx,lock)=>{if(lock)order.push('contenants');return units};
 const result=await qr.regrouper(org,user,group);assert.deepEqual(order,['origine','contenants']);assert.equal(result.tare_kg,1);assert.equal(result.poids_reel,20);assert.equal(entries.length,1);
});
for(const which of ['origine absente','matière absente','poids inconnu','mesure collective','mesure incohérente','poids libre','source déjà lotie','dépassement source','mission incomplète'])test('regroupement refusé : '+which,async()=>{
 let request={...group};
 if(which==='origine absente')units[0].collecte_origine_id=null;
 if(which==='matière absente')units[0].type_dechet_id=null;
 if(which==='poids inconnu')units[0].poids_courant=null;
 if(which==='mesure collective')measure=[];
 if(which==='mesure incohérente')measure[0].poids_net=19;
 if(which==='poids libre')request.poids_reel=100;
 if(which==='source déjà lotie')origin.lot_direct=true;
 if(which==='dépassement source')origin.deja_loti_kg=1;
 if(which==='mission incomplète')origin.parcours_complet=false;
 await assert.rejects(qr.regrouper(org,user,request),e=>e.statut===409);assert.equal(entries.length,0);assert.ok(log.includes('ROLLBACK'));
});
test('regroupement : unités modifiées sous concurrence détectées après verrou',async()=>{
 repo.trouverUnitesParCodes=async(o,codes,cx,lock)=>lock?[{...units[0],statut:'dans_lot'}]:units;
 await assert.rejects(qr.regrouper(org,user,group),e=>e.statut===409);assert.equal(entries.length,0);
});
test('regroupement : UUID rejoué vérifie auteur, paramètres et instant sans recréer',async()=>{
 const date='2026-09-22T10:00:00Z';repo.trouverLotParOperation=async()=>({id:lid,site_courant_id:site,codes_contenants:['PR-C-ABCDEF'],poids_reel:20,code_qr:'PR-L-ABCDEF',createur_id:user,date_regroupement:date});
 await qr.regrouper(org,user,{...group,survenu_le:date});assert.equal(entries.length,0);
 for(const change of [{poids_reel:21},{site_id:randomUUID()},{survenu_le:'2026-09-22T10:01:00Z'}])await assert.rejects(qr.regrouper(org,user,{...group,...change}),e=>e.statut===409);
 await assert.rejects(qr.regrouper(org,randomUUID(),group),e=>e.statut===409);
});
test('stock legacy : un regroupement garde le reste indéterminé',async()=>{
 stock.ajouterAuStock=async()=>({tracabilite_lots_active:false});const result=await qr.regrouper(org,user,group);assert.equal(result.quantite_restante_kg,null);
});
test('création contenant : QR stable et replay cohérent sans second objet',async()=>{
 const request={type_contenant:'sac',code_qr:'PR-C-ABCDEF',tare_kg:1};repo.trouverContenantParCode=async()=>({id:cont,...request});
 const result=await qr.creerContenant(org,user,request);assert.equal(result.id,cont);
 await assert.rejects(qr.creerContenant(org,user,{...request,tare_kg:2}),e=>e.statut===409);
});
test('création contenant : site/client incompatibles refusés',async()=>{
 repo.verifierReferences=async()=>({site_ok:true,client_ok:true,type_ok:true,site_client_ok:false});
 await assert.rejects(qr.creerContenant(org,user,{type_contenant:'bac',site_courant_id:site,client_courant_id:c}),e=>e.statut===409);
});
test('QR : encodage SVG réel, préfixes distincts, format sûr et absence de QR étranger',async()=>{
 const seen=new Set();for(let i=0;i<100;i++)seen.add(qr.normaliserCode(null,'lot'));assert.equal(seen.size,100);
 assert.throws(()=>qr.normaliserCode('<script>','lot'),e=>e.statut===400);
 repo.historique=async(o,code)=>o===org?[{nature:'lot',id:lid,code_qr:code,quantite_restante_kg:null}]:[];
 repo.listerContenantsLot=async()=>[];const {default:venteLot}=await import('../src/repositories/VenteLotRepository.js');venteLot.listerParLot=async()=>[];
 const result=await qr.etiquette(org,'PR-L-ABCDEF');assert.match(result.svg,/<svg/);assert.doesNotMatch(result.svg,/script|onerror/);
 await assert.rejects(qr.etiquette(randomUUID(),'PR-L-ABCDEF'),e=>e.statut===404);
});
test('vente : prix non fini et quantité infinitésimale refusés avant toute écriture',async()=>{
 for(const change of [{prix_unitaire:NaN},{prix_unitaire:Infinity},{quantite:0.0001},{quantite:Infinity}])await assert.rejects(ventes.creer({organisation_id:org,stock_id:lid,quantite:1,prix_unitaire:1,acheteur_nom:'test',...change}),e=>e.statut===400);
 assert.equal(log.length,0);
});

test('regroupement : deux reprises simultanées, verrou simulé, une seule entrée stock',async()=>{
 let tail=Promise.resolve(),stored=null;
 pool.connect=async()=>{let unlock;return {query:async sql=>{
  if(sql.includes('pg_advisory_xact_lock')){const previous=tail;tail=new Promise(resolve=>unlock=resolve);await previous}
  return {rows:[]};
 },release:()=>unlock?.()}};
 repo.trouverLotParOperation=async()=>stored;
 repo.regrouperLot=async d=>{await new Promise(resolve=>setTimeout(resolve,10));stored={id:lid,...d,site_courant_id:site,codes_contenants:group.codes_qr,createur_id:user,date_regroupement:d.survenu_le};return stored};
 const result=await Promise.all([qr.regrouper(org,user,group),qr.regrouper(org,user,group)]);
 assert.equal(result[0].id,result[1].id);assert.equal(entries.length,1);
});
test('regroupement : panne écriture stock après filiation → rollback et libération',async()=>{
 stock.ajouterAuStock=async()=>{throw Error('interruption simulée')};
 await assert.rejects(qr.regrouper(org,user,group),/interruption simulée/);
 assert.equal(log.at(-1),'RELEASE');assert.ok(log.includes('ROLLBACK'));assert.ok(!log.includes('COMMIT'));
});

test('impact : facteur non fini refusé, aucun CO2e inventé ni enregistré',async()=>{
 const {default:impact}=await import('../src/services/ImpactCarboneService.js');
 const {default:factor}=await import('../src/repositories/FacteurCarboneRepository.js');
 const {default:impactRepo}=await import('../src/repositories/ImpactCarboneRepository.js');
 impactRepo.trouverParVenteId=async()=>null;factor.trouverFacteurApplicable=async()=>({id:'f',facteur_kg_co2e_par_kg:'NaN'});
 let count=0;impactRepo.creer=async()=>count++;
 await assert.rejects(impact.calculerPourVente({id:'vente',quantite:20},mat,{}),e=>e.statut===409);assert.equal(count,0);
});

test('regroupement : filiation historique incohérente suspendue sans inventer de quantité',async()=>{
 origin.provenance_non_reconciliee=true;
 await assert.rejects(qr.regrouper(org,user,group),e=>e.statut===409);assert.equal(entries.length,0);
});
