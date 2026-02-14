# 🏗️ App-Market 架构详解

## 全景架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          开发环境架构                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│     前端 (React SPA)              │
│   http://localhost:5173          │
├─────────────────────────────────┤
│ • React 18                        │
│ • TypeScript                      │
│ • React Router v6                 │
│ • Vite 开发服务器                 │
│ • historyApiFallback: true        │
└─────────────────────────────────┘
            ↓ (HTTP 请求)
    ┌───────────────────────┐
    │  Vite Dev Server Proxy│
    ├───────────────────────┤
    │ /api  → localhost:8081│
    │ /admin → localhost:8081│
    │ /* → index.html       │
    └───────────────────────┘
            ↓
┌─────────────────────────────────┐
│    后端 API 服务 (Go + Gin)      │
│   http://localhost:8081         │
├─────────────────────────────────┤
│ • Go 1.23                        │
│ • Gin Web Framework              │
│ • JWT 认证                       │
│ • CORS 中间件 ✅ (NEW)            │
│ • SQLite/MySQL 数据库             │
└─────────────────────────────────┘
            ↓
    ┌───────────────────────┐
    │  internal/api/router  │
    ├───────────────────────┤
    │ GET  /health          │
    │ POST /login           │
    │ GET  /admin/repos     │
    │ POST /api/deploy      │
    │ GET  /api/instances   │
    │ ...                   │
    └───────────────────────┘
            ↓
    ┌───────────────────────┐
    │  中间件栈               │
    ├───────────────────────┤
    │ 1. CORS                │
    │ 2. JWT Auth (保护路由) │
    │ 3. Logging             │
    │ 4. ...                 │
    └───────────────────────┘
            ↓
    ┌───────────────────────┐
    │  业务服务层             │
    ├───────────────────────┤
    │ • ChartService        │
    │ • DeployService       │
    │ • SyncService         │
    │ • TaskService         │
    │ • AuthHandler         │
    └───────────────────────┘
            ↓
    ┌───────────────────────┐
    │  数据持久化             │
    ├───────────────────────┤
    │ SQLite (开发) /        │
    │ MySQL (生产)           │
    └───────────────────────┘
```

---

## 生产环境架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          生产环境架构                                  │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│            浏览器客户端                          │
│      https://app.example.com                    │
└────────────────────────────────────────────────┘
                    ↓ (HTTPS)
        ┌───────────────────────┐
        │   负载均衡器 (LB)       │
        │  (可选: Nginx/HAProxy) │
        └───────────────────────┘
                    ↓
┌────────────────────────────────────────────────────────────────────┐
│                      Docker 容器                                    │
│              make docker-build && docker run                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌──────────────────────────┐                                       │
│ │   Nginx (Port 80/443)    │ ← 前端容器 + 反向代理                  │
│ │  (frontend/nginx.conf)   │                                       │
│ ├──────────────────────────┤                                       │
│ │ / → dist/index.html      │                                       │
│ │ /api/* → localhost:8081  │                                       │
│ │ /admin/* → localhost:8081│  ← CORS 中间件处理 ✅                  │
│ └──────────────────────────┘                                       │
│           ↓                                                         │
│ ┌──────────────────────────┐                                       │
│ │  Go API 服务器            │                                       │
│ │  (Port 8081)             │                                       │
│ │  ./app-market binary     │                                       │
│ ├──────────────────────────┤                                       │
│ │ • HTTP API Handlers      │                                       │
│ │ • Middleware Stack       │                                       │
│ │ • Business Logic         │                                       │
│ │ • Database Connection    │                                       │
│ └──────────────────────────┘                                       │
│           ↓                                                         │
│ ┌──────────────────────────┐                                       │
│ │  数据库 (MySQL/PostgreSQL) │                                      │
│ │  (外部或挂载卷)            │                                       │
│ └──────────────────────────┘                                       │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## CORS 工作流程图

### 开发环境 CORS 流程

```
浏览器 (localhost:5173)
    │
    ├─ 发送 OPTIONS 预检请求 ─→ Vite 代理 ─→ 后端 (8081)
    │                                      │
    │                                      ↓
    │                            CORSMiddleware
    │                                      │
    │                                      ├─ Allow-Origin: *
    │                                      ├─ Allow-Methods: GET, POST, ...
    │                                      ├─ Allow-Headers: Content-Type, ...
    │                                      │
    │  ←─ 返回 204 No Content ────────────┘
    │
    ├─ 发送实际 POST /login 请求 ──→ 后端
    │                              │
    │  ←─ 返回 200 + Token ────────┘
    │
```

### 生产环境 CORS 流程

```
浏览器 (https://app.example.com)
    │
    ├─ 发送请求 ─→ Nginx (反向代理)
    │              │
    │              ├─ 检查请求路径
    │              │
    │              ├─ /api/* → localhost:8081 (转发)
    │              └─ /* → /index.html (SPA fallback)
    │                │
    │                ↓
    │          后端 API (Go)
    │                │
    │                ├─ CORSMiddleware
    │                │  (设置 CORS 响应头)
    │                │
    │                ├─ JWT 认证 (如果需要)
    │                │
    │                ├─ 业务逻辑处理
    │                │
    │  ←─ 返回响应 ──┘
    │
```

---

## 请求生命周期

### 开发环境登录请求的完整流程

```
① 用户在浏览器输入: http://localhost:5173/login

② Vite 开发服务器处理:
   ├─ historyApiFallback: true 启用
   ├─ 返回 index.html
   ├─ React Router 加载应用
   └─ 前端显示登录表单

③ 用户点击登录按钮，前端发送请求:
   POST /login
   Content-Type: application/json
   {
     "user_id": "admin",
     "password": "password"
   }

④ Vite 代理拦截请求:
   ├─ 检查路径: /login 不匹配 /api/* 或 /admin/*
   ├─ 但 CORSMiddleware 已应用于所有路由
   └─ 转发到后端 localhost:8081

⑤ 后端 Go/Gin 处理:
   ├─ CORSMiddleware 应用
   │  ├─ 设置 Access-Control-Allow-Origin
   │  ├─ 设置 Access-Control-Allow-Methods
   │  ├─ 处理 OPTIONS 预检 (如果需要)
   │  └─ 继续处理请求
   │
   ├─ 路由匹配: POST /login
   ├─ 调用 authHandler.Login()
   │  ├─ 验证用户凭证
   │  ├─ 生成 JWT Token
   │  └─ 返回 Token
   │
   └─ 返回响应 + CORS 响应头

⑥ Vite 代理返回响应给浏览器
   ├─ 状态码: 200
   ├─ CORS 响应头 ✅
   └─ token: "eyJhbGciOiJIUzI1NiIs..."

⑦ 浏览器接收响应
   ├─ 检查 CORS 响应头
   ├─ 验证通过 ✅
   ├─ 前端代码可以读取响应
   ├─ 保存 Token 到 localStorage
   ├─ 重定向到主页
   └─ 显示登录成功

⑧ 后续 API 请求 (带 Token)
   GET /api/instances
   Authorization: Bearer <token>
   │
   ├─ AuthMiddleware 验证 Token
   ├─ 业务逻辑执行
   └─ 返回数据
```

---

## 中间件栈

### 请求处理顺序

```
请求进入
  │
  ↓
┌─────────────────────────────┐
│  1. CORSMiddleware          │ ✨ NEW - 处理跨域请求
│     - 设置 CORS 响应头      │
│     - 处理 OPTIONS 预检     │
│     - 允许跨域访问          │
└─────────────────────────────┘
  │
  ↓
┌─────────────────────────────┐
│  2. Gin 中间件                │
│     - 日志记录              │
│     - 错误恢复              │
│     - 请求超时              │
└─────────────────────────────┘
  │
  ↓
┌─────────────────────────────┐
│  3. 路由匹配                  │
│     / → HTML                │
│     /health → 状态检查      │
│     /login → 公开            │
│     /admin/* → 公开          │
│     /api/* → 下一步           │
└─────────────────────────────┘
  │
  ↓
┌─────────────────────────────┐
│  4. JWT AuthMiddleware      │
│     - (仅 /api/* 路由)      │
│     - 验证 Token            │
│     - 提取用户信息          │
└─────────────────────────────┘
  │
  ↓
┌─────────────────────────────┐
│  5. 处理器/控制器            │
│     - 业务逻辑              │
│     - 返回响应              │
└─────────────────────────────┘
  │
  ↓
响应返回
```

---

## 部署流程

### Docker 多阶段构建

```
Dockerfile 编译流程:

┌────────────────────────────────────────┐
│ Stage 1: Node.js 20-alpine             │
│          前端构建                       │
├────────────────────────────────────────┤
│ ✓ 复制 package.json                    │
│ ✓ npm ci (安装依赖)                    │
│ ✓ 复制源代码                           │
│ ✓ npm run build                        │
│ → 输出: /frontend/dist                 │
│         (React + Vite 打包产物)        │
└────────────────────────────────────────┘
         ↓ (复制 dist 文件)
┌────────────────────────────────────────┐
│ Stage 2: Go 1.23-alpine                │
│          后端构建                       │
├────────────────────────────────────────┤
│ ✓ 复制 go.mod/go.sum                   │
│ ✓ go mod download                      │
│ ✓ 复制源代码                           │
│ ✓ swag init (生成 Swagger docs)        │
│ ✓ go build (编译)                      │
│ → 输出: /app/app-market                │
│         (单个可执行文件)                │
└────────────────────────────────────────┘
         ↓ (复制二进制文件)
┌────────────────────────────────────────┐
│ Stage 3: Alpine latest                 │
│          最终运行环境                   │
├────────────────────────────────────────┤
│ ✓ 安装: ca-certificates, tzdata, nginx│
│ ✓ 复制 app-market 二进制                │
│ ✓ 复制前端 dist 到 /usr/share/nginx/html
│ ✓ 复制 nginx.conf 配置                 │
│ ✓ 暴露 port 80 (Nginx) + 8081 (Go)     │
│ ✓ 启动: nginx + app-market             │
└────────────────────────────────────────┘
         ↓
    最终镜像 (优化大小)
```

### 容器启动流程

```
docker run ...

  ↓

├─ PID 1: Nginx (前端容器)
│  ├─ 监听 Port 80/443
│  ├─ 提供 React 应用
│  ├─ 反向代理 /api 到后端
│  └─ SPA fallback: try_files $uri $uri/ /index.html
│
└─ 后台: Go 应用 (app-market)
   ├─ 监听 Port 8081
   ├─ 提供 API 服务
   ├─ 连接数据库
   └─ 处理业务逻辑

实际上运行: "sh -c 'nginx & ./app-market'"
```

---

## 环境变量

### 开发环境

```
# frontend/.env
VITE_API_URL=http://localhost:8081

# frontend/vite.config.ts server 配置
proxy:
  '/api': { target: 'http://localhost:8081', ... }
  '/admin': { target: 'http://localhost:8081', ... }
historyApiFallback: true

# 后端
server.port: 8081
server.mode: debug
```

### 生产环境

```
# Nginx 环境变量
BACKEND_URL=localhost (内部网络)

# 容器环境
PORT=8081 (后端)
PORT=80 (Nginx，由 Docker EXPOSE 指定)

# 应用配置 (config.yaml)
server:
  port: "8081"
  mode: "release"
database:
  driver: "mysql"  # 或其他生产数据库
```

---

## 关键技术决策

### 为什么使用多阶段 Docker 构建？

```
❌ 旧方式 (Go only):
   └─ app-market 二进制
      └─ 无前端支持

✅ 新方式 (多阶段):
   ├─ Stage 1: 编译前端 (Node.js)
   ├─ Stage 2: 编译后端 (Go)
   └─ Stage 3: 运行环境 (Nginx + Go)
      └─ 好处: 前后端统一部署、镜像优化
```

### 为什么添加 CORSMiddleware？

```
❌ 没有中间件:
   浏览器 × CORS 错误 × 无法通信 ✗

✅ 有 CORS 中间件:
   浏览器 → 检查响应头 ✓ → 允许跨域 ✓
```

### 为什么使用 historyApiFallback + try_files？

```
❌ 没有配置:
   GET /login
   └─ Vite/Nginx 返回 404 ✗

✅ 有配置:
   GET /login
   ├─ 不是文件
   └─ 返回 index.html ✓
   └─ React Router 处理路由 ✓
```

---

## 数据流向

### 认证流程

```
用户登录请求
    │
    ├─ POST /login
    │  ├─ { user_id: "admin", password: "password" }
    │  ├─ CORS 检查 ✓
    │  └─ authHandler.Login()
    │     ├─ 验证凭证
    │     │  └─ repository.FindUser()
    │     ├─ 生成 JWT Token
    │     │  └─ middleware.GenerateToken()
    │     └─ 返回 { token: "..." }
    │
    └─ 前端保存 Token (localStorage)
       │
       └─ 后续请求带 Token
          │
          ├─ Authorization: Bearer <token>
          ├─ AuthMiddleware 验证
          ├─ 提取 userID
          └─ 业务逻辑执行
```

### API 数据流

```
前端请求
    │
    ├─ GET /api/instances
    │  ├─ Authorization: Bearer <token>
    │  ├─ CORS 允许 ✓
    │  └─ 后端路由
    │     ├─ AuthMiddleware 验证
    │     ├─ deployHandler.ListInstances()
    │     │  ├─ deployService.ListInstances()
    │     │  │  └─ repository.QueryInstances()
    │     │  │     └─ 数据库查询
    │     │  └─ 格式化响应
    │     └─ 返回 JSON
    │
    └─ 前端接收数据
       ├─ 检查 CORS 响应头 ✓
       ├─ 解析 JSON
       ├─ 更新状态
       └─ 重新渲染 UI
```

---

## 总结

App-Market 的架构是一个现代化的 Web 应用，支持：

✅ **前端** (React SPA)
- 单页应用 (SPA)
- 历史模式路由 (historyApiFallback + try_files)
- 跨域通信 (CORS 支持)

✅ **后端** (Go + Gin)
- RESTful API
- JWT 认证
- CORS 中间件 ✨ NEW
- 业务逻辑处理

✅ **部署** (Docker)
- 多阶段构建
- 优化的镜像大小
- 前后端一体化

✅ **通信**
- HTTP/HTTPS
- JSON 序列化
- 跨域支持

现在项目已经完全就绪，可以进行开发和生产部署！🚀
