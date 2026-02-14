#!/bin/bash

# CORS 测试脚本
# 验证后端是否正确设置 CORS 响应头

set -e

BASE_URL="http://localhost:8081"

echo "🧪 CORS 响应头测试"
echo "===================="
echo ""

# 检查服务器是否运行
echo "1️⃣  检查后端服务器..."
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo "❌ 错误: 无法连接到 $BASE_URL"
    echo "   请先运行: make run-backend"
    exit 1
fi
echo "✅ 后端服务器运行中"
echo ""

# 测试 OPTIONS 预检请求
echo "2️⃣  测试 OPTIONS 预检请求 (/login)..."
RESPONSE=$(curl -s -i -X OPTIONS "$BASE_URL/login" -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST")
if echo "$RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo "✅ 返回 CORS 响应头"
    echo "   响应头摘录:"
    echo "$RESPONSE" | grep -i "access-control" | head -5 | sed 's/^/     /'
else
    echo "❌ 未设置 CORS 响应头"
    exit 1
fi
echo ""

# 测试 /health 端点
echo "3️⃣  测试 /health 端点 CORS..."
RESPONSE=$(curl -s -i "$BASE_URL/health" -H "Origin: http://localhost:5173")
if echo "$RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo "✅ /health 返回 CORS 响应头"
    echo "   Access-Control-Allow-Origin: $(echo "$RESPONSE" | grep 'Access-Control-Allow-Origin')"
else
    echo "❌ /health 未设置 CORS 响应头"
    exit 1
fi
echo ""

# 测试 /login 端点
echo "4️⃣  测试 /login POST 端点..."
RESPONSE=$(curl -s -i -X POST "$BASE_URL/login" \
    -H "Content-Type: application/json" \
    -H "Origin: http://localhost:5173" \
    -d '{"user_id":"admin","password":"password"}' 2>&1)

if echo "$RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo "✅ /login 返回 CORS 响应头"
    echo "   $(echo "$RESPONSE" | grep 'Access-Control-Allow-Origin')"
else
    echo "⚠️  /login 返回状态可能异常"
fi
echo ""

# 验证必要的 CORS 响应头
echo "5️⃣  验证 CORS 响应头完整性..."
RESPONSE=$(curl -s -i -X OPTIONS "$BASE_URL/login" -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST")

REQUIRED_HEADERS=("Access-Control-Allow-Origin" "Access-Control-Allow-Methods" "Access-Control-Allow-Headers")
ALL_PRESENT=true

for header in "${REQUIRED_HEADERS[@]}"; do
    if echo "$RESPONSE" | grep -q -i "$header"; then
        echo "  ✅ $header: 已设置"
    else
        echo "  ❌ $header: 缺失"
        ALL_PRESENT=false
    fi
done
echo ""

if [ "$ALL_PRESENT" = true ]; then
    echo "===================="
    echo "🎉 CORS 配置正确!"
    echo ""
    echo "现在可以测试前端登录:"
    echo "  1. 启动后端: make run-backend"
    echo "  2. 启动前端: make run-frontend"
    echo "  3. 访问 http://localhost:5173/login"
    echo "  4. 尝试登录 (用户: admin, 密码: password)"
else
    echo "===================="
    echo "❌ CORS 配置不完整，需要修复"
    exit 1
fi
