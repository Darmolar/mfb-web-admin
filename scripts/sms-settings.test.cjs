const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(body, status = 200) {
  const seen = [], modules = {};
  function load(file) {
    if (modules[file]) return modules[file];
    const exports = modules[file] = {};
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(source, { exports, require: name => name === './config' ? { API_BASE_URL: 'https://bank.test/api/v1', ADMIN_API_KEY: '' } : load(`src/api/${name.slice(2)}.ts`),
      localStorage: { getItem: () => JSON.stringify({ accessToken: 'session-token' }) },
      fetch: async (url, init) => { seen.push({ url, init }); return { ok: status < 400, status, json: async () => body }; },
    });
    return exports;
  }
  return { api: load('src/api/index.ts'), seen };
}
const settings = { welcome: { enabled: false, template: 'Hello {firstName}', placeholders: '{firstName}, {accountNumber}' } };
test('SMS settings accept documented raw maps and wrapped maps without losing disabled state', async () => {
  for (const body of [settings, { success: true, data: settings }]) {
    const { api, seen } = fixture(body);
    const result = await api.getSmsSettings();
    assert.equal(result.welcome.enabled, false);
    assert.equal(result.welcome.template, settings.welcome.template);
    assert.equal(seen[0].url, 'https://bank.test/api/v1/bank-admin/settings/notifications/sms');
    assert.equal(seen[0].init.headers.Authorization, 'Bearer session-token');
  }
});
test('SMS metadata uses the types endpoint and retains template placeholders', async () => {
  const { api, seen } = fixture({ welcome: { defaultTemplate: 'Welcome {firstName}', placeholders: '{firstName}' } });
  assert.equal((await api.getSmsTypes()).welcome.defaultTemplate, 'Welcome {firstName}');
  assert.ok(seen[0].url.endsWith('/sms/types'));
});
test('SMS individual and bulk updates preserve false and literal template placeholders', async () => {
  const { api, seen } = fixture({ success: true });
  await api.updateSmsType('welcome', { enabled: false });
  await api.updateSmsSettings([{ type: 'kyc_approved', template: 'Congrats {tier} approved!' }]);
  assert.ok(seen[0].url.endsWith('/sms/welcome'));
  assert.equal(seen[0].init.method, 'PUT');
  assert.deepEqual(JSON.parse(seen[0].init.body), { enabled: false });
  assert.deepEqual(JSON.parse(seen[1].init.body), { updates: [{ type: 'kyc_approved', template: 'Congrats {tier} approved!' }] });
});
test('SMS failures and malformed maps cannot appear as saved settings', async () => {
  await assert.rejects(fixture({ success: false, message: 'Permission denied' }, 403).api.getSmsSettings(), /Permission denied/);
  await assert.rejects(fixture({ message: 'not settings' }).api.getSmsSettings(), /invalid/);
  await assert.rejects(fixture({ success: false, message: 'Invalid template' }).api.updateSmsType('welcome', { template: 'bad' }), /Invalid template/);
});
