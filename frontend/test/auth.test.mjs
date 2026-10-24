import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key,value) => memory.set(key,value), removeItem: key => memory.delete(key) };
const apiSource = readFileSync(new URL('../src/shared/services/api.js', import.meta.url), 'utf8')
  .replace("'axios'", JSON.stringify(pathToFileURL(require.resolve('axios')).href))
  .replace('import.meta.env.VITE_API_URL', 'undefined');
const apiUrl = moduleUrl(apiSource);
const { default: api } = await import(apiUrl);
const authSource = readFileSync(new URL('../src/features/auth/store/authStore.js', import.meta.url), 'utf8')
  .replace("'zustand'", JSON.stringify(pathToFileURL(require.resolve('zustand')).href))
  .replace("'../../../shared/services/api'", JSON.stringify(apiUrl));
const { default: auth } = await import(moduleUrl(authSource));
test('authentication recovers from stalled requests and distinguishes server failures', async t => {
  assert.equal(api.defaults.timeout, 30000);
  let mode = 'stall';
  const server = createServer((req,res) => {
    if (mode === 'stall') return;
    res.setHeader('Content-Type','application/json');
    if (mode === 'invalid') { res.statusCode=401; res.end(JSON.stringify({message:'Invalid credentials'})); }
    if (mode === 'unavailable') { res.statusCode=503; res.end('{}'); }
    if (mode === 'success') res.end(JSON.stringify({token:'test-session',user:{role:'customer',name:'Test Guest'}}));
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  api.defaults.baseURL=`http://127.0.0.1:${server.address().port}/api`;
  api.defaults.timeout=100;
  await t.test('stalled login ends loading with a timeout message', async () => {
    const pending=auth.getState().login('test@example.test','test-password');
    assert.equal(auth.getState().loading,true);
    assert.equal(await pending,false);
    assert.equal(auth.getState().loading,false);
    assert.match(auth.getState().error,/taking too long/);
  });
  await t.test('signup also recovers from a stalled request', async () => {
    assert.equal(await auth.getState().customerSignup({}),false);
    assert.equal(auth.getState().loading,false);
    assert.match(auth.getState().error,/taking too long/);
  });
  await t.test('invalid credentials preserve the server message', async () => {
    mode='invalid'; assert.equal(await auth.getState().login('test@example.test','wrong'),false);
    assert.equal(auth.getState().error,'Invalid credentials');
    assert.equal(auth.getState().loading,false);
  });
  await t.test('server unavailability has a distinct retry message', async () => {
    mode='unavailable'; assert.equal(await auth.getState().login('test@example.test','password'),false);
    assert.match(auth.getState().error,/temporarily unavailable/);
  });
  await t.test('successful retry saves the session and clears the error', async () => {
    mode='success'; assert.equal(await auth.getState().login('test@example.test','password'),true);
    assert.equal(auth.getState().loading,false); assert.equal(auth.getState().error,null);
    assert.equal(auth.getState().user.role,'customer'); assert.equal(memory.get('token'),'test-session');
  });
});
