import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      middlewareMode: false,
      proxy: {
        // API 路由代理
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8081',
          changeOrigin: true
        },
        // 管理后台API代理
        '/admin': {
          target: env.VITE_API_URL || 'http://localhost:8081',
          changeOrigin: true
        }
        // 注意: /login 路由不要代理，让 Vite SPA fallback 处理
      },
      historyApiFallback: true
    }
  }
})
