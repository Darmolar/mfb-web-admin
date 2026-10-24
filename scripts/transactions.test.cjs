const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const ex = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/transactions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: ex, Date, Math, Number, Map, Set });
const plain = v => JSON.parse(JSON.stringify(v));

// Shapes mirror the live endpoints (2026-10-24); values are made up.
const allRow = { id: 'a1', customerId: 'c1', txnType: 'AIRTIME', amount: 200, fee: 0, status: 'FAILED', reference: 'R1', description: '0800', debitAccount: '200', creditAccount: null, createdAt: '2026-10-19T14:36:22' };
const transferRow = { id: 't1', customer: { id: 'c1', firstName: 'Ada', lastName: 'Obi', accountNumber: '200' }, transferType: 'TO_OTHER_BANK', debitAccount: '200', creditAccount: '300', beneficiaryName: 'Ben', bankName: 'GTBank', amount: 5000, fee: 25, narration: 'rent', transactionReference: 'R2', status: 'SUCCESS', failureReason: null, ipAddress: '1.2.3.4', latitude: null, longitude: null, createdAt: '2026-10-20T09:00:00' };

test('both endpoints read into one shape; no invented channel or location', () => {
  const a = ex.readTxn(allRow), t = ex.readTxn(transferRow);
  assert.equal(a.typeLabel, 'Airtime'); assert.equal(a.reference, 'R1'); assert.equal(a.description, '0800'); assert.equal(a.group, 'failed');
  assert.equal(t.typeLabel, 'Other bank'); assert.equal(t.reference, 'R2'); assert.equal(t.customerName, 'Ada Obi'); assert.equal(t.description, 'rent');
  assert.equal(t.location, null);
  assert.deepEqual(plain(ex.readTxn({ ...transferRow, latitude: 7.2, longitude: 5.2 }).location), { lat: 7.2, lng: 5.2 });
  assert.equal(ex.readTxn({ ...transferRow, latitude: 0, longitude: 0 }).location, null);
  assert.equal('channel' in t, false);
});

test('loan states are grouped so every status is counted somewhere', () => {
  assert.deepEqual(['SUCCESS', 'DISBURSED', 'CLOSED', 'APPROVED', 'PENDING', 'FAILED', 'REVERSED', 'WEIRD'].map(ex.statusGroup),
    ['success', 'success', 'success', 'pending', 'pending', 'failed', 'reversed', 'other']);
  const s = ex.summarise([ex.readTxn(allRow), ex.readTxn(transferRow), ex.readTxn({ ...allRow, id: 'l', txnType: 'LOAN', status: 'APPROVED', amount: 150000 })]);
  assert.equal(s.count, 3);
  assert.equal(s.byGroup.success.count + s.byGroup.pending.count + s.byGroup.failed.count, 3);
});

test('period filter, daily buckets with gaps filled, hours and destinations', () => {
  const now = new Date('2026-10-24T12:00:00');
  const txns = [ex.readTxn(allRow), ex.readTxn(transferRow), ex.readTxn({ ...transferRow, id: 't2', transactionReference: 'R3', status: 'FAILED', failureReason: 'Insufficient funds', createdAt: '2026-09-01T10:00:00' })];
  assert.equal(ex.inPeriod(txns, '7', now).length, 2);
  assert.equal(ex.inPeriod(txns, 'all', now).length, 3);
  const days = ex.trend(ex.inPeriod(txns, '7', now), '7', now);
  assert.equal(days.length, 7);
  assert.deepEqual(plain(days.filter(d => d.success || d.failed).map(d => [d.key, d.success, d.failed])), [['2026-10-19', 0, 1], ['2026-10-20', 1, 0]]);
  assert.ok(ex.trend(txns, 'all', now)[0].label.endsWith('wk') === false); // 54 days stays daily
  assert.equal(ex.byHour(txns)[9].count, 1);
  assert.deepEqual(plain(ex.byDestination([ex.readTxn(transferRow)])), [{ label: 'GTBank', count: 1, value: 5000 }]);
  assert.deepEqual(plain(ex.failureReasons(txns)), [{ reason: 'Insufficient funds', count: 1 }]);
  const types = plain(ex.typeStats(txns));
  assert.deepEqual(types.map(t => [t.label, t.count, t.rate]), [['Other bank', 2, 50], ['Airtime', 1, 0]]);
});

test('CSV export quotes commas and defuses spreadsheet formulas', () => {
  const csv = ex.transfersCsv([ex.readTxn({ ...transferRow, beneficiaryName: '=HYPERLINK("x")', narration: 'rent, Oct' })]);
  const [head, row] = csv.split('\r\n');
  assert.match(head, /^Reference,Date,Status/);
  assert.match(row, /"'=HYPERLINK\(""x""\)"/);
  assert.match(row, /"rent, Oct"/);
});
