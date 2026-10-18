const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const plain = value => JSON.parse(JSON.stringify(value));
function setup(body = { success: true, data: { content: [] } }, status = 200) {
  const calls = [], modules = {};
  function load(file) {
    if (modules[file]) return modules[file];
    const exports = {}; modules[file] = exports;
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports, FormData, File,
      require: name => name === './config' ? { API_BASE_URL: '/api/v1', ADMIN_API_KEY: '', PUBLIC_API_KEY: 'public' } : load(`src/api/${name.slice(2)}.ts`),
      localStorage: { getItem: () => JSON.stringify({ accessToken: 'admin-token' }) },
      fetch: async (url, init) => { calls.push({ url, init }); return { ok: status < 400, status, json: async () => body }; },
    }); return exports;
  }
  return { api: load('src/api/index.ts'), cf: load('src/api/cardfusion.ts'), calls };
}

// Shapes captured from the dev backend on 2026-10-15.
const liveDevice = {
  id: 'd0238c5c', hardwareId: 'DEVICE-LOGIN-TEST', deviceToken: 'device-secret',
  officeToken: { id: 'o1', token: 'office-secret', description: 'Login Test', used: true },
  status: 'REGISTERED', registeredAt: '2026-10-14T21:13:55.347305', revokedAt: null,
};
const liveActivity = {
  id: 'a1', sessionId: null, hardwareId: 'DEVICE-LOGIN-TEST', accountNumber: '0123456789', cardPan: '5061234567890123',
  cfUser: { id: 'u1', staffCode: 'STAFF002', name: 'Jane Branch Staff' },
  operation: 'STAFF_LOGIN', status: 'SUCCESS', latitude: 6.5244, longitude: 3.3792, details: 'Staff login', createdAt: '2026-10-14T21:13:57.929929',
};
const page = content => ({ success: true, data: { content, totalElements: content.length + 5 } });

test('CardFusion admin calls use the live /api/v1/bank-admin/cardfusion paths, methods and bodies', async () => {
  const { api, calls } = setup();
  await api.getCardFusionStaff();
  await api.createCardFusionStaff({ name: 'Ada', email: 'ada@memphismfb.com', staffCode: 'STAFF009', adminId: 'admin-1' });
  await api.getCardFusionDevices();
  await api.setCardFusionDeviceRevoked('HW 1/2', true, 'admin-1');
  await api.setCardFusionDeviceRevoked('HW-3', false, 'admin-1');
  await api.createCardFusionOfficeToken({ description: 'Ikeja', adminId: 'admin-1' });
  await api.getCardFusionActivities();
  assert.deepEqual(calls.map(c => `${c.init.method || 'GET'} ${c.url}`), [
    'GET /api/v1/bank-admin/cardfusion/users?page=0&size=100',
    'POST /api/v1/bank-admin/cardfusion/users',
    'GET /api/v1/bank-admin/cardfusion/devices?page=0&size=100',
    'PATCH /api/v1/bank-admin/cardfusion/devices/HW%201%2F2/revoke',
    'PATCH /api/v1/bank-admin/cardfusion/devices/HW-3/unrevoke',
    'POST /api/v1/bank-admin/cardfusion/office-tokens',
    'GET /api/v1/bank-admin/cardfusion/activities?page=0&size=100',
  ]);
  for (const call of calls) assert.equal(call.init.headers.Authorization, 'Bearer admin-token');
  assert.deepEqual(JSON.parse(calls[1].init.body), { name: 'Ada', email: 'ada@memphismfb.com', staffCode: 'STAFF009', adminId: 'admin-1' });
  assert.deepEqual(JSON.parse(calls[3].init.body), { adminId: 'admin-1' });
  assert.deepEqual(JSON.parse(calls[5].init.body), { description: 'Ikeja', adminId: 'admin-1' });
});

test('device and activity readers drop device tokens, office tokens and full card numbers', () => {
  const { cf } = setup();
  const devices = plain(cf.readDevicePage(page([liveDevice])));
  assert.deepEqual(devices, { items: [{ id: 'd0238c5c', hardwareId: 'DEVICE-LOGIN-TEST', status: 'REGISTERED', officeTokenDescription: 'Login Test', registeredAt: '2026-10-14T21:13:55.347305', revokedAt: null }], totalElements: 6 });
  assert.doesNotMatch(JSON.stringify(devices), /secret/);
  const activity = plain(cf.readActivityPage(page([liveActivity]))).items[0];
  assert.equal(activity.cardPanLast4, '0123');
  assert.equal(activity.staffName, 'Jane Branch Staff');
  assert.doesNotMatch(JSON.stringify(activity), /5061234567890123/);
});

test('readers reject failed or malformed pages and skip rows without identifiers', () => {
  const { cf } = setup();
  for (const body of [null, {}, { success: false, data: { content: [] } }, { success: true, data: { content: 'nope' } }]) assert.throws(() => cf.readStaffPage(body));
  const staff = plain(cf.readStaffPage({ success: true, data: { content: [{ name: 'No id' }, { id: 's1', name: 'Ok', active: true }] } }));
  assert.equal(staff.items.length, 1);
  assert.equal(staff.items[0].lastLoginAt, null);
});

test('one-time secrets are read from the create responses, and a missing secret is an error rather than silence', () => {
  const { cf } = setup();
  assert.equal(cf.readCreatedStaff({ success: true, data: { id: 's1', name: 'Ada', temporaryPassword: 'Temp#123' } }).temporaryPassword, 'Temp#123');
  assert.equal(cf.readCreatedStaff({ success: true, data: { user: { id: 's1', name: 'Ada' }, temporaryPassword: 'Temp#456' } }).staff.name, 'Ada');
  assert.throws(() => cf.readCreatedStaff({ success: true, data: { id: 's1' } }), /temporary password/);
  assert.equal(cf.readOfficeToken({ success: true, data: { token: 'tok-1', description: 'Ikeja' } }), 'tok-1');
  assert.equal(cf.readOfficeToken({ success: true, data: 'tok-2' }), 'tok-2');
  assert.throws(() => cf.readOfficeToken({ success: true, data: {} }), /did not return it/);
});

test('rejected CardFusion writes propagate the backend message', async () => {
  const { api } = setup({ success: false, message: 'Staff code already exists' }, 409);
  await assert.rejects(api.createCardFusionStaff({ name: 'Ada', email: 'a@b.co', staffCode: 'STAFF001', adminId: 'admin-1' }), /Staff code already exists/);
  await assert.rejects(api.setCardFusionDeviceRevoked('HW-1', true, 'admin-1'), /Staff code already exists/);
});
