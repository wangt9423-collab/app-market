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
        // 登录API代理 (仅POST请求)
        '/login': {
          target: env.VITE_API_URL || 'http://localhost:8081',
          changeOrigin: true,
          bypass(req) {
            if (req.method === 'GET') {
              return '/login'
            }
          }
        },
        // 管理后台API代理 (排除页面路由)
        '/admin': {
          target: env.VITE_API_URL || 'http://localhost:8081',
          changeOrigin: true,
          bypass(req) {
            // 根路径 /admin 返回前端页面
            if (req.method === 'GET' && (req.url === '' || req.url === '/')) {
              return '/admin'
            }
          }
        }
      },
      historyApiFallback: true
    }
  }
})
