import {pool,verifierIsolation} from './mission04.pg-setup.mjs';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const {default:service}=await import('../src/services/VenteService.js');
after(async()=>pool.end());
test('PostgreSQL réel : reçu durable et rejeu identique apres arret/redemarrage serveur et nouveau processus Node',async()=>{
 await verifierIsolation();const ctx=JSON.parse(await readFile(process.env.M04_ISOLATED_CONTEXT,'utf8'));
 const saved=JSON.parse(await readFile(path.join(ctx.runDir,'restart-receipt.json'),'utf8'));
 assert.deepEqual(await service.creer(saved.p),saved.result);
 const r=(await pool.query('SELECT (SELECT count(*) FROM ventes) ventes,(SELECT count(*) FROM vente_operations) operations,(SELECT count(*) FROM impacts_carbone) impacts,(SELECT quantite FROM stocks WHERE id=$1) stock',[saved.p.stock_id])).rows[0];
 assert.equal(Number(r.ventes),1);assert.equal(Number(r.operations),1);assert.equal(Number(r.impacts),1);assert.equal(Number(r.stock),13);
});
