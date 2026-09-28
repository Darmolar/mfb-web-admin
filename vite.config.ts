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
                  const path = req.url?.split('?')[0]
                  const protectedFeeRoute = path === '/api/v1/bank-admin/settings/cba/product-codes'
                    || path === '/api/v1/bank-admin/settings/fees'
                    || path?.startsWith('/api/v1/bank-admin/fees/')
                  if (protectedFeeRoute) {
                    // Development server only; production uses an authenticated proxy.
                    proxyReq.removeHeader('X-Admin-Key')
                    proxyReq.removeHeader('X-Admin-Username')
                    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '')
                    if (!local || !req.headers.authorization?.startsWith('Bearer ')) return
                    if (env.BANK_ADMIN_API_KEY) proxyReq.setHeader('X-Admin-Key', env.BANK_ADMIN_API_KEY)
                    if (env.BANK_ADMIN_USERNAME) proxyReq.setHeader('X-Admin-Username', env.BANK_ADMIN_USERNAME)
                  }
                })
              },
            },
          },
        }
      : undefined,
  }
})
