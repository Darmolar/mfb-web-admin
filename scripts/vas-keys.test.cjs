const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const exports_ = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/vasKeys.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exports_ });
const v = exports_;

test('raw keys get plain labels and the right kind', () => {
  assert.equal(v.vasKeyLabel('vas.cashback.cable_tv'), 'Cable TV cashback');
  assert.equal(v.vasKeyLabel('vas.charge.bvn'), 'BVN charge');
  assert.equal(v.vasKeyLabel('vas.account.bvn_expenses'), 'BVN Expenses account');
  assert.equal(v.vasKeyLabel('vas.airtime.enabled'), 'Airtime service');
  assert.equal(v.vasKeyLabel('vas.cable_tv_enabled'), 'Cable TV Enabled');
  assert.equal(v.vasKeyKind('vas.cashback.airtime', '0.055'), 'percent');
  assert.equal(v.vasKeyKind('vas.charge.bill', '50'), 'money');
  assert.equal(v.vasKeyKind('vas.airtime.enabled', 'true'), 'switch');
  assert.equal(v.vasKeyKind('vas.provider.name', true), 'switch');
  assert.equal(v.vasKeyKind('vas.account.cashback', '1020'), 'account');
  assert.equal(v.vasKeyKind('vas.provider.name', 'vtpass'), 'text');
});

test('cashback is shown and edited as a percentage but stored as a fraction', () => {
  assert.equal(v.formatVasValue('percent', '0.055'), '5.5%');
  assert.equal(v.editorValue('percent', 0.055), '5.5');
  assert.deepEqual({ ...v.toStoredValue('percent', '5.5') }, { value: '0.055' });
  assert.match(v.toStoredValue('percent', '150').error, /between 0 and 100/);
});

test('charges, switches and accounts validate before anything is sent', () => {
  assert.equal(v.formatVasValue('money', '50'), '₦50.00');
  assert.deepEqual({ ...v.toStoredValue('money', '49.999') }, { value: '50' });
  assert.match(v.toStoredValue('money', '-1').error, /0 or more/);
  assert.equal(v.formatVasValue('switch', 'TRUE'), 'On');
  assert.equal(v.editorValue('switch', null), 'false');
  assert.deepEqual({ ...v.toStoredValue('switch', 'false') }, { value: 'false' });
  assert.match(v.toStoredValue('account', '12a').error, /digits/);
  assert.match(v.toStoredValue('text', '  ').error, /Enter a value/);
  assert.equal(v.formatVasValue('money', null), 'Not set');
});
