const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;

function load(entry, extra = {}) {
  const modules = {};
  const calls = [];
  const local = { './roles': 'src/api/roles.ts', './identityVerification': 'src/api/identityVerification.ts', './types': 'src/api/types.ts', './kycConfiguration': 'src/api/kycConfiguration.ts', './productCodes': 'src/api/productCodes.ts' };
  function req(file) {
    if (modules[file]) return modules[file];
    const exports = {}; modules[file] = exports;
    vm.runInNewContext(compile(file), {
      exports, FormData, File, URL, atob,
      require: name => name === './config' ? { API_BASE_URL: 'https://backend.test/api/v1', ADMIN_API_KEY: '' } : local[name] ? req(local[name]) : (() => { throw Error(name); })(),
      localStorage: { getItem: () => null },
      fetch: async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => extra.body ?? { success: true, data: {} } }; },
    });
    return exports;
  }
  return { mod: req(entry), calls };
}

test('role permissions are saved as codes with the acting admin, as the Postman examples send them', async () => {
  const { mod, calls } = load('src/api/index.ts');
  await mod.updateRolePermissions('role-1', { permissionCodes: ['KYC_REVIEW', 'CUSTOMER_VIEW'], adminId: 'admin-1' });
  assert.equal(calls[0].url, 'https://backend.test/api/v1/bank-admin/roles/role-1/permissions');
  assert.equal(calls[0].init.method, 'PUT');
  assert.deepEqual(JSON.parse(calls[0].init.body), { permissions: ['KYC_REVIEW', 'CUSTOMER_VIEW'], permissionCodes: ['KYC_REVIEW', 'CUSTOMER_VIEW'], adminId: 'admin-1' });
  await mod.createRole({ name: 'NEW_OFFICER', description: 'x', adminId: 'admin-1' });
  assert.deepEqual(JSON.parse(calls[1].init.body), { name: 'NEW_OFFICER', description: 'x', adminId: 'admin-1', permissions: [] });
  await mod.assignRole('role-9', { adminUserId: 'admin-2', performedBy: 'admin-1' });
  assert.equal(calls[2].url, 'https://backend.test/api/v1/bank-admin/roles/role-9/assign');
  assert.deepEqual(JSON.parse(calls[2].init.body), { adminUserId: 'admin-2', performedBy: 'admin-1' });
});

test('validation errors name the failing fields', async () => {
  const { mod } = load('src/api/index.ts', { body: { success: false, message: 'Validation failed', errorCode: 'VALIDATION_ERROR', data: { adminId: 'must not be null' } } });
  await assert.rejects(mod.createRole({ name: 'X', description: '' }), /Validation failed: adminId must not be null/);
});

test('roles and permissions are read from arrays, pages or named lists, and ticked by id or code', () => {
  const { mod } = load('src/api/roles.ts');
  const page = { content: [{ id: 'r1', name: 'KYC_OFFICER', permissions: ['KYC_APPROVE', { id: 'p3' }] }, { name: 'no-id' }] };
  const roles = mod.readRoles(page);
  assert.equal(roles.length, 1);
  assert.deepEqual([...roles[0].permissionKeys], ['KYC_APPROVE', 'p3']);
  assert.equal(mod.readRoles({ roles: [{ roleId: 'r2', roleName: 'AUDIT' }] })[0].id, 'r2');
  const perms = mod.readPermissions([{ id: 'p1', code: 'KYC_APPROVE' }, { id: 'p2', name: 'LOAN_DISBURSE', module: 'Loans' }, { id: 'p3', code: 'CUSTOMER_VIEW' }]);
  assert.equal(perms[0].group, 'KYC');
  assert.equal(perms[1].group, 'Loans');
  assert.deepEqual([...mod.selectedPermissionCodes(roles[0], perms)], ['KYC_APPROVE', 'CUSTOMER_VIEW']);
  const codes = mod.readPermissions(['CUSTOMER_VIEW', 'KYC_REVIEW']);
  assert.deepEqual(codes.map(p => [p.id, p.code, p.group]), [['CUSTOMER_VIEW', 'CUSTOMER_VIEW', 'CUSTOMER'], ['KYC_REVIEW', 'KYC_REVIEW', 'KYC']]);
  assert.deepEqual(['APPROVE_LOAN', 'VIEW_LOANS', 'MANAGE_LOAN_PRODUCTS', 'VIEW_CUSTOMERS', 'REVIEW_KYC', 'CUSTOMER_VIEW', 'VIEW_COMPLIANCE', 'MANAGE_ADMIN_USERS'].map(mod.permissionGroup),
    ['LOAN', 'LOAN', 'LOAN', 'CUSTOMER', 'KYC', 'CUSTOMER', 'COMPLIANCE', 'ADMIN']);
  assert.equal(mod.readRole({ id: 'r', name: 'COMPLIANCE_OFFICER', system: true }).system, true);
  assert.equal(mod.readRole({ id: 'r', name: 'CUSTOM' }).system, false);
  for (const role of ['SUPER_ADMIN', 'Super Admin', 'SuperAdmin', 'ROLE_SUPER_ADMIN', 'super-admin']) assert.equal(mod.isSuperAdminRole(role), true, role);
  for (const role of ['ADMIN', 'KYC_OFFICER', '', undefined]) assert.equal(mod.isSuperAdminRole(role), false, String(role));
  assert.throws(() => mod.readRoles({ unexpected: true }), /unexpected format/);
});

test('identity records read the documented detail response, including faceImageBase64', () => {
  const { mod } = load('src/api/identityVerification.ts');
  const photo = '/9j/' + 'A'.repeat(300);
  const record = mod.readIdentityRecord({
    id: 'a1', idType: 'BVN', idNumber: '22312345678', provider: 'ISW', firstName: 'ADEBAYO', lastName: 'OKAFOR', middleName: 'JAMES',
    dateOfBirth: '15-Mar-1990', lgaOfOrigin: 'Eti-Osa', customerId: 'c1', verifiedAt: '2026-10-01T09:14:22', updatedAt: '2026-10-02T10:00:00', faceImageBase64: photo,
  });
  assert.equal(record.fullName, 'ADEBAYO JAMES OKAFOR');
  assert.equal(record.provider, 'ISW');
  assert.equal(record.updatedAt, '2026-10-02T10:00:00');
  assert.equal(record.imageUrl, `data:image/jpeg;base64,${photo}`);
  assert.equal(record.hasImage, true);
  const labels = record.details.map(([label]) => label);
  assert.ok(labels.includes('Date of birth'));
  assert.ok(labels.includes('LGA of origin'));
  assert.ok(!labels.some(l => /image|updated/i.test(l)));
  assert.equal(mod.readIdentityRecord({ id: 'a2', hasImage: false }).hasImage, false);
  assert.equal(mod.readIdentityRecord({ id: 'a3', hasImage: true }).hasImage, true);
  assert.equal(mod.maskIdNumber('22212345678'), '222•••••678');
  assert.equal(mod.toImageSrc('javascript:alert(1)'), null);
});

test('one search box searches the ID number for digits and the name otherwise', async () => {
  const v = load('src/api/identityVerification.ts').mod;
  assert.deepEqual({ ...v.identitySearchParams(' 2231 ') }, { idNumber: '2231' });
  assert.deepEqual({ ...v.identitySearchParams('Okafor') }, { name: 'Okafor' });
  assert.deepEqual({ ...v.identitySearchParams('  ') }, {});
  const { mod, calls } = load('src/api/index.ts');
  await mod.getIdentityVerifications({ name: 'Ada', idType: 'NIN' });
  assert.equal(calls[0].url, 'https://backend.test/api/v1/bank-admin/identity?name=Ada&idType=NIN&page=0&size=50');
  await mod.getIdentityVerifications({ idNumber: '2231', size: 500 });
  assert.equal(calls[1].url, 'https://backend.test/api/v1/bank-admin/identity?idNumber=2231&page=0&size=100');
});

test('reverify and image upload follow the documented requests', async () => {
  const { mod } = load('src/api/identityVerification.ts');
  assert.match(mod.validateReplacementImage(new File(['x'], 'a.webp', { type: 'image/webp' })), /JPEG or PNG/);
  assert.match(mod.validateReplacementImage(new File([new Uint8Array(3 * 1024 * 1024)], 'a.jpg', { type: 'image/jpeg' })), /2 MB/);
  assert.equal(mod.validateReplacementImage(new File(['x'], 'a.png', { type: 'image/png' })), null);
  assert.deepEqual({ ...mod.readSubmissionOutcome({ requestId: 'c9', status: 'PENDING', message: 'Image update submitted for approval.' }) },
    { pendingApproval: true, requestId: 'c9', message: 'Image update submitted for approval.' });
  assert.equal(mod.readSubmissionOutcome({ id: 'a1', message: 'Identity record refreshed from provider.' }).pendingApproval, false);

  const api = load('src/api/index.ts');
  await api.mod.requestIdentityImageUpdate('a 1', { image: new File(['x'], 'a.jpg', { type: 'image/jpeg' }), notes: 'Came in person' });
  const call = api.calls[0];
  assert.equal(call.url, 'https://backend.test/api/v1/bank-admin/identity/a%201/image');
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.headers['Content-Type'], undefined);
  assert.equal(call.init.body.get('verified'), 'true');
  assert.equal(call.init.body.get('notes'), 'Came in person');
  assert.ok(call.init.body.get('image'));
  await api.mod.reverifyIdentity('a1');
  assert.equal(api.calls[1].url, 'https://backend.test/api/v1/bank-admin/identity/a1/reverify');
  assert.equal(api.calls[1].init.method, 'POST');
  assert.equal(api.calls[1].init.body, undefined);
});

test('image requests are listed, approved and rejected through the documented endpoints', async () => {
  const { mod, calls } = load('src/api/index.ts');
  await mod.getIdentityImageRequests({ status: 'APPROVED' });
  assert.equal(calls[0].url, 'https://backend.test/api/v1/bank-admin/identity/image-requests?status=APPROVED&page=0&size=100');
  await mod.approveIdentityImageRequest('r1', 'Seen in person');
  assert.equal(calls[1].url, 'https://backend.test/api/v1/bank-admin/identity/image-requests/r1/approve');
  assert.equal(calls[1].init.method, 'PUT');
  assert.deepEqual(JSON.parse(calls[1].init.body), { notes: 'Seen in person' });
  await mod.rejectIdentityImageRequest('r1', 'Blurry');
  assert.equal(calls[2].url, 'https://backend.test/api/v1/bank-admin/identity/image-requests/r1/reject');
});

test('makers cannot approve their own image requests', () => {
  const { mod } = load('src/api/approvals.ts');
  const { requests: [req], total } = mod.readImageRequests({ content: [{
    id: 'c9', identityRecordId: 'a1', idType: 'bvn', idNumber: '223', fullName: 'ADEBAYO OKAFOR',
    requestedBy: 'ibrahim.musa', requestNotes: 'Came in person', status: 'PENDING', createdAt: '2026-10-24T13:45:00',
  }], totalElements: 3 });
  assert.equal(total, 3);
  assert.equal(req.idType, 'BVN');
  assert.equal(req.identityRecordId, 'a1');
  assert.equal(mod.isOwnRequest(req, { username: 'Ibrahim.Musa' }), true);
  assert.equal(mod.isOwnRequest(req, { email: 'ibrahim.musa@memphis.ng' }), true);
  assert.equal(mod.isOwnRequest(req, { username: 'grace.eze', email: 'grace@memphis.ng', adminId: 'x' }), false);
  const token = ['h', Buffer.from(JSON.stringify({ sub: 'ibrahim.musa' })).toString('base64url'), 's'].join('.');
  assert.equal(mod.usernameFromToken(token), 'ibrahim.musa');
  assert.equal(mod.usernameFromToken('not-a-jwt'), null);
  const real = ['h', Buffer.from(JSON.stringify({ sub: 'admin:ibrahim.musa' })).toString('base64url'), 's'].join('.');
  assert.equal(mod.usernameFromToken(real), 'ibrahim.musa');
});

test('production proxy accepts multipart only for the identity image route and the bank stamp', async () => {
  const { default: handler } = await import('../api/admin-proxy.js');
  const previous = { fetch: global.fetch, key: process.env.BANK_ADMIN_API_KEY, secret: process.env.BANK_ADMIN_SESSION_SECRET };
  process.env.BANK_ADMIN_API_KEY = 'test-server-key'; process.env.BANK_ADMIN_SESSION_SECRET = 'test-session-secret-at-least-32-characters';
  const calls = [];
  global.fetch = async (url, init) => { calls.push({ url: String(url), init }); return { ok: true, status: 200, json: async () => ({ success: true, data: { accessToken: 'issued-token', username: 'admin' } }) }; };
  async function request(path, options = {}) {
    const result = { headers: {} };
    const res = { setHeader: (name, value) => { result.headers[name] = value; }, status: status => { result.status = status; return res; }, json: body => { result.body = body; }, end: () => {} };
    await handler({ url: '/api/admin-proxy', query: { path }, method: 'POST', headers: { host: 'admin.test' }, ...options }, res);
    return result;
  }
  try {
    const login = await request('auth/mfa/verify', { body: { otp: '123456' } });
    const bytes = Buffer.from('--b\r\nContent-Disposition: form-data; name="image"; filename="a.jpg"\r\n\r\nxx\r\n--b--\r\n');
    const headers = { host: 'admin.test', authorization: 'Bearer issued-token', cookie: login.headers['Set-Cookie'], 'content-type': 'multipart/form-data; boundary=b' };
    const ok = await request('identity/rec-1/image', { headers, body: bytes });
    assert.equal(ok.status, 200);
    assert.match(calls[1].url, /\/bank-admin\/identity\/rec-1\/image$/);
    assert.deepEqual(calls[1].init.body, bytes);
    assert.equal((await request('identity/rec-1/image', { method: 'PUT', headers, body: bytes })).status, 415);
    assert.equal((await request('customers/c1/image', { headers, body: bytes })).status, 415);
    assert.equal((await request('identity/rec-1/reverify', { headers, body: bytes })).status, 415);
    assert.equal((await request('identity/image-requests/r1/image', { headers, body: bytes })).status, 415);
    assert.equal(calls.length, 2);
  } finally {
    global.fetch = previous.fetch;
    for (const [name, value] of [['BANK_ADMIN_API_KEY', previous.key], ['BANK_ADMIN_SESSION_SECRET', previous.secret]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test('development proxy sends the signed-in admin as X-Admin-Username for audit when none is configured', () => {
  const exports = {};
  vm.runInNewContext(compile('vite.config.ts'), { exports, Buffer, process: { cwd: () => '.' }, require: name => name === 'vite' ? { defineConfig: v => v, loadEnv: () => ({ VITE_API_PROXY_TARGET: 'https://backend.test', BANK_ADMIN_API_KEY: 'k' }) } : () => null });
  const proxy = exports.default({ mode: 'development' }).server.proxy['/api']; let handler; proxy.configure({ on: (_e, cb) => { handler = cb } });
  const run = authorization => { const headers = {}; handler({ removeHeader: k => { delete headers[k] }, setHeader: (k, v) => { headers[k] = v } }, { url: '/api/v1/bank-admin/identity/a1/reverify', socket: { remoteAddress: '127.0.0.1' }, headers: { authorization } }); return headers; };
  const token = ['h', Buffer.from(JSON.stringify({ sub: 'ibrahim.musa' })).toString('base64url'), 's'].join('.');
  assert.equal(run(`Bearer ${token}`)['X-Admin-Username'], 'ibrahim.musa');
  assert.equal(run('Bearer opaque-token')['X-Admin-Username'], undefined);
  const real = ['h', Buffer.from(JSON.stringify({ sub: 'admin:klef@example.com' })).toString('base64url'), 's'].join('.');
  assert.equal(run(`Bearer ${real}`)['X-Admin-Username'], 'klef@example.com');
  const evil = ['h', Buffer.from(JSON.stringify({ sub: 'a\r\nX-Injected: 1' })).toString('base64url'), 's'].join('.');
  assert.equal(run(`Bearer ${evil}`)['X-Admin-Username'], undefined);
});

test('production proxy reaches the job queue under /v1/admin, and nothing else there', async () => {
  const { default: handler } = await import('../api/admin-proxy.js');
  const previous = { fetch: global.fetch, key: process.env.BANK_ADMIN_API_KEY, secret: process.env.BANK_ADMIN_SESSION_SECRET };
  process.env.BANK_ADMIN_API_KEY = 'test-server-key'; process.env.BANK_ADMIN_SESSION_SECRET = 'test-session-secret-at-least-32-characters';
  const calls = [];
  global.fetch = async (url, init) => { calls.push({ url: String(url), init }); return { ok: true, status: 200, json: async () => ({ success: true, data: { accessToken: 'issued-token', username: 'admin' } }) }; };
  async function request(path, ns, options = {}) {
    const result = { headers: {} };
    const res = { setHeader: (n, v) => { result.headers[n] = v; }, status: s => { result.status = s; return res; }, json: b => { result.body = b; }, end: () => {} };
    const qs = new URLSearchParams({ path, ...(ns ? { ns } : {}), page: '0' });
    await handler({ url: `/api/admin-proxy?${qs}`, query: { path, ...(ns ? { ns } : {}) }, method: 'GET', headers: { host: 'admin.test' }, ...options }, res);
    return result;
  }
  try {
    const login = await request('auth/mfa/verify', undefined, { method: 'POST', body: { otp: '123456' } });
    const headers = { host: 'admin.test', authorization: 'Bearer issued-token', cookie: login.headers['Set-Cookie'] };
    assert.equal((await request('queue/stats', 'admin', { headers })).status, 200);
    assert.equal(calls[1].url, 'http://163.245.209.118:8080/api/v1/admin/queue/stats?page=0');
    assert.equal(calls[1].init.headers['X-Admin-Key'], 'test-server-key');
    assert.equal((await request('queue/failed/j1/retry', 'admin', { headers, method: 'POST' })).status, 200);
    assert.match(calls[2].url, /\/api\/v1\/admin\/queue\/failed\/j1\/retry(\?|$)/);
    assert.equal((await request('users', 'admin', { headers })).status, 404);
    assert.equal((await request('auth/mfa/verify', 'admin', { headers, method: 'POST' })).status, 404);
    assert.equal((await request('queue/stats', 'other', { headers })).status, 400);
    assert.equal((await request('queue/stats', 'admin', { headers: { host: 'admin.test' } })).status, 401);
    assert.equal(calls.length, 3);
    assert.match(calls[0].url, /\/bank-admin\/auth\/mfa\/verify(\?|$)/);
  } finally {
    global.fetch = previous.fetch;
    for (const [n, v] of [['BANK_ADMIN_API_KEY', previous.key], ['BANK_ADMIN_SESSION_SECRET', previous.secret]]) { if (v === undefined) delete process.env[n]; else process.env[n] = v; }
  }
});

test('development proxy adds the admin key to job queue requests', () => {
  const exports = {};
  vm.runInNewContext(compile('vite.config.ts'), { exports, Buffer, process: { cwd: () => '.' }, require: name => name === 'vite' ? { defineConfig: v => v, loadEnv: () => ({ VITE_API_PROXY_TARGET: 'https://backend.test', BANK_ADMIN_API_KEY: 'k' }) } : () => null });
  const proxy = exports.default({ mode: 'development' }).server.proxy['/api']; let handler; proxy.configure({ on: (_e, cb) => { handler = cb } });
  const run = url => { const headers = {}; handler({ removeHeader: k => { delete headers[k] }, setHeader: (k, v) => { headers[k] = v } }, { url, socket: { remoteAddress: '127.0.0.1' }, headers: { authorization: 'Bearer t' } }); return headers; };
  assert.equal(run('/api/v1/admin/queue/stats')['X-Admin-Key'], 'k');
  assert.equal(run('/api/v1/admin/users')['X-Admin-Key'], undefined);
});
