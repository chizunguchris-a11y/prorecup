// Offline, dependency-free regression checks for the recovered Mission 05 subset.
// These checks do not connect to databases, Render, or Storage.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
function code(file) { return fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''); }
function load(file, mocks, symbol) {
  const src = code(file)
    .replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*$/gm, '')
    .replace(/^export default .*;\s*$/gm, '');
  return new Function(...Object.keys(mocks), `${src}\nreturn ${symbol};`)(...Object.values(mocks));
}
function q(rows) { return { query: async (sql) => { q.lastSql = sql; return { rows }; } }; }

for (const [n, rows, expected] of [
  ['unique', [{id:'u1'}], 'u1'],
  ['missing', [], undefined]
]) {
  test(`login lookup ${n}: no arbitrary identity`, async () => {
    const repository = load('repositories/utilisateurRepository.js', { pool: q(rows) }, 'utilisateurRepository');
    const r = await repository.findByEmail('TEST@example.com');
    assert.equal(r?.id, expected);
    assert.match(q.lastSql, /LIMIT 2\s*;/i);
  });
}
test('global login email collision fails closed rather than accepting new registration', async () => {
  const repository = load('repositories/utilisateurRepository.js', { pool: q([{id:'u1'}, {id:'u2'}]) }, 'utilisateurRepository');
  await assert.rejects(() => repository.findByEmail('collision@example.org'), e => e.code === 'IDENTITE_AMBIGUE');
});
for (const [method, expected] of [
  ['trouverUtilisateurParEmail', /LOWER\(TRIM\(email\)\)/],
  ['trouverUtilisateurParIdentifiant', /POSITION\('@' IN e\.brut\) = 0/]
]) {
  test(`recovery ${method}: 2 matches yield no account`, async () => {
    const repo = load('repositories/IdentityRecoveryRepository.js', { pool: q([{id:'u1'}, {id:'u2'}]) }, 'identityRecoveryRepository');
    assert.equal(await repo[method]('ambiguous@example.org'), null);
    assert.match(q.lastSql, /LIMIT 2\s*;/i);
    assert.match(q.lastSql, expected);
  });
}
test('account provisioning treats 2 identities as occupied, never selects one', async () => {
  const Cls = load('repositories/ClientCompteRepository.js', { pool: q([{id:'u1'},{id:'u2'}]) }, 'ClientCompteRepository');
  const cls = new Cls();
  const result = await cls.trouverUtilisateurParEmail('ambiguous@example.org');
  assert.deepEqual(result, { existe: true });
  assert.equal(result.id, undefined);
});
test('fractional stock decrement casts every numeric parameter', () => {
  const s = code('repositories/LotRepository.js');
  const block = s.slice(s.indexOf('decrementerQuantiteRestante('), s.indexOf('async marquerQuantiteRestanteNonDeterminee('));
  assert.match(block, /quantite_restante_kg\s*-\s*\$3::numeric/);
  assert.match(block, /\$3::numeric\s*>\s*0/);
  assert.match(block, /quantite_restante_kg\s*>=\s*\$3::numeric/);
  assert.doesNotMatch(block, /\$3\s*>\s*0/);
});

const base = {
  actif: true, auth_epoch: 1, role_id:'role-1', role_nom: 'admin',
  role_actif: true, role_organisation_id: null
};
const token = {
  id:'user-1', organisationId:'org-1', role:'admin', roleId:'role-1', authEpoch:1
};
async function invokeAuth(row, currentToken = token, sessions = []) {
  const jwt = { verify: () => currentToken };
  const pool = {query: async (sql) => {
    if (sql.includes('FROM refresh_tokens')) return {rows:sessions};
    return {rows: row ? [row] : []};
  }};
  const handler = load('middlewares/authMiddleware.js',
    {jwt, crypto, obtenirJwtSecret: () => 'fake-only', pool}, 'authMiddleware');
  let nextCalls = 0, statusCode = 200, responseBody;
  const req = { headers:{authorization:'Bearer test.jwt.signature'} };
  const res = { status: (status) => {statusCode=status; return res;}, json: body => {responseBody=body;return res;} };
  await handler(req,res,()=>{nextCalls++});
  return {nextCalls,statusCode,responseBody,req};
}
for (const [name,row,claim] of [
  ['valid', {...base}, {...token}],
  ['role changed', {...base,role_nom:'client'}, {...token}],
  ['role ID changed', {...base,role_id:'role-2'}, {...token}],
  ['role inactive', {...base,role_actif:false}, {...token}],
  ['local role instead of system role', {...base,role_organisation_id:'org-1'}, {...token}],
  ['account inactive', {...base,actif:false}, {...token}],
  ['epoch bumped', {...base,auth_epoch:2}, {...token}],
  ['token role id missing', {...base}, {...token,roleId:null}],
]) {
  test(`auth ${name}`, async () => {
    const o = await invokeAuth(row,claim);
    if (name === 'valid') {
      assert.equal(o.nextCalls,1);
      assert.equal(o.req.utilisateur.role,'admin');
      assert.equal(o.req.utilisateur.roleId,'role-1');
    } else {
      assert.equal(o.nextCalls,0);
      assert.equal(o.statusCode,401);
    }
  });
}
