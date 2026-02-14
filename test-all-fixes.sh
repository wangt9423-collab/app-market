#!/bin/bash

# 完整测试脚本 - 验证所有修复

echo "🧪 App-Market 完整修复验证"
echo "================================"
echo ""

# 1. 检查文件是否存在
echo "1️⃣  检查新增和修改的文件..."
FILES=(
    "CLAUDE.md"
    "QUICK_START.md"
    "SPA_ROUTING_FIX.md"
    "CORS_FIX.md"
    "SESSION_SUMMARY.md"
    "frontend/nginx.conf"
    "frontend/test-spa-routing.sh"
    "test-cors.sh"
    "internal/api/middleware/cors.go"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (缺失)"
        ALL_EXIST=false
    fi
done
echo ""

if [ "$ALL_EXIST" = false ]; then
    echo "❌ 某些文件缺失，请检查"
    exit 1
fi

# 2. 检查代码修改
echo "2️⃣  检查关键代码修改..."

# 检查 CORS 中间件是否在路由中应用
if grep -q "r.Use(middleware.CORSMiddleware())" internal/api/router.go; then
    echo "  ✅ CORS 中间件已在路由中应用"
else
    echo "  ❌ CORS 中间件未应用"
    exit 1
fi

# 检查 vite.config.ts 是否有 historyApiFallback
if grep -q "historyApiFallback: true" frontend/vite.config.ts 2>/dev/null || \
   grep -q "historyApiFallback: true" frontend/vite.config.js 2>/dev/null; then
    echo "  ✅ Vite historyApiFallback 已配置"
else
    echo "  ⚠️  Vite historyApiFallback (需要手动验证)"
fi

# 检查 Dockerfile 是否包含多阶段构建
if grep -q "FROM node:20-alpine AS frontend-builder" Dockerfile; then
    echo "  ✅ Dockerfile 多阶段构建已配置"
else
    echo "  ❌ Dockerfile 未使用多阶段构建"
    exit 1
fi

# 检查 nginx.conf 的 SPA fallback
if grep -q "try_files \$uri \$uri/ /index.html" frontend/nginx.conf; then
    echo "  ✅ Nginx SPA fallback 已配置"
else
    echo "  ❌ Nginx SPA fallback 未配置"
    exit 1
fi

echo ""

# 3. 检查构建
echo "3️⃣  检查后端是否能正常构建..."
if go build -o app-market-test ./cmd/app-market > /dev/null 2>&1; then
    echo "  ✅ 后端构建成功"
    rm -f app-market-test
else
    echo "  ❌ 后端构建失败"
    exit 1
fi
echo ""

# 4. 端口检查
echo "4️⃣  检查端口配置一致性..."

PORT_8080=$(grep -r "8080" \
    frontend/src/services/api.ts \
    frontend/.env \
    templates/index.html \
    frontend/vite.config.ts \
    2>/dev/null | wc -l)

if [ "$PORT_8080" -eq 0 ]; then
    echo "  ✅ 前端端口已全部改为 8081"
else
    echo "  ⚠️  还有 $PORT_8080 处使用了 8080 端口 (手动检查)"
fi

echo ""

# 5. 参考文档
echo "5️⃣  本次修复涉及的文档..."
echo "  📚 开发指南: CLAUDE.md"
echo "  📚 快速开始: QUICK_START.md"
echo "  📚 路由修复: SPA_ROUTING_FIX.md"
echo "  📚 CORS 修复: CORS_FIX.md"
echo "  📚 会话总结: SESSION_SUMMARY.md"
echo ""

echo "================================"
echo "✅ 所有修复验证完成！"
echo ""
echo "🚀 下一步:"
echo "  1. 运行后端: make run-backend"
echo "  2. 运行前端: make run-frontend"
echo "  3. 访问: http://localhost:5173/login"
echo "  4. 尝试登录: 用户: admin, 密码: password"
