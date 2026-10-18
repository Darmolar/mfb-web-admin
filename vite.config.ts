import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

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
                  // Every bank-admin route can get the server-side admin key, but only for
                  // requests from this machine; anyone else reaching the dev server gets none.
                  if (!req.url?.startsWith('/api/v1/bank-admin/')) return
                  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '')
                  if (!local) {
                    proxyReq.removeHeader('X-Admin-Key')
                    proxyReq.removeHeader('X-Admin-Username')
                    return
                  }
                  // Only signed-in requests get it; sign-in itself keeps what the browser sent.
                  if (!req.headers.authorization?.startsWith('Bearer ')) return
                  if (env.BANK_ADMIN_API_KEY) proxyReq.setHeader('X-Admin-Key', env.BANK_ADMIN_API_KEY)
                  if (env.BANK_ADMIN_USERNAME) proxyReq.setHeader('X-Admin-Username', env.BANK_ADMIN_USERNAME)
                })
              },
            },
          },
        }
      : undefined,
  }
})
