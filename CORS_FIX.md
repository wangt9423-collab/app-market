# CORS 修复说明

## 问题描述

前端应用运行在 `http://localhost:5173`，当尝试向后端 `http://localhost:8081` 发送 POST 请求（如登录请求）时，浏览器返回 CORS (Cross-Origin Resource Sharing) 错误：

```
Access to XMLHttpRequest at 'http://localhost:8081/login' from origin 'http://localhost:5173' has been blocked by CORS policy
```

这是因为后端没有配置 CORS 响应头。

## 问题根源

1. **不同的协议/域名/端口**: 前端和后端运行在不同的端口上 (5173 vs 8081)
2. **缺少 CORS 中间件**: Gin 路由器 (`gin.Default()`) 默认不包含 CORS 处理
3. **浏览器安全政策**: 浏览器要求跨域请求必须得到服务器的明确同意

## 解决方案

### 1. 创建 CORS 中间件

**文件**: `internal/api/middleware/cors.go` (新建)

```go
package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORSMiddleware enables CORS for cross-origin requests from frontend
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
```

**工作原理**:
- `Access-Control-Allow-Origin: *` - 允许来自任何域的请求 (生产环境应改为特定域名)
- `Access-Control-Allow-Methods` - 声明后端支持的 HTTP 方法
- `Access-Control-Allow-Headers` - 声明后端接受的请求头
- `OPTIONS 预检` - 处理浏览器的 CORS 预检请求

### 2. 在路由中应用中间件

**修改**: `internal/api/router.go`

```go
// Apply Global Middleware
r.Use(middleware.CORSMiddleware())
```

这确保所有路由都会设置正确的 CORS 响应头，包括：
- Public routes (`/login`, `/health`)
- Admin routes (`/admin/*`)
- Protected API routes (`/api/*`)

## CORS 请求流程

### 简单请求 (Simple Request)
非 "预检" 方法的请求（如 GET）:

```
浏览器 → POST /login on :8081 (included Origin header)
         ↓
后端 → 返回响应 + CORS 响应头
         ↓
浏览器 → 检查 Access-Control-Allow-Origin
         ↓
允许 ✅ or 拒绝 ❌
```

### 预检请求 (Preflight Request)
某些 POST 请求会触发预检:

```
浏览器 → OPTIONS /login (询问 "可以发送 POST 吗?")
         ↓
后端 (CORSMiddleware) → 返回 204 + CORS 响应头
         ↓
浏览器 → 检查响应头
         ↓
如果允许 → 发送实际的 POST 请求
        → POST /login (with actual data)
```

## 测试 CORS 设置

### 自动化测试

```bash
./test-cors.sh
```

脚本会验证:
1. ✅ 后端服务器正在运行
2. ✅ OPTIONS 预检请求返回正确的 CORS 响应头
3. ✅ /health 端点设置了 CORS 响应头
4. ✅ /login 端点设置了 CORS 响应头
5. ✅ 所有必需的 CORS 响应头都已设置

### 手动测试

在浏览器中测试 (代替 curl):

1. 打开浏览器开发者工具 (F12)
2. 切换到 Console 标签
3. 运行以下 JavaScript 代码:

```javascript
// 测试 OPTIONS 预检请求
fetch('http://localhost:8081/login', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:5173'
  }
}).then(r => {
  console.log('Status:', r.status);
  console.log('CORS Headers:');
  console.log('  Allow-Origin:', r.headers.get('Access-Control-Allow-Origin'));
  console.log('  Allow-Methods:', r.headers.get('Access-Control-Allow-Methods'));
}).catch(e => console.error('Error:', e));
```

或直接测试登录请求:

```javascript
// 实际登录请求
fetch('http://localhost:8081/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:5173'
  },
  body: JSON.stringify({
    user_id: 'admin',
    password: 'password'
  })
}).then(r => r.json())
  .then(d => console.log('Response:', d))
  .catch(e => console.error('CORS Error:', e));
```

## 生产环境配置

在生产环境中，应该限制 CORS 来源到特定的域名，而不是到处都允许:

```go
// 修改 CORSMiddleware 为:
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		// 只允许生产域名
		allowedOrigins := map[string]bool{
			"https://app.example.com": true,
			"https://www.example.com": true,
		}

		if allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
```

## 相关资源

- [MDN - CORS (跨源资源共享)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Gin CORS 最佳实践](https://gin-gonic.com/)
- [浏览器 CORS 预检请求详解](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)

## 修改文件清单

| 文件 | 修改内容 | 类型 |
|------|--------|------|
| `internal/api/middleware/cors.go` | 新建 CORS 中间件 | ✨ 新建 |
| `internal/api/router.go` | 在路由中应用 CORS 中间件 | 🔧 修改 |
| `test-cors.sh` | CORS 验证脚本 | ✨ 新建 |

## 现在支持的操作

✅ 前端从 `http://localhost:5173` 成功发送 POST 请求到 `http://localhost:8081/login`
✅ 浏览器不再返回 CORS 错误
✅ 登录功能正常工作
✅ 所有跨域请求都得到了正确的 CORS 管理

## 完整的开发流程

```bash
# 1. 启动后端服务
make run-backend

# 2. 在新终端启动前端开发服务器
make run-frontend

# 3. (可选) 测试 CORS 配置
./test-cors.sh

# 4. 打开浏览器访问前端
open http://localhost:5173

# 5. 尝试登录 (用户: admin, 密码: password)
```

预期结果:
- ✅ 能够成功登录
- ✅ 浏览器控制台没有 CORS 错误
- ✅ 可以正常使用应用
