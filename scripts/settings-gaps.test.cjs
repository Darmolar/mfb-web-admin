const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(body) {
  const seen = [], modules = {};
  function load(file) {
    if (modules[file]) return modules[file];
    const exports = modules[file] = {};
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(source, { exports, require: name => name === './config' ? { API_BASE_URL: 'https://bank.test/api/v1', ADMIN_API_KEY: '' } : load(`src/api/${name.slice(2)}.ts`),
      localStorage: { getItem: () => JSON.stringify({ accessToken: 't' }) },
      fetch: async (url, init) => { seen.push({ url, init }); return { ok: true, status: 200, json: async () => body }; } });
    return exports;
  }
  return { api: load('src/api/index.ts'), seen };
}
const gl = { 'gl.account.loan': '', 'gl.account.card_fee': '0011', 'savings.account.pool': '0022', 'nip.fee.threshold': '5000', 'nip.fee.below_threshold': '10.75', 'nip.fee.above_threshold': '26.88' };
test('GL settings read card_fee, savings pool and NIP fee tiers', async () => {
  const { api, seen } = fixture({ success: true, data: gl });
  const res = await api.getGlAccounts();
  assert.equal(res.data.cardFeeAccount, '0011');
  assert.equal(res.data.savingsPoolAccount, '0022');
  assert.equal(res.data.loanGlAccount, undefined);
  assert.deepEqual({ ...res.nipFees }, { 'nip.fee.threshold': '5000', 'nip.fee.below_threshold': '10.75', 'nip.fee.above_threshold': '26.88' });
  assert.ok(seen[0].url.endsWith('/bank-admin/settings/gl'));
});
test('NIP fee entries go to the gl entry escape hatch; non-GL keys are refused', async () => {
  const { api, seen } = fixture({ success: true });
  await api.setGlEntry('nip.fee.threshold', '6000');
  assert.ok(seen[0].url.endsWith('/bank-admin/settings/gl/entry/nip.fee.threshold'));
  assert.equal(seen[0].init.method, 'PUT');
  assert.equal(seen[0].init.body, JSON.stringify({ value: '6000' }));
  assert.throws(() => api.setGlEntry('vas.charge.bill', '1'));
});
test('CBA product codes load from GET /settings/cba, as a map or key/value list', async () => {
  for (const data of [{ 'cba.product.individual': '208', 'cba.product.corporate': 103 }, [{ key: 'cba.product.individual', value: '208' }, { key: 'cba.product.corporate', value: '103' }]]) {
    const { api, seen } = fixture({ success: true, data });
    assert.deepEqual({ ...await api.getCbaProductCodes() }, { individualProductCode: '208', corporateProductCode: '103' });
    assert.ok(seen[0].url.endsWith('/bank-admin/settings/cba'));
  }
});
