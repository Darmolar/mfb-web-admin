const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const plain = value => JSON.parse(JSON.stringify(value));
function setup(body = { success: true, data: { enabled: false } }, status = 200) {
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
  const stamp = load('src/api/bankStamp.ts');
  return { api: load('src/api/index.ts'), parse: stamp.readBankStamp, loadStamp: stamp.loadBankStamp, ApiError: load('src/api/types.ts').ApiError, calls };
}
test('stamp read, upload, configuration and deletion retain auth and use the documented methods', async () => {
  const { api, calls } = setup();
  await api.getBankStamp();
  const file = new File([new Uint8Array([137, 80, 78, 71])], 'stamp.png', { type: 'image/png' });
  await api.uploadBankStamp(file);
  await api.updateBankStamp({ enabled: false });
  await api.deleteBankStamp();
  assert.deepEqual(calls.map(c => c.init.method || 'GET'), ['GET', 'PUT', 'PATCH', 'DELETE']);
  for (const call of calls) {
    assert.equal(call.url, '/api/v1/bank-admin/settings/bank-stamp');
    assert.equal(call.init.headers.Authorization, 'Bearer admin-token');
  }
  assert.equal(calls[1].init.headers['Content-Type'], undefined);
  assert.equal(calls[1].init.body.get('file'), file);
  assert.deepEqual([...calls[1].init.body.keys()], ['file']);
  assert.deepEqual(JSON.parse(calls[2].init.body), { enabled: false });
  assert.equal(calls[2].init.headers['Content-Type'], 'application/json');
});
test('stamp responses follow the confirmed contract and unknown state never appears saved', async () => {
  const { parse } = setup();
  // Sample GET response supplied by the backend team on 2026-10-15.
  const live = { success: true, data: { stampId: 'b1', isEnabled: true, version: 3, contentType: 'image/png', width: 512, height: 512, sizeBytes: 84231, previewUrl: 'https://cdn.example/stamp.png', updatedAt: '2026-10-10T14:22:00Z', updatedBy: 'admin-uuid' } };
  assert.deepEqual(plain(parse(live)), { stampId: 'b1', enabled: true, version: 3, contentType: 'image/png', width: 512, height: 512, sizeBytes: 84231, previewUrl: 'https://cdn.example/stamp.png', updatedAt: '2026-10-10T14:22:00Z', updatedBy: 'admin-uuid' });
  assert.equal(parse({ success: true, data: { isEnabled: false } }).enabled, false);
  assert.equal(parse({ success: true, data: { isEnabled: true, previewUrl: 'javascript:alert(1)' } }).previewUrl, null);
  for (const body of [{}, null, { data: { isEnabled: 'false' } }, { success: false, data: { isEnabled: true } }]) assert.throws(() => parse(body));
});
test('a 404 means no stamp has been uploaded, while other failures still surface', async () => {
  const { loadStamp, ApiError } = setup();
  assert.equal(await loadStamp(async () => { throw new ApiError('Bank stamp not found.', 404, 'NOT_FOUND'); }), null);
  await assert.rejects(loadStamp(async () => { throw new ApiError('Server error', 500); }), /Server error/);
  assert.equal((await loadStamp(async () => ({ data: { success: true, data: { isEnabled: true } } }))).enabled, true);
});
test('rejected stamp writes propagate the backend message', async () => {
  const rejected = setup({ success: false, message: 'Not allowed' }, 403);
  await assert.rejects(rejected.api.updateBankStamp({ enabled: true }), /Not allowed/);
  await assert.rejects(rejected.api.deleteBankStamp(), /Not allowed/);
});
test('production proxy forwards exact multipart bytes only with an authenticated admin session', async () => {
  const { default: handler } = await import('../api/admin-proxy.js');
  const previous = { fetch: global.fetch, key: process.env.BANK_ADMIN_API_KEY, secret: process.env.BANK_ADMIN_SESSION_SECRET };
  process.env.BANK_ADMIN_API_KEY = 'test-server-key'; process.env.BANK_ADMIN_SESSION_SECRET = 'test-session-secret-at-least-32-characters';
  const calls = [];
  global.fetch = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ success: true, data: { accessToken: 'issued-token', username: 'admin' } }) }; };
  async function request(path, options = {}) {
    const result = { headers: {} };
    const res = { setHeader: (name, value) => { result.headers[name] = value; }, status: status => { result.status = status; return res; }, json: body => { result.body = body; }, end: () => {} };
    await handler({ url: '/api/admin-proxy', query: { path }, method: 'POST', headers: { host: 'admin.test' }, ...options }, res);
    return result;
  }
  try {
    const login = await request('auth/mfa/verify', { body: { otp: '123456' } });
    const bytes = Buffer.concat([Buffer.from('--stamp-boundary\r\nContent-Disposition: form-data; name="file"; filename="stamp.png"\r\nContent-Type: image/png\r\n\r\n'), Buffer.from([0, 255, 137, 80, 78, 71]), Buffer.from('\r\n--stamp-boundary--\r\n')]);
    const headers = { host: 'admin.test', authorization: 'Bearer issued-token', cookie: login.headers['Set-Cookie'], 'content-type': 'multipart/form-data; boundary=stamp-boundary' };
    assert.equal((await request('settings/bank-stamp', { method: 'PUT', headers: { ...headers, cookie: '' }, body: bytes })).status, 401);
    assert.equal(calls.length, 1);
    const result = await request('settings/bank-stamp', { method: 'PUT', headers, async *[Symbol.asyncIterator]() { yield bytes.subarray(0, 50); yield bytes.subarray(50); } });
    assert.equal(result.status, 200);
    assert.deepEqual(calls[1].init.body, bytes);
    assert.equal(calls[1].init.headers['Content-Type'], headers['content-type']);
    assert.equal(calls[1].init.headers['X-Admin-Key'], 'test-server-key');
    assert.equal(calls[1].init.headers.Authorization, 'Bearer issued-token');
    assert.equal((await request('settings/bank-stamp', { method: 'PUT', headers, body: Buffer.alloc(3 * 1024 * 1024) })).status, 413);
    assert.equal((await request('settings/bank-stamp', { method: 'PUT', headers: { ...headers, 'content-type': 'multipart/form-data' }, body: bytes })).status, 415);
    assert.equal(calls.length, 2);
    // Turning off automatic body parsing must preserve JSON auth requests too.
    assert.equal((await request('auth/login', { headers: { 'content-type': 'application/json' }, async *[Symbol.asyncIterator]() { yield Buffer.from('{"username":"admin"}'); } })).status, 200);
    assert.equal(calls[2].init.body.toString(), '{"username":"admin"}');
    assert.equal(calls[2].init.headers['Content-Type'], 'application/json');
  } finally {
    global.fetch = previous.fetch;
    for (const [name, value] of [['BANK_ADMIN_API_KEY', previous.key], ['BANK_ADMIN_SESSION_SECRET', previous.secret]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
