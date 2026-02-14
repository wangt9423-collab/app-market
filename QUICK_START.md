# 快速开始指南

## 🚀 本地开发

### 前提条件
- Go 1.23+
- Node.js 20+
- npm 或 pnpm

### 开发环境启动

#### 1. 初始化项目
```bash
make init          # 下载依赖，安装工具
make init-admin    # 创建管理员用户 (可选)
```

#### 2. 启动后端（終端 1）
```bash
make run-backend
# 或
APP_SERVER_MODE=debug APP_LOG_LEVEL=debug go run ./cmd/app-market
```
后端启动在 `http://localhost:8081`

#### 3. 启动前端（新終端）
```bash
make run-frontend
# 或
cd frontend && npm run dev
```
前端启动在 `http://localhost:5173`

#### 4. 在浏览器中打开
- 访问 `http://localhost:5173`
- 登录页面：`http://localhost:5173/login`
- API 文档：`http://localhost:8081/swagger/index.html`

## 📝 常见任务

### 生成 Swagger 文档
```bash
make swagger
```
访问 `http://localhost:8081/swagger/index.html` 查看 API 文档

### 运行测试
```bash
make test              # 运行所有测试
go test -v ./...      # 详细输出
go test -cover ./...  # 显示覆盖率
```

### 运行 Linter
```bash
make lint             # 检查代码质量
golangci-lint run --fix  # 自动修复
```

### 运行 E2E 测试
```bash
# 确保后端和前端已启动
./e2e_test.sh
```

## 🐳 Docker 部署

### 开发环境（快速）
```bash
make docker-build
make docker-run
```
访问 `http://localhost:8081`

### 生产构建
```bash
# 创建优化的多架构镜像
make docker-buildx
```

## 🔑 关键命令对照表

| 命令 | 说明 |
|------|------|
| `make init` | 初始化依赖和工具 |
| `make run-backend` | 启动后端服务 |
| `make run-frontend` | 启动前端开发服务器 |
| `make run-dev` | 启动后端 + 前端 (需要配置) |
| `make test` | 运行单元测试 |
| `make lint` | 代码检查 |
| `make swagger` | 生成 API 文档 |
| `make build` | 构建可执行文件 |
| `make docker-build` | 构建 Docker 镜像 |
| `make docker-run` | 运行 Docker 容器 |
| `make clean` | 清理构建产物 |

## 📦 项目架构概览

```
前端 (React SPA) port:5173
    ↓ (代理 /api, /admin)
Vite 开发服务器
    ↓
后端 (Go) port:8081
    ├─ HTTP API (Swagger 文档)
    ├─ JWT 认证
    ├─ Helm 操作
    ├─ Kubernetes 集成
    └─ SQLite/MySQL 数据库
```

## 🌐 环境变量

### 前端 (.env)
```bash
VITE_API_URL=http://localhost:8081  # 后端 API 地址
```

### 后端 (config.yaml / .env)
```yaml
server:
  port: "8081"        # 服务端口
  mode: "debug"       # debug 或 release

database:
  driver: "sqlite"    # sqlite 或 mysql
  dsn: "app-market.db"

log:
  level: "debug"      # debug, info, warn, error
```

## 🔒 认证

### 创建管理员用户
```bash
go run ./cmd/init-admin admin password
```

### 获取 JWT Token
```bash
curl -X POST http://localhost:8081/login \
  -H "Content-Type: application/json" \
  -d '{"user_id":"admin","password":"password"}'
```

### 使用 Token
```bash
curl http://localhost:8081/api/instances \
  -H "Authorization: Bearer <token>"
```

## 🐛 常见问题

### Q: 前端显示 404
A: 确保后端在 `:8081` 运行，前端会自动代理 `/api` 和 `/admin` 请求

### Q: 无法登录
A: 检查是否使用了 `make init-admin` 创建了用户

### Q: CORS 错误
A: 后端现已配置 CORS 中间件，应该不再出现此错误。如需工作，请运行 `./test-cors.sh` 进行测试。详见 [CORS_FIX.md](./CORS_FIX.md)

### Q: 数据库文件位置
A: SQLite 数据库位于 `./app-market.db`（项目根目录）

## 🔍 故障排查

如遇到问题，可以运行以下测试脚本：

```bash
# 测试 SPA 路由是否正常
./frontend/test-spa-routing.sh

# 测试 CORS 配置是否正确
./test-cors.sh
```

## 📚 更多资源

- [CLAUDE.md](./CLAUDE.md) - 代码库指南
- [SPA_ROUTING_FIX.md](./SPA_ROUTING_FIX.md) - 路由问题详解
- [CORS_FIX.md](./CORS_FIX.md) - CORS 配置详解
- [README.md](./README.md) - 项目详细说明
- [AGENTS.md](./AGENTS.md) - 开发规范和最佳实践
