import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.TERRAIN_PLAYWRIGHT_PACKAGE || 'playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
let browser, server, origin;
before(async () => {
 browser = await chromium.launch({headless:true, ...(process.env.TERRAIN_BROWSER_EXECUTABLE ? {executablePath:process.env.TERRAIN_BROWSER_EXECUTABLE}: {})});
 server = createServer((req,res)=>{
  if (req.url === '/offline.js' || req.url === '/api.js') {
   res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(readFileSync(path.join(root,'agent-app/js',req.url.slice(1))));
  } else {res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><script>window.ProRecup={config:{API_BASE_URL:"/api",TOKEN_KEY:"test-token"}}</script><script src="/offline.js"></script><script src="/api.js"></script>');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
});
after(async()=>{await browser?.close();if(server) await new Promise(resolve=>server.close(resolve));});
async function pageFixture() {
 const context=await browser.newContext();const page=await context.newPage();
 await context.route('**/*',route=>route.request().url().startsWith(origin) ? route.continue() : route.abort());
 await page.goto(origin);
 await page.evaluate(async()=>{
  window.O=ProRecup.offline;window.m=crypto.randomUUID();window.c=crypto.randomUUID();window.b=crypto.randomUUID();
  window.ctx=action=>({action,mission:m,collecte:action.includes('mission')?null:c});
  window.payload=()=>({operation_id:crypto.randomUUID(),survenu_le:new Date().toISOString(),pris_le:new Date().toISOString(),latitude:0,longitude:0,precision_gps:2,balance_id:b,poids_brut:12,tare:2,resultat_terrain:'collectee',poids_reel:10});
  window.day={date:'2026-10-31',missions:[{id:m,statut:'planifiee',collectes:[{id:c,site:{},progression:{},preuves:[],pesees:[]}]}]};
  window.store=await O.open('mission02');await store.saveDay(day);
 });return {page,context};
}
async function check(fn){const {page,context}=await pageFixture();try{return await fn(page,context);}finally{await context.close();}}
test('refus 400 : aucune suppression, pas de boucle, reprise UUID et photos identiques',async()=>check(async page=>{
 const result=await page.evaluate(async()=>{
  await store.enqueue(ctx('demarrer_mission'),payload());await store.enqueue(ctx('avant_collecte'),payload(),new Blob(['preuve'],{type:'image/jpeg'}));
  const before=await store.list();let calls=0;const api={post:async()=>{calls++;throw {status:400}}};
  await store.sync(api,()=>true);await store.sync(api,()=>true);
  let denied=false;try{await store.discardRejected()}catch{denied=true}
  const retained=await store.list();if (!denied || retained.length !== before.length) throw Error('La récupération a supprimé des actions ou des preuves.');await store.retryRejected(retained[0].id);
  const sent=[];await store.sync({post:async(u,p)=>sent.push(p instanceof FormData?p.get('operation_id'):p.operation_id)},()=>true);
  return {calls,denied,ids:before.map(r=>r.operation_id),sent,bytes:await retained[1].blob.text(),left:(await store.list()).length};
 });assert.equal(result.calls,1);assert.equal(result.denied,true);assert.deepEqual(result.sent,result.ids);assert.equal(result.bytes,'preuve');assert.equal(result.left,0);
}));
for(const status of [401,403,429,500])test('HTTP '+status+' conserve GPS, instant, UUID, photos et bloque la suite',async()=>check(async page=>{
 const result=await page.evaluate(async status=>{
  const p=payload();await store.enqueue(ctx('avant_collecte'),p,new Blob(['original'],{type:'image/jpeg'}));await store.enqueue(ctx('terminer_mission'),payload());
  const res=await store.sync({post:async()=>{throw {status}}},()=>true);const rows=await store.list();
  return {res,rows:rows.map(r=>({payload:r.payload,statut:r.statut,error:r.last_error})),p,blob:await rows[0].blob.text()};
 },status);assert.equal(result.rows.length,2);assert.equal(result.rows[0].payload.operation_id,result.p.operation_id);assert.equal(result.rows[0].payload.latitude,0);assert.equal(result.blob,'original');
 assert.equal(result.res.stopped,status===401?'auth':status===403?'erreur':'backoff');
}));
test('succès serveur puis réponse perdue : même opération après navigation, aucun double effet',async()=>check(async(page)=>{
 const first=await page.evaluate(async()=>{
  await store.enqueue(ctx('avant_collecte'),payload(),new Blob(['durable'],{type:'image/jpeg'}));
  const id=(await store.list())[0].operation_id;
  await store.sync({post:async()=>{throw {code:'NETWORK_ERROR'}}},()=>true);return id;
 });await page.reload();
 const res=await page.evaluate(async()=>{
  const store=await ProRecup.offline.open('mission02');const rows=await store.list();let sent;
  await store.sync({post:async(u,body)=>{sent=body.get('operation_id')}},()=>true,()=>{},{forceBackoff:true});
  return {id:rows[0].operation_id,bytes:await rows[0].blob.text(),sent,left:(await store.list()).length};
 });assert.equal(res.id,first);assert.equal(res.sent,first);assert.equal(res.bytes,'durable');assert.equal(res.left,0);
}));
test('deux pages : ni remise à zéro d’un envoi actif ni vol du verrou ni double POST',async()=>check(async(page,context)=>{
 await page.evaluate(async()=>{
  await store.enqueue(ctx('demarrer_mission'),payload());window.posts=0;
  window.syncing=store.sync({post:async()=>{posts++;await new Promise(resolve=>window.releasePost=resolve)}},()=>true);
 });await page.waitForFunction(()=>typeof window.releasePost==='function');
 const other=await context.newPage();await other.goto(origin);
 const current=await other.evaluate(async()=>{window.s=await ProRecup.offline.open('mission02');window.calls=0;window.work=s.sync({post:async()=>{calls++}},()=>true);return (await s.list())[0].statut});
 assert.equal(current,'envoi');await page.evaluate(async()=>{releasePost();await syncing});
 const calls=await other.evaluate(async()=>{await work;return calls});assert.equal(calls,0);assert.equal(await page.evaluate(()=>posts),1);
}));
test('fin forcée de page pendant POST : verrou libéré et reprise de la même opération',async()=>check(async(page,context)=>{
 const id=await page.evaluate(async()=>{await store.enqueue(ctx('demarrer_mission'),payload());store.sync({post:async()=>new Promise(()=>{})},()=>true);return (await store.list())[0].operation_id});
 await page.waitForFunction(async()=> (await store.list())[0].post_initiated);await page.close();
 const second=await context.newPage();await second.goto(origin);
 const result=await second.evaluate(async()=>{const s=await ProRecup.offline.open('mission02');let id;await s.sync({post:async(u,p)=>{id=p.operation_id}},()=>true);return {id,left:(await s.list()).length}});
 assert.equal(result.id,id);assert.equal(result.left,0);
}));
test('pesées corrigées et tickets distincts conservés, doublon UUID incident neutralisé',async()=>check(async page=>{
 const res=await page.evaluate(async()=>{
  const a=payload(),b=payload();await store.enqueue(ctx('enregistrer_pesee'),a);await store.enqueue(ctx('enregistrer_pesee'),b);
  const incident={...payload(),categorie:'autre',gravite:'faible',description:'incident test',bloquant:false};
  await store.enqueue(ctx('signaler_incident'),incident);await store.enqueue(ctx('signaler_incident'),incident);
  const rows=await store.list();let conflict=false;try{await store.enqueue(ctx('enregistrer_pesee'),{...a,poids_brut:99})}catch{conflict=true}
  return {count:rows.length,weights:(await store.view()).missions[0].collectes[0].pesees.length,conflict};
 });assert.deepEqual(res,{count:3,weights:2,conflict:true});
}));
test('transaction batch avortée : aucun enregistrement partiel ni suppression du brouillon',async()=>check(async page=>{
 const res=await page.evaluate(async()=>{
  const context=ctx('enregistrer_pesee');await store.saveDraft(context,{fields:{poids_brut:'12',secret:'interdit'}},new Blob(['ticket'],{type:'image/jpeg'}));
  const p=payload();let failed=false;try{await store.enqueueBatch([{context,payload:p},{context,payload:{...p,poids_brut:13}}])}catch{failed=true}
  const draft=await store.getDraft(context);return {failed,count:(await store.list()).length,draft:draft.fields,bytes:await draft.blob.text()};
 });assert.equal(res.failed,true);assert.equal(res.count,0);assert.deepEqual(res.draft,{poids_brut:'12'});assert.equal(res.bytes,'ticket');
}));
test('brouillon photo/pesée durable après navigation, retiré atomiquement lors de la mise en file',async()=>check(async(page)=>{
 const context=await page.evaluate(async()=>{const context=ctx('avant_collecte');await store.saveDraft(context,{fields:{pris_le:'2026-10-31T10:00'},pris_le:'2026-10-31T09:00:00Z'},new Blob(['photo-draft'],{type:'image/jpeg'}));return context});
 await page.reload();const res=await page.evaluate(async context=>{
  const s=await ProRecup.offline.open('mission02');const d=await s.getDraft(context);
  await s.enqueue(context,{operation_id:crypto.randomUUID(),pris_le:d.pris_le,latitude:0,longitude:0,precision_gps:1},d.blob);
  return {bytes:await d.blob.text(),date:d.pris_le,draft:!!await s.getDraft(context),rows:(await s.list()).length};
 },context);assert.deepEqual(res,{bytes:'photo-draft',date:'2026-10-31T09:00:00Z',draft:false,rows:1});
}));
test('remplacement photo illisible : nouvel horodatage/GPS, archive de l’original ; envoi incertain interdit',async()=>check(async page=>{
 const res=await page.evaluate(async()=>{
  await store.enqueue(ctx('avant_collecte'),payload(),new Blob(['original'],{type:'image/jpeg'}));
  const base=Blob.prototype.arrayBuffer;Blob.prototype.arrayBuffer=async()=>{throw Error('unreadable')};
  try{await store.sync({post:async()=>{throw Error('should not send')}},()=>true)}finally{Blob.prototype.arrayBuffer=base}
  const blocked=(await store.view()).missions[0].bloquee;
  const replacement=await store.replaceUnreadablePhoto(new Blob(['new'],{type:'image/jpeg'}),new Date().toISOString(),{latitude:1,longitude:2,precision_gps:3});
  Blob.prototype.arrayBuffer=async()=>{throw Error('second unreadable')};
  try{await store.sync({post:async()=>{}},()=>true)}finally{Blob.prototype.arrayBuffer=base}
  await store.replaceUnreadablePhoto(new Blob(['new2'],{type:'image/jpeg'}),new Date().toISOString(),{latitude:1,longitude:2,precision_gps:3});
  const db=await new Promise(resolve=>{const r=indexedDB.open('mission02');r.onsuccess=()=>resolve(r.result)});
  const archive=await new Promise(resolve=>{const r=db.transaction('state').objectStore('state').get('recovery:'+replacement.operation_id);r.onsuccess=()=>resolve(r.result)});db.close();
  return {blocked,gps:replacement.payload.latitude,archived:await archive.row.blob.text()};
 });assert.deepEqual(res,{blocked:true,gps:1,archived:'original'});
}));
test('réponse HTTP 200 non JSON : file non acquittée, réessai temporisé',async()=>check(async(page,context)=>{
 await context.route('**/api/terrain/**',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<html>proxy</html>'}));
 const res=await page.evaluate(async()=>{await store.enqueue(ctx('demarrer_mission'),payload());const result=await store.sync(ProRecup.api,()=>true);const rows=await store.list();return {result,count:rows.length,error:rows[0].last_error}});
 assert.equal(res.count,1);assert.equal(res.error,'REPONSE_INVALIDE');assert.equal(res.result.stopped,'backoff');
}));
test('relecture serveur après envoi : remplace la projection ; erreur de relecture signalée',async()=>check(async page=>{
 const res=await page.evaluate(async()=>{
  await store.enqueue(ctx('demarrer_mission'),payload());const canonical={...day,missions:[{...day.missions[0],statut:'terminee'}]};
  await store.sync({post:async()=>{},get:async()=>({data:canonical})},()=>true);const status=(await store.view()).missions[0].statut;
  const result=await store.sync({post:async()=>{},get:async()=>{throw {status:503}}},()=>true);return {status,result};
 });assert.equal(res.status,'terminee');assert.equal(res.result.stopped,'refresh');
}));
test('mission absente du jour serveur : données en attente visibles et bloquées',async()=>check(async page=>{
 const res=await page.evaluate(async()=>{await store.enqueue(ctx('demarrer_mission'),payload());await store.saveDay({date:'2026-11-01',missions:[]});const view=await store.view();return {count:view.missions.length,blocked:view.missions[0].bloquee,day:view.date}});
 assert.deepEqual(res,{count:1,blocked:true,day:'2026-11-01'});
}));
test('perte d’autorisation pendant lecture Blob : aucun POST',async()=>check(async page=>{
 const res=await page.evaluate(async()=>{
  await store.enqueue(ctx('avant_collecte'),payload(),new Blob(['photo'],{type:'image/jpeg'}));let ok=true,calls=0;const base=Blob.prototype.arrayBuffer;
  Blob.prototype.arrayBuffer=async function(){ok=false;return base.call(this)};
  try{const result=await store.sync({post:async()=>calls++},()=>ok);return {calls,result,rows:(await store.list()).length}}finally{Blob.prototype.arrayBuffer=base}
 });assert.equal(res.calls,0);assert.equal(res.result.stopped,'auth');assert.equal(res.rows,1);
}));
test('Web Locks absent : aucun envoi concurrent risqué et données conservées',async()=>check(async page=>{
 const res=await page.evaluate(async()=>{Object.defineProperty(navigator,'locks',{value:undefined,configurable:true});await store.enqueue(ctx('demarrer_mission'),payload());let calls=0;const result=await store.sync({post:async()=>calls++},()=>true);return {result,calls,rows:(await store.list()).length}});
 assert.equal(res.calls,0);assert.equal(res.rows,1);assert.equal(res.result.stopped,'lock');
}));

test('parcours complet : neuf actions dans l’ordre et reçus liés aux mêmes UUID',async()=>check(async page=>{
 const res=await page.evaluate(async()=>{
  const order=['demarrer_mission','arriver_site','demarrer_collecte','avant_collecte','enregistrer_pesee','ticket_balance','terminer_collecte','apres_collecte','terminer_mission'];
  for(const action of order)await store.enqueue(ctx(action),payload(),['avant_collecte','apres_collecte','ticket_balance'].includes(action)?new Blob(['photo'],{type:'image/jpeg'}):undefined);
  const rows=await store.list();const received=[];
  const result=await store.sync({requireReceipt:true,post:async(url,body)=>{
   const id=body instanceof FormData?body.get('operation_id'):body.operation_id;
   const row=rows.find(r=>r.operation_id===id);received.push(row.type);
   const key=row.type==='arriver_site'?'arrivee':['avant_collecte','apres_collecte','ticket_balance'].includes(row.type)?'preuve':row.type==='enregistrer_pesee'?'pesee':'evenement';
   return {data:{[key]:{operation_id:id,mission_id:row.mission_id,collecte_id:row.collecte_id}}};
  }},()=>true);return {order,received,result,left:(await store.list()).length};
 });assert.deepEqual(res.received,res.order);assert.equal(res.left,0);assert.equal(res.result.stopped,null);
}));
test('reçu 200 JSON avec UUID étranger : aucun acquittement',async()=>check(async(page,context)=>{
 await context.route('**/api/terrain/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{evenement:{operation_id:'foreign',mission_id:'foreign'}}})}));
 const res=await page.evaluate(async()=>{await store.enqueue(ctx('demarrer_mission'),payload());const result=await store.sync(ProRecup.api,()=>true);return {result,left:(await store.list()).length}});
 assert.equal(res.left,1);assert.equal(res.result.stopped,'backoff');
}));
test('échec transaction acquittement : photo et UUID restent après succès distant',async()=>check(async page=>{
 const result=await page.evaluate(async()=>{
  await store.enqueue(ctx('avant_collecte'),payload(),new Blob(['keep'],{type:'image/jpeg'}));const first=(await store.list())[0];let thrown=false;
  const remove=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(...args){if(this.name==='queue')throw new DOMException('Quota','QuotaExceededError');return remove.apply(this,args)};
  try{await store.sync({post:async()=>{}},()=>true)}catch{thrown=true}finally{IDBObjectStore.prototype.delete=remove}
  const rows=await store.list();let replay;
  await store.sync({post:async(u,p)=>{replay=p.get('operation_id')}},()=>true);
  return {thrown,id:first.operation_id,replay,bytes:await rows[0].blob.text(),left:(await store.list()).length};
 });assert.equal(result.thrown,true);assert.equal(result.id,result.replay);assert.equal(result.bytes,'keep');assert.equal(result.left,0);
}));
test('photo illisible après POST incertain : remplacement refusé et original préservé',async()=>check(async page=>{
 const result=await page.evaluate(async()=>{
  await store.enqueue(ctx('avant_collecte'),payload(),new Blob(['uncertain'],{type:'image/jpeg'}));await store.sync({post:async()=>{throw {code:'NETWORK_ERROR'}}},()=>true);
  const original=Blob.prototype.arrayBuffer;Blob.prototype.arrayBuffer=async()=>{throw Error('unreadable')};
  try{await store.sync({post:async()=>{}},()=>true,()=>{},{forceBackoff:true})}finally{Blob.prototype.arrayBuffer=original}
  let denied=false;try{await store.replaceUnreadablePhoto(new Blob(['replacement'],{type:'image/jpeg'}),new Date().toISOString(),{latitude:1,longitude:1,precision_gps:1})}catch{denied=true}
  return {denied,bytes:await(await store.list())[0].blob.text(),count:(await store.list()).length};
 });assert.deepEqual(result,{denied:true,bytes:'uncertain',count:1});
}));
test('deux coffres de comptes : file et brouillons isolés',async()=>check(async page=>{
 const result=await page.evaluate(async()=>{
  await store.enqueue(ctx('demarrer_mission'),payload());await store.saveDraft(ctx('avant_collecte'),{fields:{}},new Blob(['A'],{type:'image/jpeg'}));
  const second=await O.open('other-account');const rows=await second.list();const draft=await second.getDraft(ctx('avant_collecte'));second.close();return {rows:rows.length,draft:!!draft,original:(await store.list()).length};
 });assert.deepEqual(result,{rows:0,draft:false,original:1});
}));
test('formulaire réel de pesée : brouillon saisi/restauré avec ticket après fermeture',async()=>check(async page=>{
 const source=readFileSync(path.join(root,'agent-app/js/app.js'),'utf8');
 const code=source.slice(source.indexOf('const ouvrirSaisie = async'),source.indexOf('const executerAction = async'));
 const result=await page.evaluate(async code=>{
  const photos=new WeakMap(),tickets=new WeakMap(),pending=new WeakMap();const carte=document.createElement('div');document.body.append(carte);
  const mission={id:m,tricycle:{id:b}};const etape={action:'enregistrer_pesee',collecte:{id:c}};
  const open=new Function('fermerSaisie','preparerPhoto','preparerScannerQr','estPhoto','contexteOperation','terrainStore','journeeCourante','nettoyer','photosFormulaires','ticketsFormulaires','brouillonsEnCours','actionEnCours',code+';return ouvrirSaisie')(
   f=>f?.remove(),()=>{},()=>{},a=>a==='avant_collecte'||a==='apres_collecte',()=>ctx('enregistrer_pesee'),store,{balances:[{id:b,numero_interne:'B',precision_kg:1,capacite_max_kg:100}]},v=>String(v??''),photos,tickets,pending,false);
  let form=await open(carte,'enregistrer_pesee',mission,etape);form.elements.poids_brut.value='24';form.elements.tare.value='2';
  const transfer=new DataTransfer();transfer.items.add(new File(['ticket-draft'],'ticket.jpg',{type:'image/jpeg'}));form.elements.ticket_balance.files=transfer.files;
  form.dispatchEvent(new Event('input',{bubbles:true}));await pending.get(form);form.remove();
  form=await open(carte,'enregistrer_pesee',mission,etape);
  return {brut:form.elements.poids_brut.value,tare:form.elements.tare.value,ticket:await tickets.get(form).text()};
 },code);assert.deepEqual(result,{brut:'24',tare:'2',ticket:'ticket-draft'});
}));

test('suite historique offline : IndexedDB v1/v2, blobs, reprises et backoff',async t=>check(async page=>{
 await page.evaluate(()=>{document.body.innerHTML='<button id="run">Run</button><button id="install-shell"></button><button id="stop-shell"></button><pre id="result"></pre>'});
 await page.addScriptTag({content:readFileSync(path.join(root,'backend/terrain-offline-tests.js'),'utf8')});
 await page.click('#run');
 await page.waitForFunction(()=>/tests réussis|FAIL/.test(document.getElementById('result').textContent),{timeout:40000});
 const result=await page.locator('#result').textContent();assert.doesNotMatch(result,/FAIL/);assert.match(result,/tests réussis/);t.diagnostic(result.match(/\d+ tests réussis/)?.[0] || result);
}));

test('mission refusée A : dépendances bloquées, mission indépendante B synchronisée',async()=>check(async page=>{
 const result=await page.evaluate(async()=>{
  const other=crypto.randomUUID();await store.enqueue(ctx('demarrer_mission'),payload());await store.enqueue(ctx('arriver_site'),payload());
  await store.enqueue({action:'demarrer_mission',mission:other},payload());let calls=0;
  const result=await store.sync({post:async()=>{calls++;if(calls===1)throw {status:409}}},()=>true);
  const rows=await store.list();return {calls,result,left:rows.length,types:rows.map(r=>r.type)};
 });assert.equal(result.calls,2);assert.equal(result.left,2);assert.equal(result.result.stopped,'erreur');assert.deepEqual(result.types,['demarrer_mission','arriver_site']);
}));

test('API : délai réseau borné par AbortController, résultat incertain conservable',async()=>check(async(page,context)=>{
 await context.route('**/api/hang',()=>{});
 const result=await page.evaluate(async()=>{
  const timer=window.setTimeout;window.setTimeout=(fn,ms,...args)=>timer(fn,ms===30000?20:ms,...args);
  try{await ProRecup.api.post('/hang',{operation_id:crypto.randomUUID()});return null}catch(e){return e.code}finally{window.setTimeout=timer}
 });assert.equal(result,'NETWORK_ERROR');
}));
test('auth réelle : expiration de session ne supprime pas IndexedDB',async()=>check(async(page,context)=>{
 await context.route('**/api/terrain/me',route=>route.fulfill({status:401,contentType:'application/json',body:'{"success":false,"message":"expired"}'}));
 await page.evaluate(async()=>{
  await store.enqueue(ctx('demarrer_mission'),payload());ProRecup.config.USER_KEY='test-user';ProRecup.config.ROLE_TERRAIN='agent_valorisation_carbone';
  localStorage.setItem('test-token','synthetic');localStorage.setItem('test-user',JSON.stringify({id:crypto.randomUUID(),role:'agent_valorisation_carbone'}));
 });await page.addScriptTag({content:readFileSync(path.join(root,'agent-app/js/auth.js'),'utf8')});
 const result=await page.evaluate(async()=>({session:await ProRecup.auth.restaurer(),queue:(await store.list()).length,token:localStorage.getItem('test-token')}));
 assert.deepEqual(result,{session:null,queue:1,token:null});
}));
test('changement de compte pendant GET journée : aucune écriture dans le nouveau coffre',async()=>check(async page=>{
 const source=readFileSync(path.join(root,'agent-app/js/app.js'),'utf8');const code=source.slice(source.indexOf('const chargerJournee = async'),source.indexOf('const entrerApplication ='));
 const result=await page.evaluate(async code=>{
  const run=new Function('code',`return (async()=>{
   let saved=0, resolve;let actionEnCours=false,synchronisation=null,chargementJournee=null;
   const first={saveDay:async()=>saved++,view:async()=>({})};let terrainStore=first,terrainOwner='first';
   const masquerMessage=()=>{},messageApplication=null,avecDelaiTerrain=p=>p;
   const api={get:()=>new Promise(r=>resolve=r)};
   eval(code+';globalThis.loader=chargerJournee');
   const job=loader();terrainStore={saveDay:async()=>saved++};terrainOwner='second';resolve({data:{missions:[]}});await job;delete globalThis.loader;return saved;
  })()`);
  return run(code);
 },code);assert.equal(result,0);
}));

test('pesée offline plus ancienne : conserve la pesée serveur courante et les deux mesures',async()=>check(async page=>{
 const result=await page.evaluate(async()=>{
  day.missions[0].collectes[0].pesees=[{id:crypto.randomUUID(),operation_id:crypto.randomUUID(),type:'terrain',poids_brut:30,tare:1,poids_net:29,date_heure:'2026-10-31T11:00:00Z',est_courante:true}];
  await store.saveDay(day);await store.enqueue(ctx('enregistrer_pesee'),{...payload(),survenu_le:'2026-10-31T10:00:00Z'});
  const weights=(await store.view()).missions[0].collectes[0].pesees;return {count:weights.length,current:weights.filter(p=>p.est_courante).map(p=>p.poids_net)};
 });assert.deepEqual(result,{count:2,current:[29]});
}));
