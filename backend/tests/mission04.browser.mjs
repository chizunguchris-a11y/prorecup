import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.TERRAIN_PLAYWRIGHT_PACKAGE||'playwright');
const source=readFileSync(new URL('../../frontend/js/vente-operation.js',import.meta.url),'utf8');
let browser,server,origin;
before(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.TERRAIN_BROWSER_EXECUTABLE?{executablePath:process.env.TERRAIN_BROWSER_EXECUTABLE}:{})});
 server=createServer((req,res)=>res.end('<!doctype html><title>Test synthetique M04</title>'));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
});
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});
async function check(fn){const context=await browser.newContext();try{
 await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 const page=await context.newPage();await page.goto(origin);
 await setup(page);await fn(page);
}finally{await context.close()}}
async function setup(page){await page.evaluate(()=>{
 window.owner='A';window.calls=0;
 window.input={stock_id:'stock-synthetique',quantite:7,prix_unitaire:2,devise:'CDF',acheteur_nom:'Client synthetique',reference_vente:null};
 window.ProRecup={obtenirUtilisateur:()=>({id:owner,organisation_id:'org-synthetique'}),requete:async(url,opts)=>{
  calls++;const payload=JSON.parse(opts.body);return {data:{operation_id:payload.operation_id,vente:{...payload,id:'vente-synthetique'}}};
 }};
});await page.addScriptTag({content:source});}
test('M04 navigateur : UUID conserve apres rechargement et compte isole',async()=>check(async page=>{
 const first=await page.evaluate(()=>ProRecupVenteOperation.preparer(input));await page.reload();await setup(page);
 const result=await page.evaluate(()=>{const replay=ProRecupVenteOperation.preparer(input);owner='B';return {replay,other:ProRecupVenteOperation.preparer(input)}});
 assert.equal(result.replay.operation_id,first.operation_id);assert.notEqual(result.other.operation_id,first.operation_id);
}));
test('M04 navigateur : un double clic envoie une fois et efface seulement le recu confirme',async()=>check(async page=>{
 const result=await page.evaluate(async()=>{const p=ProRecupVenteOperation.preparer(input);const a=ProRecupVenteOperation.envoyer(),b=ProRecupVenteOperation.envoyer();await Promise.all([a,b]);return {same:a===b,calls,pending:ProRecupVenteOperation.lire(),p}});
 assert.equal(result.same,true);assert.equal(result.calls,1);assert.equal(result.pending,null);
}));
test('M04 navigateur : erreur reseau et session expiree conservent les parametres originaux',async()=>check(async page=>{
 const result=await page.evaluate(async()=>{
  const p=ProRecupVenteOperation.preparer(input);const saved=ProRecup.requete;
  for(const status of [0,401,403,409,503]){ProRecup.requete=async()=>{throw Object.assign(Error('refus synthetique'),{status})};try{await ProRecupVenteOperation.envoyer()}catch{}if(ProRecupVenteOperation.lire().payload.operation_id!==p.operation_id)throw Error('preuve perdue');}
  let denied=false;try{ProRecupVenteOperation.preparer({...input,quantite:8})}catch{denied=true}
  ProRecup.requete=saved;await ProRecupVenteOperation.envoyer();return {denied,pending:ProRecupVenteOperation.lire()};
 });assert.equal(result.denied,true);assert.equal(result.pending,null);
}));
test('M04 navigateur : recu incoherent ne supprime jamais la tentative',async()=>check(async page=>{
 const result=await page.evaluate(async()=>{
  const p=ProRecupVenteOperation.preparer(input);ProRecup.requete=async()=>({data:{operation_id:p.operation_id,vente:{...p,id:'vente',quantite:99}}});
  let refused=false;try{await ProRecupVenteOperation.envoyer()}catch{refused=true}return {refused,pending:ProRecupVenteOperation.lire().payload};
 });assert.equal(result.refused,true);assert.equal(result.pending.quantite,7);
}));
test('M04 navigateur : changement de compte pendant la reponse conserve la tentative originale',async()=>check(async page=>{
 const result=await page.evaluate(async()=>{
  const p=ProRecupVenteOperation.preparer(input);ProRecup.requete=async()=>{owner='B';return {data:{operation_id:p.operation_id,vente:{...p,id:'vente'}}}};
  try{await ProRecupVenteOperation.envoyer()}catch{}const other=ProRecupVenteOperation.lire();owner='A';return {other,pending:ProRecupVenteOperation.lire().payload};
 });assert.equal(result.other,null);assert.ok(result.pending.operation_id);
}));
test('M04 navigateur : stockage indisponible empeche tout POST',async()=>check(async page=>{
 const result=await page.evaluate(()=>{
  Storage.prototype.setItem=()=>{throw Error('quota synthetique')};let refused=false;try{ProRecupVenteOperation.preparer(input)}catch{refused=true}return {refused,calls};
 });assert.equal(result.refused,true);assert.equal(result.calls,0);
}));
test('M04 navigateur : reprise modale meme si ancien stock absent et bouton desactive',async()=>check(async page=>{
 const ui=readFileSync(new URL('../../frontend/js/ventes.js',import.meta.url),'utf8');
 const restore=ui.slice(ui.indexOf('const champsVente ='),ui.indexOf('const envoyerVenteEnAttente ='));
 const result=await page.evaluate(code=>{
  ProRecupVenteOperation.preparer(input);
  const make=tag=>document.createElement(tag);
  const fields=[make('select'),make('input'),make('input'),make('select'),make('input'),make('input')];
  const button=make('button');button.disabled=true;const info=make('span');
  const run=new Function('selectStock','champQuantite','champPrixUnitaire','selectDevise','champAcheteur','champReference','boutonEnregistrer','informationStock','calculerMontant',code+';return restaurerVenteEnAttente()');
  const restored=run(...fields,button,info,()=>{});
  return {restored,disabled:button.disabled,stock:fields[0].value,qty:fields[1].value,locked:fields[1].readOnly};
 },restore);assert.equal(result.restored,true);assert.equal(result.disabled,false);assert.equal(result.stock,'stock-synthetique');assert.equal(result.qty,'7');assert.equal(result.locked,true);
}));
