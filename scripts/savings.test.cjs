const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const ex = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/savings.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: ex, Date, require: () => ({}) });
const S = ex;
const plain = v => JSON.parse(JSON.stringify(v));

// Live M-Investors (2026-10-24).
const investors = { id: 'p3', code: 'M_INVESTORS', name: 'M-Investors', description: 'Fixed deposit savings.', minAmount: 5000, maxAmount: null, annualRatePercent: 22,
  interestRateType: 'year', compoundingPeriod: 'monthly', interestPostingPeriodType: 'monthly', interestCalculationType: 'daily_balance', automaticOpeningBalance: 0,
  minimumBalanceForInterestCalculation: 0, lockinPeriod: 90, lockinType: 'days', minimumBalance: 0, allowOverdraft: false, allowPartialWithdrawal: false,
  overdraftLimit: null, overdraftInterestRate: null, minimumOverdraftForInterest: null, daysInYear: '365', daysInMonth: '30', accountingRule: 'none',
  minDurationDays: 90, maxDurationDays: 365, active: true };

test('saving an unchanged product sends every setting back as it was', () => {
  const [p] = S.readSavingsProducts([investors]);
  const { payload } = S.savingsProductPayload(S.savingsProductToForm(p), 'admin-1', p);
  for (const k of Object.keys(investors).filter(k => k !== 'id')) assert.deepEqual(payload[k], investors[k], k);
  assert.equal(payload.maxAmount, null); // "no maximum" stays null, never 0
  assert.equal(payload.adminId, 'admin-1');
});

test('blank maximums mean no limit; impossible values are refused', () => {
  const f = { ...S.EMPTY_SAVINGS_FORM, code: 'm_new', name: 'New', annualRatePercent: '12' };
  const { payload } = S.savingsProductPayload(f, 'a');
  assert.equal(payload.code, 'M_NEW'); assert.equal(payload.maxAmount, null); assert.equal(payload.maxDurationDays, null);
  assert.equal(payload.daysInYear, '365'); assert.equal(payload.interestRateType, 'year');
  assert.match(S.savingsProductPayload({ ...f, minAmount: '5000', maxAmount: '100' }, 'a').error, /Minimum deposit/);
  assert.match(S.savingsProductPayload({ ...f, minDurationDays: '400', maxDurationDays: '365' }, 'a').error, /Minimum duration/);
  assert.match(S.savingsProductPayload({ ...f, annualRatePercent: '' }, 'a').error, /annual interest rate/i);
  assert.match(S.savingsProductPayload({ ...f, lockinPeriod: '2.5' }, 'a').error, /whole number/);
});

test('interest estimate compounds as configured', () => {
  assert.equal(S.interestEstimate(100000, 12, 365, 'monthly'), 12682.5);
  assert.equal(S.interestEstimate(100000, 12, 365, 'annually'), 12000);
  assert.equal(S.lockinLabel({ lockinPeriod: 90, lockinType: 'days' }), '90 days');
  assert.equal(S.lockinLabel({ lockinPeriod: 0, lockinType: 'days' }), 'None');
});

test('goals read the live shape with progress and time to maturity', () => {
  const [g] = S.readSavingsGoals({ content: [{ id: 'g1', productCode: 'SAVINGS_001', goalName: 'Emergency Fund', category: 'emergency', targetAmount: 200000, currentBalance: 70000,
    interestRate: 8, durationDays: 180, maturityDate: '2027-03-20', coreAccountNumber: 'SAV-1', status: 'ACTIVE', customer: { id: 'c1', firstName: 'Jide', lastName: 'Afolabi', accountNumber: '0089' } }] },
    new Date('2026-10-24T09:00:00'));
  assert.equal(g.name, 'Emergency Fund'); assert.equal(g.category, 'EMERGENCY'); assert.equal(g.progress, 0.35);
  assert.equal(g.daysToMaturity, 147); assert.equal(g.customerName, 'Jide Afolabi');
  assert.equal(S.maturityLabel(147), 'In about 5 months'); assert.equal(S.maturityLabel(-2), 'Matured 2 days ago'); assert.equal(S.maturityLabel(1), 'In 1 day');
  assert.equal(S.categoryLabel('GADGETS'), 'Gadgets');
});
