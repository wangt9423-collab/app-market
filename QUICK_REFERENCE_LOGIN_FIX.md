# 登录修复：快速参考

## ❌ 问题

```
前端发送: {"username":"admin","password":"password"}
         ↓
后端期望: {"user_id":"admin","password":"password"}
         ↓
❌ 字段名不匹配 → 验证失败
```

## ✅ 解决方案

只需修改一个文件的两个地方：

### 文件: `internal/api/handler/auth.go`

**修改位置 1** (第 20-23 行):

```diff
  type LoginRequest struct {
-     UserID   string `json:"user_id" binding:"required" example:"admin"`
+     Username string `json:"username" binding:"required" example:"admin"`
      Password string `json:"password" binding:"required" example:"admin123"`
  }
```

**修改位置 2** (第 48 行):

```diff
- if err := h.db.Where("username = ?", req.UserID).First(&user).Error; err != nil {
+ if err := h.db.Where("username = ?", req.Username).First(&user).Error; err != nil {
```

## 🧪 测试验证

### 快速验证 (推荐)
```bash
./test-login.sh
```

### 手动验证
```bash
curl -X POST http://localhost:8081/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

期望响应:
```json
{"token":"eyJhbGciOiJIUzI1Ni..."}
```

## 📌 重要提醒

- ⚠️ 修改代码后需要 **重启后端** (Ctrl+C 后 make run-backend)
- 🔄 前端可以不重启，会自动重新连接
- 📱 刷新浏览器页面
- 🔐 默认用户: `admin` / `password` (由 make init-admin 创建)

## 🎯 预期结果

修复后你应该能够:
- ✅ 成功登录
- ✅ 获得有效的 JWT Token
- ✅ 访问受保护的 API 端点
- ✅ 浏览器控制台没有错误

## 📚 更多信息

- **详细分析**: 阅读 [LOGIN_VALIDATION_ERROR_ANALYSIS.md](./LOGIN_VALIDATION_ERROR_ANALYSIS.md)
- **简明说明**: 阅读 [LOGIN_FIX.md](./LOGIN_FIX.md)
- **所有修复**: 查看 [INDEX.md](./INDEX.md) 的常见问题部分

---

**这就是全部！修复代码只需改两行。**
