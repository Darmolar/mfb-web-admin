const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function setup(status, body, token = 'current-token') {
  const stored = new Map(token ? [['mfb_auth', JSON.stringify({ accessToken: token })]] : []);
  const pending = new Map([['mfb_admin_pre_auth', 'pending']]);
  const events = [], calls = [], cache = {};
  let respond;
  const response = new Promise(resolve => { respond = () => resolve({ status, ok: status < 400, json: async () => body }); });
  function load(file) {
    if (cache[file]) return cache[file];
    const exports = {}; cache[file] = exports;
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, require: n => n === './config' ? { API_BASE_URL: '/api/v1', PUBLIC_API_KEY: 'public' } : load(`src/api/${n.slice(2)}.ts`),
      localStorage: { getItem: k => stored.get(k), removeItem: k => stored.delete(k) },
      sessionStorage: { removeItem: k => pending.delete(k) },
      Event: class { constructor(type) { this.type = type; } }, window: { dispatchEvent: e => events.push(e.type), location: { reload: () => assert.fail('Must not reload') } },
      fetch: async (url, init) => { calls.push({ url, init }); return response; },
    }); return exports;
  }
  return { api: load('src/api/index.ts'), stored, pending, events, calls, respond };
}
test('login and OTP rejection preserve the login flow and do not attach an old bearer token', async () => {
  for (const action of ['login', 'verifyAdminMfa']) {
    const s = setup(401, { success: false, message: 'Invalid credentials' });
    const request = s.api[action]({}); s.respond();
    await assert.rejects(request, /Invalid credentials/);
    assert.equal(s.events.length, 0); assert.ok(s.pending.has('mfb_admin_pre_auth'));
    assert.equal(s.calls[0].init.headers.Authorization, undefined);
  }
});
test('invalid server key does not destroy a signed-in session', async () => {
  const s = setup(401, { success: false, message: 'Invalid admin key.', errorCode: 'AUTH_FAILED' });
  const request = s.api.getDashboardSummary(); s.respond(); await assert.rejects(request, /Invalid admin key/);
  assert.ok(s.stored.has('mfb_auth')); assert.equal(s.events.length, 0);
});
test('current session expiry clears state without a hard page reload', async () => {
  const s = setup(401, { success: false, message: 'Token expired' });
  const request = s.api.getDashboardSummary(); s.respond(); await assert.rejects(request, /Token expired/);
  assert.equal(s.stored.size, 0); assert.deepEqual(s.events, ['mfb-admin-session-expired']);
});
test('late unauthorized responses cannot clear a newer login', async () => {
  const s = setup(401, { success: false, message: 'Old token expired' });
  const request = s.api.getDashboardSummary();
  s.stored.set('mfb_auth', JSON.stringify({ accessToken: 'new-token' })); s.respond(); await assert.rejects(request);
  assert.equal(JSON.parse(s.stored.get('mfb_auth')).accessToken, 'new-token'); assert.equal(s.events.length, 0);
});
