import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire,registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
if(!process.env.M04_ISOLATED_CONTEXT)throw Error('Lancer uniquement mission04.pg-runner.mjs : aucune URL externe n’est acceptée.');
const ctx=JSON.parse(await readFile(process.env.M04_ISOLATED_CONTEXT,'utf8'));
if(!/^m04_synthetic_[0-9a-f]{32}$/.test(ctx.database)||!Number.isInteger(ctx.port)||!ctx.nonce||!path.basename(ctx.runDir).startsWith('fresh-'))throw Error('Contexte PostgreSQL isolé invalide.');
const resolved={};
for(const name of ['pg','express','express-validator','jsonwebtoken','supertest','qrcode']) {
 const dir=name==='pg'?process.env.M04_TEST_MODULES:process.env.M03_TEST_MODULES;
 resolved[name]=require.resolve(name,dir?{paths:[dir]}:undefined);
}
const {Pool}=require(resolved.pg);
export const pool=new Pool({host:'127.0.0.1',port:ctx.port,database:ctx.database,user:ctx.user,ssl:false,max:12,connectionTimeoutMillis:5000});
pool.on('error',()=>{});
const actual=(await pool.query('SHOW data_directory')).rows[0].data_directory;
if(path.resolve(actual).toLowerCase()!==path.resolve(ctx.dataDir).toLowerCase()) {await pool.end();throw Error('Instance étrangère : tests interdits.');}
export async function verifierIsolation() {
 const row=(await pool.query('SELECT nonce,current_database() AS db FROM mission04_test_marker')).rows[0];
 if(row?.nonce!==ctx.nonce||row.db!==ctx.database)throw Error('Marqueur synthétique absent : aucune mutation autorisée.');
}
await verifierIsolation();
globalThis.__mission04RealPool=pool;
registerHooks({resolve(name,context,next){return resolved[name]?{url:pathToFileURL(resolved[name]).href,shortCircuit:true}:next(name,context)},load(url,context,next){
 if(url.endsWith('/src/config/db.js'))return {format:'module',shortCircuit:true,source:'export default globalThis.__mission04RealPool;'};
 return next(url,context);
}});
process.env.NODE_ENV='test';process.env.JWT_SECRET='m04-synthetic-only-jwt-key-2026-transaction-tests';
process.env.SKIP_DATABASE_STARTUP_CHECK='1';
