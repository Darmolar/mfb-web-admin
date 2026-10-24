const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');

const code = ts.transpileModule(fs.readFileSync('src/api/inbox.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = {};
vm.runInNewContext(code, { exports: mod, Promise, Number });
const src = (key, load) => ({ key, label: key, hint: '', to: '/' + key, load });

test('counts waiting work, drops empty sources and reports failures without hiding the rest', async () => {
  const inbox = await mod.buildInbox([
    src('kyc', async () => 3),
    src('cards', async () => 0),
    src('loans', async () => { throw new Error('403') }),
    src('complaints', async () => 2),
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(inbox.items.map(i => [i.key, i.count]))), [['kyc', 3], ['complaints', 2]]);
  assert.equal(inbox.total, 5);
  assert.deepEqual(JSON.parse(JSON.stringify(inbox.failed)), ['loans']);
  assert.equal('load' in inbox.items[0], false);
});

test('badge caps at 99+', () => {
  assert.equal(mod.badgeCount(7), '7');
  assert.equal(mod.badgeCount(150), '99+');
});
