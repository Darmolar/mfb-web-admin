const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const exports_ = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/queue.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exports_, require: () => ({}) });
const q = exports_;
const plain = v => JSON.parse(JSON.stringify(v));

const live = {
  'memphis.bills': { messagesReady: 0, consumers: 1 }, 'memphis.savings.interest': { messagesReady: 0, consumers: 1 },
  'memphis.bills.dlq': { messagesReady: 0, consumers: 1 }, 'memphis.savings.interest.dlq': { messagesReady: 0, consumers: 1 },
};

test('queues and their failed-job holding queues become one service each', () => {
  const services = plain(q.groupQueues(live));
  assert.deepEqual(services.map(s => [s.label, s.waiting, s.workers, s.failedHeld, s.health]),
    [['Bill payments', 0, 1, 0, 'healthy'], ['Savings interest', 0, 1, 0, 'healthy']]);
  assert.equal(q.queueLabel('memphis.card.issuance.dlq'), 'Card Issuance');
});

test('health is judged in order: stopped, failures, backlog, processing', () => {
  const s = plain(q.groupQueues({
    'memphis.bills': { messagesReady: 3, consumers: 1 }, 'memphis.bills.dlq': { messagesReady: 2, consumers: 1 },
    'memphis.savings.interest': { messagesReady: 0, consumers: 0 },
    'memphis.transfers': { messagesReady: 80, consumers: 2 }, 'memphis.notifications': { messagesReady: 4, consumers: 1 },
  }));
  assert.deepEqual(s.map(x => [x.label, x.health]), [['Savings interest', 'stopped'], ['Bill payments', 'failures'], ['Transfers', 'backlog'], ['Notifications', 'processing']]);
});

test('the overall banner says what needs doing', () => {
  assert.equal(q.overallStatus(q.groupQueues(live), 0).tone, 'green');
  const amber = q.overallStatus(q.groupQueues(live), 2);
  assert.equal(amber.tone, 'amber'); assert.match(amber.detail, /2 failed jobs need a decision/);
  const red = q.overallStatus(q.groupQueues({ 'memphis.bills': { messagesReady: 0, consumers: 0 } }), 0);
  assert.equal(red.tone, 'red'); assert.match(red.title, /Bill payments has stopped/);
});

test('job payloads read as plain rows with naira amounts', () => {
  const rows = plain(q.payloadRows('{"billPaymentId":"a1","billType":"AIRTIME","paymentCode":"90101","amountNaira":1000.00}'));
  assert.deepEqual(rows, [['Bill payment id', 'a1'], ['Bill type', 'Airtime'], ['Payment code', '90101'], ['Amount', '₦1,000']]);
  assert.deepEqual(plain(q.payloadRows({ to: 'user@example.com' })), [['To', 'user@example.com']]);
  assert.deepEqual(plain(q.payloadRows('not json')), [['Data', 'not json']]);
  assert.equal(q.jobTypeLabel('BILL_PAYMENT'), 'Bill payment');
  const now = Date.parse('2026-10-24T12:00:00Z');
  assert.equal(q.timeAgo('2026-10-24T11:58:00Z', now), '2 min ago');
  assert.equal(q.timeAgo('2026-10-24T09:00:00Z', now), '3 h ago');
  assert.equal(q.timeAgo(null, now), '—');
});
