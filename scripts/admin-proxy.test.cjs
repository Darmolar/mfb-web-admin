const { test } = require('node:test');
const assert = require('node:assert/strict');

test('production proxy requires OTP-established session, hides keys, and preserves query parameters', async () => {
  const { default: handler } = await import('../api/admin-proxy.js');
  const oldFetch = global.fetch;
  process.env.BANK_ADMIN_API_KEY = 'test-backend-key';
  process.env.BANK_ADMIN_SESSION_SECRET = 'test-session-secret-at-least-32-characters';
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, json: async () => ({ success: true, data: { accessToken: 'issued-token', adminId: 'admin-1', username: 'bank-admin' } }) };
  };
  const request = async (path, options = {}) => {
    const headers = {};
    const result = { headers };
    const res = { setHeader: (k,v) => { headers[k] = v; }, status: s => { result.status = s; return res; }, json: body => { result.body = body; return result; }, end: () => result };
    await handler({ url: '/api/admin-proxy?page=2&size=20', query: { path }, method: 'GET', headers: { host: 'admin.test', ...options.headers }, ...options, }, res);
    return result;
  };
  try {
    assert.equal((await request('customers', { headers: { authorization: 'Bearer forged' } })).status, 401);
    assert.equal(calls.length, 0);
    const login = await request('auth/mfa/verify', { method: 'POST', body: { preAuthToken: 'pre', otp: '123456' } });
    const cookie = login.headers['Set-Cookie']; assert.match(cookie, /HttpOnly; Secure; SameSite=Strict/);
    assert.ok(!cookie.includes('issued-token')); assert.ok(!JSON.stringify(login.body).includes('test-backend-key'));
    const result = await request('customers', { headers: { authorization: 'Bearer issued-token', cookie } });
    assert.equal(result.status, 200); assert.ok(calls[1].url.endsWith('/bank-admin/customers?page=2&size=20'));
    assert.equal(calls[1].init.headers['X-Admin-Key'], 'test-backend-key'); assert.equal(calls[1].init.headers['X-Admin-Username'], 'bank-admin');
    assert.equal((await request('customers', { headers: { authorization: 'Bearer different', cookie } })).status, 401);
    assert.equal((await request('../customers')).status, 400);
    global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ message: 'Invalid admin key.' }) });
    assert.equal((await request('auth/login', { method: 'POST', body: {} })).body.errorCode, 'ADMIN_CONFIG_INVALID');
    delete process.env.BANK_ADMIN_SESSION_SECRET;
    assert.equal((await request('auth/login', { method: 'POST' })).status, 503);
  } finally { global.fetch = oldFetch; delete process.env.BANK_ADMIN_API_KEY; delete process.env.BANK_ADMIN_SESSION_SECRET; }
});
