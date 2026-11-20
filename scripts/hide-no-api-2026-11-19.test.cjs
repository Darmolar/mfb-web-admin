// 2026-11-19 user: "every section that need API and it not available hide them for now".
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = f => fs.readFileSync(f, 'utf8');
const active = s => s.split('\n').filter(l => !/^\s*(\/\/|\{\/\*)/.test(l)).join('\n');

test('New Corporate Profile is gated off while towns lookup fails', () => {
  const s = read('src/components/corporate/CorporatePage.tsx');
  assert.match(s, /const CAN_CREATE_CORPORATE = false/);
  assert.match(s, /\{CAN_CREATE_CORPORATE && \(\s*<Button[^]*?New Corporate Profile/);
});

test('buttons with no API behind them are gone', () => {
  assert.doesNotMatch(active(read('src/components/corporate/profile/AuditTrail.tsx')), /Export CSV/);
  assert.doesNotMatch(active(read('src/components/auth/TwoFactorPage.tsx')), /Resend Code/);
});
