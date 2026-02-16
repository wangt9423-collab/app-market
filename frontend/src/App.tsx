import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { loader } from '@monaco-editor/react'
import { Spin } from 'antd'
import * as monaco from 'monaco-editor'
import { useAuthStore } from '@/stores/authStore'

// 路由级别代码分割 - 懒加载页面组件
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const MainLayout = lazy(() => import('@/layouts/MainLayout'))
const ChartMarket = lazy(() => import('@/pages/ChartMarket'))
const DeployPage = lazy(() => import('@/pages/DeployPage'))
const AdminCharts = lazy(() => import('@/pages/AdminCharts'))
const AdminUsers = lazy(() => import('@/pages/AdminUsers'))
const MyApps = lazy(() => import('@/pages/MyApps'))
const TasksPage = lazy(() => import('@/pages/TasksPage'))

// 加载中组件
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
)

// Configure Monaco Editor to use local instance (no CDN)
loader.config({ monaco })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<PageLoader />}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ChartMarket />} />
              <Route path="deploy/:chartName" element={<DeployPage />} />
              <Route path="admin/charts" element={<AdminCharts />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="my-apps" element={<MyApps />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </Suspense>
    </QueryClientProvider>
  )
}

export default App
