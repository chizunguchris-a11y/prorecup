import { registerHooks, createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
process.env.NODE_ENV='test';
process.env.JWT_SECRET='prorecup-mission03-synthetic-test-secret-2026-no-real-account';
process.env.SKIP_DATABASE_STARTUP_CHECK='1';
globalThis.__mission03Pool={connect(){throw Error('Real database forbidden')},query(){throw Error('Real database forbidden')}};
const externals = process.env.M03_TEST_MODULES ? Object.fromEntries(['qrcode','express','express-validator','jsonwebtoken','supertest'].map(name =>
    [name,pathToFileURL(require.resolve(name,{paths:[process.env.M03_TEST_MODULES]})).href])) : {};
registerHooks({
 resolve(specifier,context,next){
  if(externals[specifier]) return {url:externals[specifier],shortCircuit:true};
  return next(specifier,context);
 },
 load(url,context,next){
  if(url.endsWith('/src/config/db.js'))return {format:'module',shortCircuit:true,source:'export default globalThis.__mission03Pool;'};
  return next(url,context);
 }
});
