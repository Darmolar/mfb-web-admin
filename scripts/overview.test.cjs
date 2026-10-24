const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const O = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/overview.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: O, Date, require: () => ({}) });
const plain = v => JSON.parse(JSON.stringify(v));

test('summary reads the live field names and the older ones', () => {
  // Live response, 2026-10-24.
  const live = O.readSummary({ totalCustomers: 11, activeCustomers: 11, pendingCustomers: 0, pendingKycCount: 2, todayTransactionCount: 0, todayTransactionVolume: 0, openComplianceFlags: 3 });
  assert.equal(live.activeCustomers, 11); assert.equal(live.pendingKyc, 2); assert.equal(live.openFlags, 3); assert.equal(live.todayCount, 0);
  const old = O.readSummary({ totalCustomers: 5, activeAccounts: 4, pendingKyc: 1, complianceFlags: 2 });
  assert.equal(old.activeCustomers, 4); assert.equal(old.pendingKyc, 1); assert.equal(old.openFlags, 2);
  assert.equal(O.readSummary(null).totalCustomers, null);
});

test('pending KYC takes the name from the nested customer', () => {
  const [k] = O.readKycPending({ content: [{ id: 'k1', customer: { firstName: 'Ada', lastName: 'Obi', accountNumber: '100' }, currentTier: 0, requestedTier: 2, riskLevel: 'low' }] });
  assert.deepEqual(plain([k.name, k.accountNumber, k.currentTier, k.requestedTier, k.risk]), ['Ada Obi', '100', '0', '2', 'LOW']);
  assert.equal(O.readKycPending([{ id: 'k2', customerName: 'Old Style' }])[0].name, 'Old Style');
});

test('customers roll up by tier and by join date', () => {
  const now = Date.parse('2026-10-24T12:00:00');
  const cs = O.readOverviewCustomers({ content: [
    { id: 'a', firstName: 'A', accountTier: 3, createdAt: '2026-10-22T10:00:00' },
    { id: 'b', firstName: 'B', accountTier: 1, createdAt: '2026-09-01T10:00:00' },
    { id: 'c', firstName: 'C', accountTier: 1, createdAt: '2026-10-20T10:00:00' },
  ] });
  assert.deepEqual(plain(O.tierBreakdown(cs)), [{ tier: '1', count: 2 }, { tier: '3', count: 1 }]);
  assert.equal(O.joinedSince(cs, 7, now), 2);
});

test('loan pipeline uses the approved amount once approved', () => {
  const app = (status, requested, approved = null) => ({ status, requested, approved });
  const p = O.loanPipeline([app('PENDING', 150000), app('APPROVED', 150000, 100000), app('DISBURSED', 150000, 150000), app('DISBURSED', 150000, 150000), app('CLOSED', 150000)]);
  assert.deepEqual(plain(p.pending), { count: 1, amount: 150000 });
  assert.deepEqual(plain(p.approved), { count: 1, amount: 100000 });
  assert.deepEqual(plain(p.disbursed), { count: 2, amount: 300000 });
});

test('savings totals and greeting', () => {
  const t = O.savingsTotals([{ status: 'ACTIVE', balance: 50, target: 100 }, { status: 'COMPLETED', balance: 100, target: 100 }]);
  assert.deepEqual(plain(t), { goals: 2, active: 1, saved: 150, target: 200, progress: 75 });
  assert.equal(O.greeting(new Date('2026-10-24T09:00:00')), 'Good morning');
  assert.equal(O.greeting(new Date('2026-10-24T18:00:00')), 'Good evening');
});
