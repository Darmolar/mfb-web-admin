// 2026-11-18 user: "for the customer id don't display it". The identity record's customerId is the app's internal
// user UUID, meaningless to bank staff, so neither the list nor the detail page shows it.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Identity list has no Customer ID column', () => {
  const page = fs.readFileSync('src/components/identity/IdentityVerificationPage.tsx', 'utf8');
  assert.doesNotMatch(page, /Customer ID/);
  assert.doesNotMatch(page, /r\.customerId/);
  for (const col of ['Name', 'Identity Number', 'Identity Type', 'Photo', 'Verified']) assert.match(page, new RegExp(`header: '${col}'`));
});

test('Identity detail summary does not show the customer ID', () => {
  const details = fs.readFileSync('src/components/identity/IdentityRecordDetails.tsx', 'utf8');
  assert.doesNotMatch(details, /Customer ID/);
  assert.doesNotMatch(details, /record\.customerId/);
});

test('customerId stays out of the provider details grid', () => {
  const src = fs.readFileSync('src/api/identityVerification.ts', 'utf8');
  const hidden = src.slice(src.indexOf('const HIDDEN_KEYS'), src.indexOf('])', src.indexOf('const HIDDEN_KEYS')));
  assert.match(hidden, /'customerId'/);
});
