import axios, { AxiosError } from 'axios'
import type {
  LoginRequest,
  LoginResponse,
  Chart,
  ChartConfig,
  DeployRequest,
  TaskResponse,
  Task,
  AppInstance,
  Repo,
  ParsedChartInfo,
  UserInfo,
  CreateUserRequest,
  UpdateUserRequest,
  UserListResponse
} from '@/types'

const apiClient = axios.create({
  baseURL: 'http://localhost:8081',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/login', data)
    localStorage.setItem('token', response.data.token)
    return response.data
  },
  logout: () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
}

export const chartService = {
  getCharts: async (): Promise<Chart[]> => {
    const response = await apiClient.get<Chart[]>('/api/charts')
    return response.data
  },
  
  getChartConfig: async (chartId: string, version: string): Promise<ChartConfig> => {
    const response = await apiClient.get<ChartConfig>(`/admin/charts/${chartId}/versions/${version}/config`)
    return response.data
  },
  
  updateChartConfig: async (chartId: string, version: string, config: Partial<ChartConfig>): Promise<void> => {
    await apiClient.put(`/admin/charts/${chartId}/versions/${version}/config`, config)
  },

  getAdminCharts: async (): Promise<Chart[]> => {
    const response = await apiClient.get<Chart[]>('/admin/charts')
    return response.data
  },

  updateChartPublishStatus: async (chartId: number, published: boolean): Promise<void> => {
    await apiClient.put(`/admin/charts/${chartId}/publish`, { published })
  },

  deleteChart: async (chartId: number): Promise<void> => {
    await apiClient.delete(`/admin/charts/${chartId}`)
  },

  createChart: async (data: {
    repo_id: number
    name: string
    description?: string
    icon?: string
    home?: string
    published?: boolean
  }): Promise<Chart> => {
    const response = await apiClient.post<Chart>('/admin/charts', data)
    return response.data
  },

  createChartVersion: async (chartId: number, data: {
    version: string
    app_version?: string
    digest?: string
    urls?: string[]
  }): Promise<void> => {
    await apiClient.post(`/admin/charts/${chartId}/versions`, data)
  },

  uploadChart: async (file: File): Promise<void> => {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('token')
    await axios.post('http://localhost:8081/admin/charts/upload', formData, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
  },

  parseChart: async (file: File): Promise<ParsedChartInfo> => {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('token')
    const response = await axios.post<ParsedChartInfo>('http://localhost:8081/admin/charts/parse', formData, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    return response.data
  },

  onboardChart: async (file: File, metadata: any): Promise<void> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('metadata', JSON.stringify(metadata))
    const token = localStorage.getItem('token')
    await axios.post('http://localhost:8081/admin/charts/onboard', formData, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
  }
}

export const deployService = {
  deploy: async (data: DeployRequest): Promise<TaskResponse> => {
    const response = await apiClient.post<TaskResponse>('/api/deploy', data)
    return response.data
  },
  
  getTaskStatus: async (taskId: number): Promise<Task> => {
    const response = await apiClient.get<Task>(`/api/tasks/${taskId}`)
    return response.data
  },
  
  getInstances: async (): Promise<AppInstance[]> => {
    const response = await apiClient.get<AppInstance[]>('/api/instances')
    return response.data
  },

  deleteInstance: async (instanceId: number): Promise<void> => {
    await apiClient.delete(`/api/instances/${instanceId}`)
  }
}

export const repoService = {
  getRepos: async (): Promise<Repo[]> => {
    const response = await apiClient.get<Repo[]>('/admin/repos')
    return response.data
  },

  addRepo: async (data: { name: string; url: string }): Promise<void> => {
    await apiClient.post('/admin/repos', data)
  },

  syncRepo: async (repoId: number): Promise<void> => {
    await apiClient.post(`/admin/repos/${repoId}/sync`)
  }
}

export const userService = {
  getUsers: async (page: number, limit: number): Promise<UserListResponse> => {
    const response = await apiClient.get<UserListResponse>('/admin/users', {
      params: { page, limit }
    })
    return response.data
  },

  getUser: async (id: number): Promise<UserInfo> => {
    const response = await apiClient.get<UserInfo>(`/admin/users/${id}`)
    return response.data
  },

  createUser: async (data: CreateUserRequest): Promise<UserInfo> => {
    const response = await apiClient.post<UserInfo>('/admin/users', data)
    return response.data
  },

  updateUser: async (id: number, data: UpdateUserRequest): Promise<UserInfo> => {
    const response = await apiClient.put<UserInfo>(`/admin/users/${id}`, data)
    return response.data
  },

  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`)
  },

  resetPassword: async (id: number, password: string): Promise<void> => {
    await apiClient.post(`/admin/users/${id}/reset-password`, { password })
  }
}

export default apiClient
