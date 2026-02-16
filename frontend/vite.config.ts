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
        // 登录接口代理
        '/login': {
          target: env.VITE_API_URL || 'http://localhost:8081',
          changeOrigin: true
        }
        // 注意: /admin 开头的路径不再全部代理
        // 前端有 /admin/charts 路由页面
        // 后端 API 调用通过 apiClient 直接指定完整 URL (http://localhost:8081/admin/...)
      },
      historyApiFallback: true
    }
  }
})
