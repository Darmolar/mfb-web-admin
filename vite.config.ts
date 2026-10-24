import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function tokenSubject(token: string) {
  try {
    // Admin tokens carry sub "admin:<email>"; the audit username is the part after the prefix.
    const sub = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')).sub
    const username = typeof sub === 'string' ? sub.replace(/^admin:/, '') : ''
    return /^[\w.@+-]{1,120}$/.test(username) ? username : ''
  } catch {
    return ''
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_PROXY_TARGET

  return {
    plugins: [react()],
    server: proxyTarget
      ? {
          proxy: {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
              configure(proxy) {
                proxy.on('proxyReq', (proxyReq, req) => {
                  // Development server only; production uses an authenticated proxy.
                  // Every bank-admin route (and the job queue, which lives under /v1/admin/queue) can get the
                  // server-side admin key, but only for requests from this machine; anyone else gets none.
                  if (!req.url?.startsWith('/api/v1/bank-admin/') && !req.url?.startsWith('/api/v1/admin/queue/')) return
                  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '')
                  if (!local) {
                    proxyReq.removeHeader('X-Admin-Key')
                    proxyReq.removeHeader('X-Admin-Username')
                    return
                  }
                  // Only signed-in requests get it; sign-in itself keeps what the browser sent.
                  if (!req.headers.authorization?.startsWith('Bearer ')) return
                  if (env.BANK_ADMIN_API_KEY) proxyReq.setHeader('X-Admin-Key', env.BANK_ADMIN_API_KEY)
                  // Audit endpoints (identity reverify/image) record X-Admin-Username. Like the production proxy,
                  // fall back to the signed-in admin's token subject when no fixed username is configured.
                  const username = env.BANK_ADMIN_USERNAME || tokenSubject(req.headers.authorization.slice(7))
                  if (username) proxyReq.setHeader('X-Admin-Username', username)
                })
              },
            },
          },
        }
      : undefined,
  }
})
