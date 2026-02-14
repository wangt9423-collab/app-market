# SPA 路由修复总结

## 问题描述

用户在访问 `http://localhost:5173/login` 或刷新该页面时，收到 404 错误。这是因为：

1. **Vite 代理冲突**: `/login` 被当作 API 代理转发到后端，而不是由前端路由处理
2. **缺少 SPA Fallback**: 开发服务器没有配置历史路由 fallback，导致不存在的路由返回 404

## 解决方案

### 1. 开发环境修复 (vite.config.ts)

**移除 `/login` 代理**:
```typescript
// ❌ 删除 - 这会导致前端路由与 API 冲突
// '/login': {
//   target: env.VITE_API_URL || 'http://localhost:8081',
//   changeOrigin: true
// }
```

**添加历史模式 Fallback**:
```typescript
server: {
  proxy: {
    '/api': { ... },
    '/admin': { ... }
  },
  historyApiFallback: true  // ✓ 新增
}
```

**工作原理**:
- `historyApiFallback: true` 告诉 Vite 开发服务器，任何不匹配的 HTTP 请求都应返回 `index.html`
- React Router 会处理 `index.html` 中的 `/login` 路由
- 只有 `/api/*` 和 `/admin/*` 请求被代理到后端

### 2. 生产环境修复 (Dockerfile + nginx.conf)

**创建 Nginx 配置** (`frontend/nginx.conf`):
```nginx
location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
}

location /api/ {
    proxy_pass http://backend:8081;
}
```

**更新 Dockerfile**:
- 添加前端构建阶段 (Node.js)
- 将前端打包产物复制到 Nginx
- 使用 Nginx 服务前端 + 后端业务逻辑

### 3. API 端口统一

同步更新所有 8080 → 8081 的引用（已在前面完成）

## 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `frontend/vite.config.ts` | 删除 `/login` 代理，添加 `historyApiFallback: true` |
| `frontend/nginx.conf` | ✨ 新建，配置 SPA fallback 和 API 代理 |
| `Dockerfile` | 重构为多阶段构建，集成前端构建 + Nginx + 后端 |
| `templates/index.html` | 更新 API_URL 为 8081 |
| `CLAUDE.md` | 添加 SPA 历史路由说明 |

## 现在支持的操作

✅ 直接访问 `http://localhost:5173/login` - 不返回 404
✅ 在 `/login` 页面刷新浏览器 - 正常加载
✅ 直接访问 `http://localhost:5173/my-apps` - 正常加载
✅ 前进/后退按钮正常工作
✅ 深度链接分享没有问题

## 开发流程

1. 运行后端: `make run-backend`
2. 运行前端: `make run-frontend`
3. 访问 `http://localhost:5173`
4. 任何前端路由都支持刷新和直接访问

## 生产部署

```bash
# 构建 Docker 镜像
make docker-build

# 运行容器 (Nginx on :80, Backend on :8081)
make docker-run
```

容器启动后：
- Nginx 在 `:80` 服务前端
- 后端 API 在 `:8081` 监听
- 前端通过 Nginx 反向代理访问后端 API

## 技术细节

### 为什么需要 `historyApiFallback`?

浏览器直访 `/login` 时：
1. 请求发送到 Vite 开发服务器的 `:5173`
2. Vite 查找物理文件 `/login` 或 `/login/index.html`
3. 找不到 → 返回 404 (❌ 原始行为)
4. 有 `historyApiFallback` → 返回 `index.html` (✓ 修复后)

### 为什么删除 `/login` 代理?

```
请求 POST /login (含 credentials) 时：
├─ 如果有 /login 代理 → 转发到后端
├─ 如果没有 (现在) → Vite 返回 index.html
│  └─ 浏览器加载应用后，React Router 处理
│  └─ 前端代码调用 authService.login()
│  └─ axios 拦截器自动添加请求头和认证
│  └─ 代理 /login 的 POST 到后端
└─ 结果：✓ 前端路由和 API 调用都工作正常
```

### Nginx 的 `try_files` 原理

```nginx
try_files $uri $uri/ /index.html;
```

尝试顺序：
1. 查找物理文件 `$uri` → 如果存在（如 `/assets/app.js`），返回文件
2. 查找目录 `$uri/` → 如果存在，列出目录
3. 都不存在 → 返回 `/index.html`

这样保证了静态资源被正确服务，同时 SPA 路由也能正常工作。
