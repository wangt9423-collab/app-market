import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { useAuthStore } from '@/stores/authStore'
import LoginPage from '@/pages/LoginPage'
import MainLayout from '@/layouts/MainLayout'
import ChartMarket from '@/pages/ChartMarket'
import DeployPage from '@/pages/DeployPage'
import AdminCharts from '@/pages/AdminCharts'
import AdminUsers from '@/pages/AdminUsers'
import MyApps from '@/pages/MyApps'
import TasksPage from '@/pages/TasksPage'

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
    </QueryClientProvider>
  )
}

export default App
