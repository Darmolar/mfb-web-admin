// Staging, 26 Nov 2026: POST /bank-admin/loans/applications/{id}/disburse with only adminId marked LN27E61B59C4
// DISBURSED with no loan account number, and no money reached the customer's account. Backend's handoff page says the
// same ("Does NOT make any CBA funds transfer — banker handles that in core banking directly"). The admin must not
// say it pays out; it still asks for the loan account first because the app's core-details needs it.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ui = fs.readFileSync('src/components/loans/LoanApplicationDetailsPage.tsx', 'utf8');

test('disburse is worded as marking, not paying out', () => {
  assert.match(ui, /title="Mark loan as disbursed"/);
  assert.match(ui, /footer\('Mark as disbursed'/);
  assert.match(ui, /This does not move any money\. Book the loan and credit the customer's account in core banking first\./);
  assert.doesNotMatch(ui, /moves money into the customer's account/);
  assert.doesNotMatch(ui, /Paying out/);
  assert.doesNotMatch(ui, /refuses to pay out/);
});

test('the loan account is still required before Disburse, for core-banking balances in the app', () => {
  assert.match(ui, /disabled=\{!app\.coreLoanAccount\}/);
  assert.match(ui, /footer\('Mark as disbursed', 'primary', !app\.coreLoanAccount/);
  assert.match(ui, /so the app can show the customer their balance from core banking/);
});
