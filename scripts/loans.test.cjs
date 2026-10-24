const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const compile = f => ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const load = entry => {
  const mods = {}, calls = [];
  const local = { './types': 'src/api/types.ts', './kycConfiguration': 'src/api/kycConfiguration.ts', './productCodes': 'src/api/productCodes.ts' };
  const req = f => { if (mods[f]) return mods[f]; const exports = {}; mods[f] = exports;
    vm.runInNewContext(compile(f), { exports, Date, require: n => n === './config' ? { API_BASE_URL: 'https://backend.test/api/v1', ADMIN_API_KEY: '' } : local[n] ? req(local[n]) : (() => { throw Error(n) })(),
      localStorage: { getItem: () => null }, fetch: async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ success: true, data: {} }) } } });
    return exports };
  return { mod: req(entry), calls };
};
const L = load('src/api/loans.ts').mod;
const plain = v => JSON.parse(JSON.stringify(v));

// Live shapes (2026-10-24), values made up.
const product = { id: 'p1', code: 'PERSONAL_001', name: 'Personal Loan', minAmount: 10000, maxAmount: 500000, monthlyRatePercent: 4, minTenureMonths: 3, maxTenureMonths: 24,
  maxPreApprovedAmount: 200000, minMonthlyIncome: 30000, minAnnualIncome: 360000, minAccountAgeDays: 30, allowedEmploymentTypes: 'EMPLOYED,SELF_EMPLOYED', active: false };
const app = { id: 'a1', applicationNumber: 'LN1', status: 'PENDING', loanProductCode: 'PERSONAL_001', requestedAmount: 150000, approvedAmount: null, tenureMonths: 6, interestRate: 4,
  totalRepayment: 186000, monthlyIncome: 250000, employmentType: 'FULL_TIME', customer: { id: 'c1', firstName: 'Emeka', lastName: 'Nwosu', accountNumber: '003', createdAt: '2026-09-21T15:25:07', status: 'ACTIVE', txnBlocked: false, cbaVerified: true } };

test('editing a product keeps every saved rule (no silent reset to 0 or Active)', () => {
  const [p] = L.readLoanProducts([product]);
  const form = L.loanProductToForm(p);
  const { payload } = L.loanProductPayload(form, 'admin-1');
  assert.equal(payload.minMonthlyIncome, 30000); assert.equal(payload.minAnnualIncome, 360000); assert.equal(payload.minAccountAgeDays, 30);
  assert.equal(payload.maxPreApprovedAmount, 200000); assert.equal(payload.allowedEmploymentTypes, 'EMPLOYED,SELF_EMPLOYED'); assert.equal(payload.active, false);
});

test('product form rejects impossible limits', () => {
  const [p] = L.readLoanProducts([product]); const f = L.loanProductToForm(p);
  assert.match(L.loanProductPayload({ ...f, minAmount: '600000' }, 'a').error, /Minimum amount cannot be more/);
  assert.match(L.loanProductPayload({ ...f, minTenureMonths: '30' }, 'a').error, /Minimum tenure/);
  assert.match(L.loanProductPayload({ ...f, minTenureMonths: '1.5' }, 'a').error, /whole number/);
  assert.match(L.loanProductPayload({ ...f, maxPreApprovedAmount: '900000' }, 'a').error, /pre-approved/);
  assert.match(L.loanProductPayload({ ...f, code: 'bad code' }, 'a').error, /Code/);
});

test('repayment matches the backend flat-rate figures', () => {
  assert.deepEqual(plain(L.repaymentEstimate(150000, 4, 6)), { total: 186000, interest: 36000, monthly: 31000 });
  const a = L.readLoanApp(app);
  assert.deepEqual(plain(L.appRepayment(a)), { total: 186000, interest: 36000, monthly: 31000 });
  assert.equal(L.appRepayment({ ...a, approved: 100000 }).total, 124000);
});

test('eligibility checks flag real problems', () => {
  const [p] = L.readLoanProducts([product]);
  const a = L.readLoanApp(app);
  const now = new Date('2026-10-24T12:00:00');
  const byLabel = Object.fromEntries(L.eligibilityChecks(a, p, now).map(c => [c.label, c.result]));
  assert.equal(byLabel['Amount within product limits'], 'pass');
  assert.equal(byLabel['Minimum monthly income'], 'pass');
  assert.equal(byLabel['Account age'], 'pass');
  assert.equal(byLabel['Employment type allowed'], 'fail'); // FULL_TIME isn't in EMPLOYED,SELF_EMPLOYED
  assert.equal(byLabel['Affordability'], 'pass'); // 31,000 / 250,000 = 12%
  const poor = L.eligibilityChecks(L.readLoanApp({ ...app, monthlyIncome: 50000, requestedAmount: 600000, customer: { ...app.customer, txnBlocked: true } }), p, now);
  const r = Object.fromEntries(poor.map(c => [c.label, c.result]));
  assert.equal(r['Amount within product limits'], 'fail'); assert.equal(r['Affordability'], 'warn'); assert.equal(r['Account not blocked'], 'fail');
  assert.equal(L.eligibilityChecks(a, null, now)[0].result, 'unknown');
});

test('loan requirements are saved in the documented shape, and notes post as comments', async () => {
  const { mod, calls } = load('src/api/index.ts');
  await mod.updateLoanProductRequirements('p1', [{ fieldKey: 'employmentLetter', label: 'Employment Letter', fieldType: 'file', required: true, fieldOrder: 1 }], 'admin-1');
  assert.equal(calls[0].url, 'https://backend.test/api/v1/bank-admin/loans/products/p1/requirements');
  assert.deepEqual(JSON.parse(calls[0].init.body), { adminId: 'admin-1', requirements: [{ fieldKey: 'employmentLetter', label: 'Employment Letter', fieldType: 'file', required: true, fieldOrder: 1 }] });
  await mod.addLoanComment('a1', 'Employer confirmed');
  assert.equal(calls[1].url, 'https://backend.test/api/v1/bank-admin/loans/applications/a1/comments');
  assert.deepEqual(JSON.parse(calls[1].init.body), { comment: 'Employer confirmed' });
});
