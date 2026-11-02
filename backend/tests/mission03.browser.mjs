import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.TERRAIN_PLAYWRIGHT_PACKAGE||'playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));let browser,server,origin;
before(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.TERRAIN_BROWSER_EXECUTABLE?{executablePath:process.env.TERRAIN_BROWSER_EXECUTABLE}:{})});
 server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><main id="detailTracabilite"></main>')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
async function check(fn){const context=await browser.newContext();try{
 await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());const page=await context.newPage();await page.goto(origin);await fn(page);
}finally{await context.close()}}
test('portail : contribution, reste inconnu et QR non interprété comme HTML',async()=>check(async page=>{
 const source=readFileSync(path.join(root,'frontend/portail-client/js/collecte.js'),'utf8');const code=source.slice(source.indexOf('const afficherTracabilite ='),source.indexOf('const afficherCollecte ='));
 const result=await page.evaluate(code=>{
  const render=new Function('element',code+';return afficherTracabilite')(id=>document.getElementById(id));
  render([{code_qr:'<img src=x onerror="window.pwned=1">',quantite_origine_kg:20,reste_attribuable_kg:null}]);
  return {text:document.body.textContent,images:document.querySelectorAll('img').length,pwned:!!window.pwned};
 },code);assert.match(result.text,/20 kg/);assert.match(result.text,/non déterminée/);assert.equal(result.images,0);assert.equal(result.pwned,false);
}));
test('portail : absence de filiation expliquée, aucune quantité inventée',async()=>check(async page=>{
 const source=readFileSync(path.join(root,'frontend/portail-client/js/collecte.js'),'utf8');const code=source.slice(source.indexOf('const afficherTracabilite ='),source.indexOf('const afficherCollecte ='));
 const result=await page.evaluate(code=>{const render=new Function('element',code+';return afficherTracabilite')(id=>document.getElementById(id));render([]);return document.body.textContent},code);
 assert.match(result,/Aucune filiation/);assert.doesNotMatch(result,/0 kg/);
}));
test('Manager : regroupement après fermeture conserve UUID, paramètres et instant ; autre compte isolé',async()=>check(async page=>{
 const source=readFileSync(path.join(root,'frontend/js/lots.js'),'utf8');const code=source.slice(source.indexOf('const cleTentativeRegroupement ='),source.indexOf('document.getElementById("boutonRegrouperLot").addEventListener'));
 const data={site_id:'site',codes_qr:['PR-C-ABCDEF']};
 const first=await page.evaluate(({code,data})=>{window.make=new Function('ProRecup',code+';return preparerTentativeRegroupement')({obtenirUtilisateur:()=>({id:'account-A',organisation_id:'org'})});return make(data)}, {code,data});
 await page.reload();
 const result=await page.evaluate(({code,data})=>{
  const prepare=new Function('ProRecup',code+';return preparerTentativeRegroupement')({obtenirUtilisateur:()=>({id:'account-A',organisation_id:'org'})});
  const replay=prepare(data);let denied=false;try{prepare({...data,site_id:'different'})}catch{denied=true}
  const other=new Function('ProRecup',code+';return preparerTentativeRegroupement')({obtenirUtilisateur:()=>({id:'account-B',organisation_id:'org'})});return {replay,denied,other:other(data)};
 },{code,data});assert.equal(result.replay.operation_id,first.operation_id);assert.equal(result.replay.survenu_le,first.survenu_le);assert.equal(result.denied,true);assert.notEqual(result.other.operation_id,first.operation_id);
}));
test('stock historique : une quantité inconnue ne devient ni zéro, ni total certifié',async()=>check(async page=>{
 const source=readFileSync(path.join(root,'frontend/js/stocks.js'),'utf8');const code=source.slice(source.indexOf('const quantiteConnue ='),source.indexOf('const creerCellule ='));
 const result=await page.evaluate(code=>{
  const types=document.createElement('span'),total=document.createElement('span'),faibles=document.createElement('span');
  const run=new Function('stocks','nombreTypes','quantiteTotale','nombreStocksFaibles','ProRecup','seuilStockFaible',code+';mettreAJourCompteurs();return obtenirNiveau(stocks[0])');
  const level=run([{quantite:null,tracabilite_lots_active:false}],types,total,faibles,{formaterNombre:v=>String(v)},10);return {level,text:total.textContent};
 },code);assert.equal(result.level,'a_reconcilier');assert.match(result.text,/non déterminé/);assert.doesNotMatch(result.text,/0 kg/);
}));
