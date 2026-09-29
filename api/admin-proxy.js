import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = '__Host-mfb_admin_session'
const digest = value => createHash('sha256').update(value).digest('hex')
function sign(value, key) {
  return createHmac('sha256', key).update(`memphis-admin-session:${value}`).digest('base64url')
}
function readSession(req, key) {
  try {
    const raw = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
    const [value, signature] = (raw || '').split('.')
    const expected = sign(value, key)
    if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
    const session = JSON.parse(Buffer.from(value, 'base64url').toString())
    return session.expiresAt > Date.now() ? session : null
  } catch { return null }
}
function cookie(value, age) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`
}
function makeSession(data, key) {
  let claims = {}
  try { claims = JSON.parse(Buffer.from(data.accessToken.split('.')[1], 'base64url').toString()) } catch { /* opaque token */ }
  const expiresAt = Math.min(Date.now() + 3600000, Number.isFinite(claims.exp) ? claims.exp * 1000 : Infinity)
  const value = Buffer.from(JSON.stringify({ tokenHash: digest(data.accessToken), expiresAt,
    username: data.username || claims.sub || data.email,
  })).toString('base64url')
  return cookie(`${value}.${sign(value, key)}`, Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)))
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const fail = (status, message, errorCode) => res.status(status).json({ success: false, message, errorCode })
  const url = new URL(req.url, 'https://local.invalid')
  const path = req.query?.path ?? url.searchParams.get('path')
  if (typeof path !== 'string' || !/^[a-zA-Z0-9_.\/-]+$/.test(path) || path.split('/').some(p => !p || p === '.' || p === '..')) {
    return fail(400, 'Invalid admin API path.', 'INVALID_PATH')
  }
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return fail(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED')
  const auth = ['auth/login', 'auth/mfa/verify'].includes(path)
  const logout = path === 'auth/logout'
  if ((auth || logout) && req.method !== 'POST') return fail(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED')
  const origin = req.headers.origin
  if (origin && new URL(origin).host !== req.headers.host) return fail(403, 'Request origin is not allowed.', 'FORBIDDEN')
  const key = process.env.BANK_ADMIN_API_KEY || process.env.VITE_ADMIN_API_KEY
  if (!key) return fail(503, 'Admin service configuration is missing. Configure BANK_ADMIN_API_KEY on the server.', 'ADMIN_CONFIG_MISSING')
  const sessionSecret = process.env.BANK_ADMIN_SESSION_SECRET
  if (!sessionSecret || sessionSecret.length < 32) return fail(503, 'Admin session configuration is missing. Configure BANK_ADMIN_SESSION_SECRET on the server.', 'ADMIN_CONFIG_MISSING')
  if (logout) {
    res.setHeader('Set-Cookie', cookie('', 0))
    return res.status(200).json({ success: true, data: null })
  }
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  const session = readSession(req, sessionSecret)
  if (!auth && (!token || !session || session.tokenHash !== digest(token))) {
    return fail(401, 'Please sign in again to establish a secure admin session.', 'SESSION_EXPIRED')
  }
  const upstream = new URL(`${process.env.BANK_API_BASE_URL || 'http://163.245.209.118:8080/api/v1'}/bank-admin/${path}`)
  for (const [name, value] of url.searchParams) if (name !== 'path') upstream.searchParams.append(name, value)
  const headers = { 'X-Admin-Key': key, 'X-API-Key': process.env.VITE_PUBLIC_API_KEY || 'Cu05G2FB_YqsATuvv-v5V5T746OfJ_4jAhy7VCG3bBU' }
  if (!auth) {
    headers.Authorization = `Bearer ${token}`
    if (session.username) headers['X-Admin-Username'] = session.username
  }
  if (req.body !== undefined) headers['Content-Type'] = 'application/json'
  try {
    const response = await fetch(upstream, { method: req.method, headers, redirect: 'error',
      body: ['GET', 'HEAD'].includes(req.method) || req.body === undefined ? undefined : typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      signal: AbortSignal.timeout(25000),
    })
    if (response.status === 204) return res.status(204).end()
    const body = await response.json()
    if (response.status === 401 && /admin key/i.test(body.message || '')) {
      return fail(502, 'The backend rejected the server admin key. Check BANK_ADMIN_API_KEY in the deployment settings.', 'ADMIN_CONFIG_INVALID')
    }
    if (path === 'auth/mfa/verify' && response.ok && body.success && typeof body.data?.accessToken === 'string' && body.data.accessToken) {
      res.setHeader('Set-Cookie', makeSession(body.data, sessionSecret))
    }
    return res.status(response.status).json(body)
  } catch {
    return fail(502, 'Admin service is temporarily unavailable. Please try again.', 'UPSTREAM_UNAVAILABLE')
  }
}
