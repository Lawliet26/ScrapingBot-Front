import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      proxy: apiProxyTarget
        ? {
            '/api': {
              target: apiProxyTarget,
              changeOrigin: true,
            },
            '/ws': {
              target: apiProxyTarget,
              ws: true,
              changeOrigin: true,
              configure: (proxy) => {
                // changeOrigin rewrites Host, not Origin; Channels' origin validator reads Origin.
                proxy.on('proxyReqWs', (proxyReq) => proxyReq.setHeader('origin', apiProxyTarget))
              },
            },
          }
        : undefined,
    },
  }
})
