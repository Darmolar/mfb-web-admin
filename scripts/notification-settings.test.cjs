const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function loadApi() {
  const modules = {};
  function load(file) {
    if (modules[file]) return modules[file];
    const exports = modules[file] = {};
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(source, { exports, require: name => name === './config' ? { API_BASE_URL: 'https://bank.test/api/v1', ADMIN_API_KEY: '' } : load(`src/api/${name.slice(2)}.ts`), localStorage: { getItem: () => null } });
    return exports;
  }
  return load('src/api/index.ts');
}
const { parseNotificationSettings } = loadApi();
const flat = {
  transaction: { enabled: true, template: '[Memphis MFB] {type}: N{amount}', placeholders: '{type}, {typePast}, {amount}' },
  device_locked: { enabled: false, template: 'Memphis MFB: Device registration locked for {minutes}', placeholders: '{minutes}' },
};
test('flat type map inside the envelope (staging shape) becomes SMS rows, keeping disabled state', () => {
  const { sms, email } = parseNotificationSettings({ success: true, data: flat });
  assert.deepEqual([...sms.map(r => r.type)], ['transaction', 'device_locked']);
  assert.equal(sms[1].enabled, false);
  assert.deepEqual([...sms[0].placeholders], ['{type}', '{typePast}', '{amount}']);
  assert.equal(email.length, 0);
});
test('bare flat map parses the same way', () => {
  assert.equal(parseNotificationSettings(flat).sms.length, 2);
});
test('rows naming the email channel go to email', () => {
  const { sms, email } = parseNotificationSettings({ data: { ...flat, welcome_email: { enabled: true, channel: 'EMAIL', description: 'Welcome' } } });
  assert.equal(sms.length, 2);
  assert.equal(email[0].type, 'welcome_email');
});
test('channel-grouped shapes still work, with or without a channels wrapper', () => {
  for (const data of [{ sms: flat, email: {} }, { channels: { sms: flat, email: {} } }]) {
    assert.equal(parseNotificationSettings({ success: true, data }).sms.length, 2);
  }
});
test('unknown shapes yield empty lists', () => {
  for (const raw of [null, [], { success: true, data: { message: 'x' } }]) {
    const r = parseNotificationSettings(raw);
    assert.equal(r.sms.length + r.email.length, 0);
  }
});
