// 2026-11-17 staging: /bank-admin/reference/countries|states|sectors answer with a plain list ("static fallback" while
// core banking is down) instead of a page, which broke the state/sector dropdowns (allPages read `.content`), and
// /reference/towns now requires stateCode, which blocked corporate creation (the page waited for every town).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const compile = f => ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
function api(reply) {
  const mods = {}, calls = [];
  const local = { './types': 'src/api/types.ts', './kycConfiguration': 'src/api/kycConfiguration.ts', './productCodes': 'src/api/productCodes.ts', './loans': 'src/api/loans.ts', './cards': 'src/api/cards.ts', './cardfusion': 'src/api/cardfusion.ts', './pagination': 'src/api/pagination.ts', './roles': 'src/api/roles.ts', './identityVerification': 'src/api/identityVerification.ts', './loanSchedule': 'src/api/loanSchedule.ts' };
  const req = f => { if (mods[f]) return mods[f]; const exports = {}; mods[f] = exports;
    vm.runInNewContext(compile(f), { exports, Date, URLSearchParams, FormData, Blob, console, require: n => n === './config' ? { API_BASE_URL: 'https://backend.test/api/v1', ADMIN_API_KEY: '' } : local[n] ? req(local[n]) : {},
      localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
      fetch: async url => { calls.push(String(url)); const body = reply(String(url)); return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body, text: async () => JSON.stringify(body) }; } });
    return exports };
  return { api: req('src/api/index.ts'), pages: req('src/api/pagination.ts'), calls };
}
const STATES = [{ name: 'Abia', code: 'AB' }, { name: 'Lagos', code: 'LA' }];

test('a plain-list reply reads as one full page, so allPages and the dropdowns work', async () => {
  const { api, pages } = api_(u => ({ success: true, message: 'State codes (static fallback).', data: STATES }));
  const all = await pages.allPages(p => api.getStates(p));
  assert.deepEqual([...all.content.map(s => s.code)], ['AB', 'LA']);
  assert.equal(all.totalElements, 2);
});
function api_(r) { return api(r); }

test('a paged reply is passed through unchanged; a missing list reads as empty', async () => {
  const page = { content: [{ name: 'Agriculture', code: '01' }], totalElements: 1 };
  assert.deepEqual(JSON.parse(JSON.stringify((await api(() => ({ success: true, data: page })).api.getSectors()).data)), page);
  assert.equal((await api(() => ({ success: true, data: null })).api.getCountries()).data.content.length, 0);
});

test('towns are asked for one state at a time', async () => {
  const { api: a, calls } = api(() => ({ success: true, data: [{ name: 'Ikeja', code: 'IKJ', stateCode: 'LA' }] }));
  await a.getTowns(0, 'LA');
  assert.match(calls.at(-1), /reference\/towns\?page=0&size=100&stateCode=LA$/);
});

test('the corporate form loads towns for the chosen state and no longer waits for all towns', () => {
  const src = fs.readFileSync('src/components/corporate/CorporatePage.tsx', 'utf8');
  assert.ok(src.includes('allPages(page => getTowns(page, form.stateCode))'));
  assert.ok(src.includes('[form.stateCode]'));
  assert.ok(src.includes('const referenceReady = states.length > 0 && sectors.length > 0 && admins.length > 0'));
  assert.ok(src.includes('Towns could not be loaded from core banking'), 'a town failure is said next to the field');
});
