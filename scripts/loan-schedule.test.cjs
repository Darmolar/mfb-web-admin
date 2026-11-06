const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const load = f => { const exports = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, Number, Math, Array, Set }); return exports; };
const S = load('src/api/loanSchedule.ts');
const plain = v => JSON.parse(JSON.stringify(v));

// Example from the backend contract (2026-11-06).
const sample = 'installment_number,due_date,principal_due,interest_due,total_due\n1,2026-12-01,10000.00,2500.00,12500.00\n2,2027-01-01,10000.00,2500.00,12500.00\n';

test('the documented CSV parses, with or without a header, and is re-sent with a header', () => {
  for (const text of [sample, sample.split('\n').slice(1).join('\r\n')]) {
    const r = S.parseScheduleCsv(text, 20000);
    assert.deepEqual(plain(r.errors), []); assert.deepEqual(plain(r.warnings), []);
    assert.deepEqual(plain(r.rows.map(x => [x.installment, x.dueDate, x.total])), [[1, '2026-12-01', 12500], [2, '2027-01-01', 12500]]);
    // Whatever the server does with line 1, instalment 1 survives.
    assert.equal(S.scheduleToCsv(r.rows), sample);
  }
});

test('bad rows are reported by line and block the upload', () => {
  const r = S.parseScheduleCsv('1,2026-12-01,10000,2500,12000\n2,01/01/2027,₦10000,2500,12500\n3,2027-02-01,10000,2500\n', null);
  assert.equal(r.errors.length, 3);
  assert.match(r.errors[0], /Line 1: total 12000 is not principal \+ interest \(12500.00\)/);
  assert.match(r.errors[1], /Line 2: due date "01\/01\/2027".*principal "₦10000"/);
  assert.match(r.errors[2], /Line 3: expected 5 columns, found 4/);
  assert.match(S.parseScheduleCsv('1,2026-02-30,1,1,2\n').errors[0], /real date/);
  assert.match(S.parseScheduleCsv('1,2026-12-01,1,1,2\n1,2027-01-01,1,1,2\n').errors[0], /1 appears more than once/);
  assert.match(S.parseScheduleCsv('1,2026-12-01,1,1,2\n3,2027-01-01,1,1,2\n').errors[0], /no gaps/);
  assert.match(S.parseScheduleCsv('installment_number,due_date\n').errors[0], /no instalment rows/);
});

test('principal that does not match the approved amount, or dates out of order, are warnings', () => {
  const r = S.parseScheduleCsv('1,2027-01-01,10000,2500,12500\n2,2026-12-01,10000,2500,12500\n', 100000);
  assert.deepEqual(plain(r.errors), []);
  assert.equal(r.warnings.length, 2);
  assert.match(r.warnings[1], /approved amount is ₦100,000/);
});

test('API rows are read in instalment order and totals use what is unpaid', () => {
  const rows = S.readSchedule([
    { installmentNumber: 2, dueDate: '2027-01-01', principalDue: 10000, interestDue: 2500, totalDue: 12500, amountPaid: 5000, status: 'PARTIALLY_PAID', paidAt: null },
    { installmentNumber: 1, dueDate: '2026-12-01', principalDue: 10000, interestDue: 2500, totalDue: 12500, amountPaid: 12500, status: 'PAID', paidAt: '2026-11-30T10:00:00' },
  ]);
  assert.deepEqual(plain(rows.map(r => r.installment)), [1, 2]);
  const t = S.scheduleTotals(rows);
  assert.equal(t.total, 25000); assert.equal(t.paid, 17500); assert.equal(t.outstanding, 7500); assert.equal(t.next.installment, 2);
  assert.deepEqual(plain(S.readSchedule(null)), []);
});

test('upload is offered only for DISBURSED loans; the template matches the flat-rate maths', () => {
  assert.equal(S.canUploadSchedule('DISBURSED'), true);
  for (const s of ['APPROVED', 'OFFER_ACCEPTED', 'ACTIVE', 'CLOSED']) assert.equal(S.canUploadSchedule(s), false, s);
  const rows = S.scheduleTemplate(100000, 6, 4, '2026-01-31T09:00:00');
  assert.equal(rows.length, 6); assert.equal(rows[0].dueDate, '2026-02-28'); assert.equal(rows[0].interest, 4000);
  assert.equal(Math.round(rows.reduce((s, r) => s + r.principal, 0) * 100) / 100, 100000);
  assert.equal(Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100, 124000);
  assert.deepEqual(plain(S.parseScheduleCsv(S.scheduleToCsv(rows), 100000).errors), []);
});
