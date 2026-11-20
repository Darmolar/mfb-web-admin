// 2026-11-16 bank report: "Loan Upload Schedule is not working" — the deployed admin showed "Unsupported upload
// request." The production proxy only let multipart uploads through for the bank stamp and identity images, so the
// repayment schedule CSV (POST loans/applications/{id}/schedule/csv) was rejected before it reached the bank.
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('production proxy forwards the repayment schedule CSV upload, with its adminId query', async () => {
  const { default: handler } = await import('../api/admin-proxy.js');
  const previous = { fetch: global.fetch, key: process.env.BANK_ADMIN_API_KEY, secret: process.env.BANK_ADMIN_SESSION_SECRET };
  process.env.BANK_ADMIN_API_KEY = 'test-server-key'; process.env.BANK_ADMIN_SESSION_SECRET = 'test-session-secret-at-least-32-characters';
  const calls = [];
  global.fetch = async (url, init) => { calls.push({ url: String(url), init }); return { ok: true, status: 200, json: async () => ({ success: true, data: { accessToken: 'issued-token', username: 'admin' } }) }; };
  async function request(path, options = {}) {
    const result = { headers: {} };
    const res = { setHeader: (name, value) => { result.headers[name] = value; }, status: status => { result.status = status; return res; }, json: body => { result.body = body; }, end: () => {} };
    await handler({ url: options.url ?? '/api/admin-proxy', query: { path }, method: 'POST', headers: { host: 'admin.test' }, ...options }, res);
    return result;
  }
  try {
    const login = await request('auth/mfa/verify', { body: { otp: '123456' } });
    const csv = Buffer.from('--b\r\nContent-Disposition: form-data; name="file"; filename="repayment-schedule.csv"\r\nContent-Type: text/csv\r\n\r\n1,2026-12-15,13333.33,1200,14533.33\r\n--b--\r\n');
    const headers = { host: 'admin.test', authorization: 'Bearer issued-token', cookie: login.headers['Set-Cookie'], 'content-type': 'multipart/form-data; boundary=b' };
    const ok = await request('loans/applications/LN6055C7E7EF/schedule/csv', { url: '/api/admin-proxy?adminId=admin-1', headers, body: csv });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.ok(calls[1].url.endsWith('/bank-admin/loans/applications/LN6055C7E7EF/schedule/csv?adminId=admin-1'), calls[1].url);
    assert.deepEqual(calls[1].init.body, csv);
    assert.equal(calls[1].init.headers['Content-Type'], headers['content-type']);
    // Still closed for anything else: other routes, other methods, nested paths.
    for (const [path, method] of [['customers', 'POST'], ['loans/applications/LN1/schedule/csv', 'PUT'], ['loans/applications/LN1/x/schedule/csv', 'POST'], ['loans/applications/LN1/schedule', 'POST']])
      assert.equal((await request(path, { method, headers, body: csv })).status, 415, `${method} ${path}`);
    assert.equal(calls.length, 2);
  } finally {
    global.fetch = previous.fetch;
    for (const [name, value] of [['BANK_ADMIN_API_KEY', previous.key], ['BANK_ADMIN_SESSION_SECRET', previous.secret]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
