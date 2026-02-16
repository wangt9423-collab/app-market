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
    // 优化构建
    build: {
      rollupOptions: {
        output: {
          // 代码分割
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'antd-vendor': ['antd'],
            'monaco-vendor': ['monaco-editor']
          }
        }
      },
      // 压缩配置
      minify: 'terser',
      chunkSizeWarningLimit: 2000
    },
    // 开发服务器优化
    server: {
      host: '0.0.0.0',
      port: 5173,
      middlewareMode: false,
      // 开启 HMR 快速更新
      hmr: {
        overlay: true
      },
      // 预连接
      preflightRequests: true,
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
