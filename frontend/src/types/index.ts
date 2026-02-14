export interface User {
  username: string
  role: string
}

export interface UserInfo {
  id: number
  username: string
  email: string
  role: 'admin' | 'user'
  status: 'active' | 'inactive'
  created_at: string
}

export interface CreateUserRequest {
  username: string
  password: string
  email?: string
  role: 'admin' | 'user'
}

export interface UpdateUserRequest {
  email?: string
  role?: 'admin' | 'user'
  status?: 'active' | 'inactive'
}

export interface UserListResponse {
  users: UserInfo[]
  total: number
  page: number
  limit: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
}

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]

export interface JsonObject {
  [key: string]: JsonValue
}

export interface Chart {
  id: number
  repo_id?: number
  name: string
  description: string
  icon?: string
  published?: boolean
  versions: ChartVersion[]
}

export interface ChartVersion {
  id: number
  version: string
  app_version: string
  digest: string
  created_at: string
}

export interface ChartConfig {
  id: number
  chart_name: string
  version: string
  description?: string
  default_values: JsonObject
  required_keys: string[]
  visible_keys: string[]
  fixed_keys?: string[]
  created_at: string
  updated_at: string
}

export interface DeployRequest {
  chart_id: string
  version: string
  release_name: string
  namespace: string
  user_values: JsonObject
  is_quick_mode: boolean
}

export interface TaskResponse {
  message: string
  task_id: number
  status: string
}

export interface Task {
  id: number
  type: string
  status: string
  payload: JsonObject
  result?: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface AppInstance {
  id: number
  name: string
  namespace: string
  user_id: string
  chart_id: string
  chart_version: string
  status: string
  applied_values: JsonObject
  created_at: string
  updated_at: string
}

export interface Repo {
  id: number
  name: string
  url: string
  created_at: string
  updated_at: string
}

export interface ParsedChartInfo {
  Name: string
  Version: string
  AppVersion: string
  Description: string
  Icon: string
  Home: string
  DefaultValues: JsonObject
}
