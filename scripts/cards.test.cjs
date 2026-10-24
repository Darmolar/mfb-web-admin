const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
function load(entry) {
  const modules = {}, calls = [];
  const local = { './types': 'src/api/types.ts', './kycConfiguration': 'src/api/kycConfiguration.ts', './productCodes': 'src/api/productCodes.ts' };
  function req(file) {
    if (modules[file]) return modules[file];
    const exports = {}; modules[file] = exports;
    vm.runInNewContext(compile(file), { exports, require: n => n === './config' ? { API_BASE_URL: 'https://backend.test/api/v1', ADMIN_API_KEY: '' } : local[n] ? req(local[n]) : (() => { throw Error(n) })(),
      localStorage: { getItem: () => null }, fetch: async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ success: true, data: {} }) } } });
    return exports;
  }
  return { mod: req(entry), calls };
}
const c = load('src/api/cards.ts').mod;

// Shapes mirror the live backend (2026-10-24); values are made up.
const liveRequest = {
  id: 'r1', status: 'REQUESTED', cardType: 'MASTERCARD', maskedPan: null, expiryMonth: null, expiryYear: null, linkedAccount: '1000000001',
  deliveryAddress: '1 Test Street', issuanceFee: 1500, feePaid: false, dailyAtmLimit: 200000, dailyPosLimit: 1000000, dailyWebLimit: 500000,
  requestReference: 'CARD123', createdAt: '2026-10-22T16:01:25',
  customer: { id: 'c1', username: 'tester', firstName: 'Ada', middleName: 'B', lastName: 'Obi', phoneNumber: '0800', email: 'a@b.c', bvn: '22200000111', accountTier: 3 },
  cardProduct: { id: 'p1', code: 'MASTERCARD_CLASSIC', cardType: 'MASTERCARD', name: 'Mastercard Classic Debit Card', issuanceFee: 1500 },
  linkedBankAccount: { accountNumber: '1000000001', accountName: 'MS. ADA OBI' },
};

test('products read the live `active` flag instead of a missing status', () => {
  const [on, off] = c.readCardProducts([{ id: 'p1', code: 'V', name: 'Verve', cardType: 'verve', active: true, issuanceFee: 1000.0 }, { id: 'p2', name: 'Old', status: 'INACTIVE' }]);
  assert.equal(on.active, true); assert.equal(on.cardType, 'VERVE'); assert.equal(on.issuanceFee, 1000);
  assert.equal(off.active, false);
  assert.equal(c.readCardProducts([{ id: 'p3', status: 'ACTIVE' }])[0].active, true);
});

test('requests read the nested customer, product and account', () => {
  const { requests: [r], total } = c.readCardRequests({ content: [liveRequest], totalElements: 14 });
  assert.equal(total, 14);
  assert.equal(r.customerName, 'Ada B Obi');
  assert.equal(r.productName, 'Mastercard Classic Debit Card');
  assert.equal(r.linkedAccount, '1000000001');
  assert.equal(r.deliveryAddress, '1 Test Street');
  assert.equal(r.feePaid, false);
  assert.equal(r.maskedPan, '');
  assert.equal(c.readCardRequest({ ...liveRequest, expiryMonth: 3, expiryYear: 2029 }).expiry, '03/29');
  assert.equal(c.maskBvn('22200000111'), '222•••••111');
});

test('only documented transitions are offered', () => {
  assert.deepEqual({ ...c.cardRequestActions('REQUESTED') }, { canDecide: true, canDispatch: false });
  assert.deepEqual({ ...c.cardRequestActions('APPROVED') }, { canDecide: false, canDispatch: true });
  for (const s of ['ACTIVE', 'FROZEN', 'ISSUED', 'REJECTED']) assert.deepEqual({ ...c.cardRequestActions(s) }, { canDecide: false, canDispatch: false });
});

test('product form validates and builds the documented payload', () => {
  const form = { ...c.EMPTY_PRODUCT_FORM, code: 'verve_gold', name: ' Verve Gold ', issuanceFee: '1000', replacementFee: '500', defaultAtmLimit: '50000', defaultPosLimit: '150000', defaultWebLimit: '100000' };
  const { payload } = c.productPayload(form, 'admin-1');
  assert.equal(payload.code, 'VERVE_GOLD'); assert.equal(payload.name, 'Verve Gold'); assert.equal(payload.issuanceFee, 1000); assert.equal(payload.adminId, 'admin-1');
  assert.match(c.productPayload({ ...form, code: 'bad code' }, 'a').error, /Code/);
  assert.match(c.productPayload({ ...form, defaultPosLimit: '-5' }, 'a').error, /POS limit/);
  assert.match(c.productPayload({ ...form, replacementFee: '' }, 'a').error, /Replacement fee/);
});

test('requirements are renumbered and checked before saving', () => {
  const { requirements } = c.cleanRequirements([
    { fieldKey: 'idType', label: 'ID type', fieldType: 'select', optionsCsv: 'NIN, Passport', required: true, fieldOrder: 9 },
    { fieldKey: 'idNumber', label: 'ID number', fieldType: 'text', optionsCsv: 'ignored', required: false },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(requirements.map(r => [r.fieldKey, r.fieldOrder, r.optionsCsv]))), [['idType', 1, 'NIN, Passport'], ['idNumber', 2, '']]);
  assert.match(c.cleanRequirements([{ fieldKey: 'a', label: 'A' }, { fieldKey: 'a', label: 'B' }]).error, /used twice/);
  assert.match(c.cleanRequirements([{ fieldKey: '1bad', label: 'A' }]).error, /key/);
  assert.match(c.cleanRequirements([{ fieldKey: 'x', label: 'X', fieldType: 'select' }]).error, /options/);
});

test('status updates send status, comment and the acting admin', async () => {
  const { mod, calls } = load('src/api/index.ts');
  await mod.updateCardRequestStatus('r1', 'APPROVED', 'admin-1', 'Approved for printing');
  assert.equal(calls[0].url, 'https://backend.test/api/v1/bank-admin/cards/requests/r1/status');
  assert.equal(calls[0].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].init.body), { status: 'APPROVED', comment: 'Approved for printing', adminId: 'admin-1' });
});
