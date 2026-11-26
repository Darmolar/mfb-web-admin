// 2026-11-17: disbursing loan LN27E61B59C4 on staging failed with "Loan account number must be set at approval before
// disbursement." The backend then added PATCH /bank-admin/loans/applications/{id}/loan-account { adminId,
// loanAccountNumber } (and loanAccountNumber on approve). The admin had no way to enter it.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const compile = f => ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const load = entry => {
  const mods = {}, calls = [];
  const local = { './types': 'src/api/types.ts', './kycConfiguration': 'src/api/kycConfiguration.ts', './productCodes': 'src/api/productCodes.ts', './loans': 'src/api/loans.ts', './cards': 'src/api/cards.ts', './cardfusion': 'src/api/cardfusion.ts', './pagination': 'src/api/pagination.ts', './roles': 'src/api/roles.ts', './identityVerification': 'src/api/identityVerification.ts', './loanSchedule': 'src/api/loanSchedule.ts' };
  const req = f => { if (mods[f]) return mods[f]; const exports = {}; mods[f] = exports;
    vm.runInNewContext(compile(f), { exports, Date, URLSearchParams, FormData, Blob, console, require: n => n === './config' ? { API_BASE_URL: 'https://backend.test/api/v1', ADMIN_API_KEY: '' } : local[n] ? req(local[n]) : {},
      localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
      fetch: async (url, init) => { calls.push({ url: String(url), init }); return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ success: true, data: {} }), text: async () => '{"success":true,"data":{}}' }; } });
    return exports };
  return { mod: req(entry), calls };
};
const plain = v => JSON.parse(JSON.stringify(v));

test('the loan account is sent to PATCH …/loan-account, and optionally with approve', async () => {
  const { mod: api, calls } = load('src/api/index.ts');
  await api.setLoanAccount('27e61b59-c49e-49bd-a4f4-d2f6a511cec6', { adminId: 'admin-1', loanAccountNumber: '3000012345' });
  const set = calls.at(-1);
  assert.match(set.url, /\/v1\/bank-admin\/loans\/applications\/27e61b59-c49e-49bd-a4f4-d2f6a511cec6\/loan-account$/);
  assert.equal(set.init.method, 'PATCH');
  assert.deepEqual(JSON.parse(set.init.body), { adminId: 'admin-1', loanAccountNumber: '3000012345' });
  await api.approveLoanApplication('L1', { adminId: 'a', approvedAmount: 50000, notes: 'ok', loanAccountNumber: '3000012345' });
  assert.deepEqual(JSON.parse(calls.at(-1).init.body), { adminId: 'a', approvedAmount: 50000, notes: 'ok', loanAccountNumber: '3000012345' });
});

test('loan account input: trimmed, letters/digits/dashes, 6–30 long', () => {
  const L = load('src/api/loans.ts').mod;
  assert.equal(L.cleanLoanAccount('  3000012345 '), '3000012345');
  assert.equal(L.cleanLoanAccount('LN-0001234'), 'LN-0001234');
  for (const bad of ['', '   ', '12345', '3000 012345', '3000/012345', 'x'.repeat(31)]) assert.equal(L.cleanLoanAccount(bad), undefined, JSON.stringify(bad));
});

test('the loan account can be set or changed until payout', () => {
  const L = load('src/api/loans.ts').mod;
  for (const s of ['APPROVED', 'OFFER_ACCEPTED']) assert.equal(L.loanActions(s).canSetLoanAccount, true, s);
  for (const s of ['PENDING', 'DECLINED', 'DISBURSED', 'ACTIVE', 'CLOSED']) assert.equal(L.loanActions(s).canSetLoanAccount, false, s);
});

test('the page offers Set/Change loan account, and Disburse waits for it', () => {
  const src = fs.readFileSync('src/components/loans/LoanApplicationDetailsPage.tsx', 'utf8');
  assert.ok(src.includes("{app.coreLoanAccount ? 'Change loan account' : 'Set loan account'}"));
  assert.ok(src.includes("<Button onClick={() => setAction('disburse')} disabled={!app.coreLoanAccount}"), 'Disburse button disabled without it');
  assert.ok(src.includes("footer={footer('Mark as disbursed', 'primary', !app.coreLoanAccount"), 'and in the window'); // label changed 26 Nov
  assert.ok(src.includes('run(() => setLoanAccount(app.id, { adminId, loanAccountNumber: cleanAccount! })'));
  assert.ok(src.includes("...(cleanAccount ? { loanAccountNumber: cleanAccount } : {})"), 'optional on approve, sent only when filled');
});
