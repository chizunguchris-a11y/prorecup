import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile,readFile,mkdir,realpath} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const pgPath=process.env.M04_TEST_MODULES ? require.resolve('pg',{paths:[process.env.M04_TEST_MODULES]}) : 'pg';
const {Pool}=require(pgPath);
const args=process.argv.slice(2), proposal=args[args.indexOf('--proposal')+1];
const rollback=args.includes('--rollback')?path.resolve(args[args.indexOf('--rollback')+1]):null;
if(!args.includes('--proposal') || !proposal || !process.env.M04_PG_BIN)
 throw Error('Fournir --proposal chemin.sql et M04_PG_BIN. Aucune URL de base existante n’est acceptée.');
const bin=await realpath(process.env.M04_PG_BIN);
const workspace=path.resolve(process.env.M04_TEST_WORKDIR || path.join(process.cwd(),'work','mission04-pg-tests'));
await mkdir(workspace,{recursive:true});
const runDir=await mkdtemp(path.join(workspace,'fresh-'));
const dataDir=path.join(runDir,'data');const nonce=randomUUID();const database='m04_synthetic_'+nonce.replaceAll('-','');
const exe=name=>path.join(bin,name+(process.platform==='win32'?'.exe':''));
const run=(file,argv,timeout=60000)=>new Promise((resolve,reject)=>{
 const child=spawn(file,argv,{windowsHide:true,stdio:['ignore','pipe','pipe']});let text='';
 const timer=setTimeout(()=>{child.kill();reject(Error('Outil PostgreSQL expiré : '+path.basename(file)))},timeout);
 child.stdout.on('data',b=>text+=b);child.stderr.on('data',b=>text+=b);child.on('error',e=>{clearTimeout(timer);reject(e)});
 const finish=code=>{clearTimeout(timer);if(code!==0)reject(Error(path.basename(file)+' : '+text));else resolve(text)};
 if(path.basename(file).startsWith('pg_ctl')) child.once('exit',code=>{child.stdout.destroy();child.stderr.destroy();finish(code)});
 else child.once('close',finish);
});
const port=await new Promise(resolve=>{const probe=createServer();probe.listen(0,'127.0.0.1',()=>{const p=probe.address().port;probe.close(()=>resolve(p))})});
let started=false,admin,pool;
try {
 console.log('Binaire : '+(await run(exe('postgres'),['--version'],10000)).trim());
 await run(exe('initdb'),['-D',dataDir,'--username=m04_synthetic','--auth=trust','--no-locale','--encoding=UTF8']);
 await run(exe('pg_ctl'),['-D',dataDir,'-l',path.join(runDir,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -c max_connections=40 -c fsync=on -c synchronous_commit=on`,'-w','start']);
 started=true;
 admin=new Pool({host:'127.0.0.1',port,user:'m04_synthetic',database:'postgres',ssl:false,max:1,connectionTimeoutMillis:5000});
 const actual=(await admin.query('SHOW data_directory')).rows[0].data_directory;
 if(path.resolve(actual).toLowerCase()!==path.resolve(dataDir).toLowerCase())throw Error('Mauvaise instance PostgreSQL : aucune écriture autorisée.');
 await admin.query('CREATE DATABASE '+database);
 if(args.includes('--integrated')){
  const bootstrap='m04_bootstrap_'+nonce.replaceAll('-','');await admin.query('CREATE DATABASE '+bootstrap);
  const audit=new Pool({host:'127.0.0.1',port,user:'m04_synthetic',database:bootstrap,ssl:false,max:1});
  try{
   for(const name of ['01_organisations','02_roles','03_utilisateurs'])await audit.query((await readFile(new URL('../../database/schema/'+name+'.sql/'+name+'.sql',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
   try{await audit.query(await readFile(new URL('../../database/migrations/20260816_01_terrain_v1_fondation.sql',import.meta.url),'utf8'));throw Error('Bootstrap suppose incomplet mais migration acceptee')}
   catch(error){if(error.code!=='42P01')throw error;console.log('AUDIT BOOTSTRAP REEL : schema initial fourni incomplet, premiere migration refusee : '+error.code+' '+error.message);await audit.query('ROLLBACK')}
   try{await audit.query(await readFile(new URL('../../database/migrations/20260929_11_fondation_comptes_clients.sql',import.meta.url),'utf8'));throw Error('Contrat roles inattendu')}
   catch(error){if(error.code!=='23502')throw error;console.log('AUDIT ROLES REEL : migration 11 incompatible avec fondation roles fournie : '+error.code+' '+error.message);await audit.query('ROLLBACK')}
   try{await audit.query('SELECT photo_url FROM utilisateurs LIMIT 0');throw Error('Colonne photo_url inattendue')}
   catch(error){if(error.code!=='42703')throw error;console.log('AUDIT PORTAIL REEL : contrat utilisateur incomplet : '+error.code+' '+error.message)}
  }finally{await audit.end()}
 }
 await admin.end();admin=null;
 pool=new Pool({host:'127.0.0.1',port,user:'m04_synthetic',database,ssl:false,max:2,connectionTimeoutMillis:5000});
 await pool.query(await readFile(new URL('./fixtures/mission04.schema.sql',import.meta.url),'utf8'));
 if(args.includes('--integrated')){
  await pool.query(await readFile(new URL('./fixtures/recette.schema.sql',import.meta.url),'utf8'));
  for(const name of ['20260816_01_terrain_v1_fondation.sql','20260819_02_resultat_collecte_terrain.sql','20260923_03_pesees_tracabilite_v1.sql','20260924_04_qr_contenants_lots_tracabilite_v1.sql'])
   await pool.query((await readFile(new URL('../../database/migrations/'+name,import.meta.url),'utf8')).replace(/^\uFEFF/,''));
 }
 const oldMigration=await readFile(new URL('../../database/migrations/20260926_05_ventes_lots_fifo_v1.sql',import.meta.url),'utf8');
 const contracts=oldMigration.slice(oldMigration.indexOf('CREATE OR REPLACE FUNCTION verifier_coherence_vente_lot'),oldMigration.lastIndexOf('COMMIT;'));
 await pool.query(contracts);
 await pool.query(await readFile(new URL('../../database/migrations/20260926_06_corriger_trigger_allocations_vente.sql',import.meta.url),'utf8'));
 await pool.query('INSERT INTO mission04_test_marker VALUES($1)',[nonce]);
 const migration=await readFile(path.resolve(proposal),'utf8');
 const client=await pool.connect();try{await client.query("SET app.m04_migration_approved='yes'");await client.query(migration)}finally{client.release()}
 const context=path.join(runDir,'context.json');
 await writeFile(context,JSON.stringify({nonce,port,database,user:'m04_synthetic',dataDir,runDir,bin,proposal:path.resolve(proposal),rollback}));await pool.end();pool=null;
 console.log('Instance neuve marquée : '+database+' ; données exclusivement synthétiques.');
 const child=spawn(process.execPath,['--test',fileURLToPath(new URL(args.includes('--integrated-only')?'./recette.integrated.mjs':'./mission04.postgres.mjs',import.meta.url))],{
  windowsHide:true,stdio:'inherit',env:{...process.env,DATABASE_URL:'',INTEGRATION_TEST_DATABASE_URL:'',TRACEABILITY_TEST_DATABASE_URL:'',M04_ISOLATED_CONTEXT:context}
 });
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});process.exitCode=Number.isInteger(code)?code:1;
 if(process.exitCode===0&&!args.includes('--integrated-only')){
  await run(exe('pg_ctl'),['-D',dataDir,'-m','fast','-w','stop']);started=false;
  await run(exe('pg_ctl'),['-D',dataDir,'-l',path.join(runDir,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -c fsync=on -c synchronous_commit=on`,'-w','start']);started=true;
  const retry=spawn(process.execPath,['--test',fileURLToPath(new URL('./mission04.restart.mjs',import.meta.url))],{windowsHide:true,stdio:'inherit',env:{...process.env,DATABASE_URL:'',INTEGRATION_TEST_DATABASE_URL:'',TRACEABILITY_TEST_DATABASE_URL:'',M04_ISOLATED_CONTEXT:context}});
  const retryCode=await new Promise((resolve,reject)=>{retry.on('error',reject);retry.on('exit',resolve)});process.exitCode=Number.isInteger(retryCode)?retryCode:1;
 }
 console.log('Dossier témoin conservé : '+runDir);
 if(process.exitCode===0&&args.includes('--integrated')&&!args.includes('--integrated-only')){
  const e2e=spawn(process.execPath,['--test',fileURLToPath(new URL('./recette.integrated.mjs',import.meta.url))],{windowsHide:true,stdio:'inherit',env:{...process.env,DATABASE_URL:'',TRACEABILITY_TEST_DATABASE_URL:'',M04_ISOLATED_CONTEXT:context}});
  process.exitCode=await new Promise((resolve,reject)=>{e2e.on('error',reject);e2e.on('exit',code=>resolve(Number.isInteger(code)?code:1))});
 }
} finally {
 await pool?.end().catch(()=>{});await admin?.end().catch(()=>{});
 const pidPresent=await readFile(path.join(dataDir,'postmaster.pid'),'utf8').then(()=>true).catch(()=>false);
 if(pidPresent){await run(exe('pg_ctl'),['-D',dataDir,'-m','fast','-w','stop']);console.log('Instance PostgreSQL synthétique arrêtée.');}
 else console.log('Aucun postmaster.pid dans le repertoire synthetique : aucune instance a arreter.');
}
