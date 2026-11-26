// Bank, 23 Nov 2026: savings "cash out/break" before maturity with a fee, configured on the bank admin.
// Live products (staging, 26 Nov) carry allowEarlyBreak and earlyBreakPenaltyPercent (Christmas: false, 5).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const S = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/savings.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: S, Date, require: () => ({}) });

const christmas = { id: '44022d1f', code: 'M_FESTIVE', name: 'Christmas', description: 'Holiday savings', minAmount: 100, maxAmount: null,
  annualRatePercent: 10, interestRateType: 'year', compoundingPeriod: 'monthly', interestPostingPeriodType: 'monthly',
  interestCalculationType: 'daily_balance', automaticOpeningBalance: 0, minimumBalanceForInterestCalculation: 0, lockinPeriod: 15,
  lockinType: 'days', minimumBalance: 0, allowOverdraft: false, allowPartialWithdrawal: false, allowEarlyBreak: false,
  earlyBreakPenaltyPercent: 5, overdraftLimit: null, overdraftInterestRate: null, minimumOverdraftForInterest: null,
  daysInYear: '365', daysInMonth: '30', accountingRule: 'none', minDurationDays: 30, maxDurationDays: 365, active: true };

test('editing a product without touching cash out sends the early-break settings back unchanged', () => {
  const [p] = S.readSavingsProducts([christmas]);
  assert.equal(p.allowEarlyBreak, false); assert.equal(p.earlyBreakPenaltyPercent, 5);
  const { payload } = S.savingsProductPayload(S.savingsProductToForm(p), 'admin-1', p);
  assert.equal(payload.allowEarlyBreak, false); assert.equal(payload.earlyBreakPenaltyPercent, 5);
});

test('the bank can allow early cash out and set the fee', () => {
  const [p] = S.readSavingsProducts([christmas]);
  const f = { ...S.savingsProductToForm(p), allowEarlyBreak: true, earlyBreakPenaltyPercent: '2.5' };
  const { payload } = S.savingsProductPayload(f, 'admin-1', p);
  assert.equal(payload.allowEarlyBreak, true); assert.equal(payload.earlyBreakPenaltyPercent, 2.5);
});

test('a fee is required when early cash out is allowed, and must be 0–100%', () => {
  const [p] = S.readSavingsProducts([christmas]);
  const base = { ...S.savingsProductToForm(p), allowEarlyBreak: true };
  assert.match(S.savingsProductPayload({ ...base, earlyBreakPenaltyPercent: '' }, 'a', p).error, /early cash out fee/i);
  assert.match(S.savingsProductPayload({ ...base, earlyBreakPenaltyPercent: '150' }, 'a', p).error, /100%/);
  assert.match(S.savingsProductPayload({ ...base, earlyBreakPenaltyPercent: '-1' }, 'a', p).error, /early cash out fee/i);
});

test('new products start with early cash out off at a 5% fee', () => {
  assert.equal(S.EMPTY_SAVINGS_FORM.allowEarlyBreak, false);
  assert.equal(S.EMPTY_SAVINGS_FORM.earlyBreakPenaltyPercent, '5');
});

test('the product form and list show the setting', () => {
  const ui = fs.readFileSync('src/components/savings/SavingsProducts.tsx', 'utf8');
  assert.match(ui, /set\('allowEarlyBreak'/);
  assert.match(ui, /set\('earlyBreakPenaltyPercent'/);
  assert.match(ui, /Early cash out: \$\{p\.earlyBreakPenaltyPercent/);
});
