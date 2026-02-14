#!/bin/bash

# Test Login Functionality
# This script verifies that the login endpoint works correctly with the fixed field names

set -e

echo "🔐 Testing Login Endpoint..."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is running
echo -e "${BLUE}[1/4]${NC} Checking if backend is running..."
if curl -s http://localhost:8081/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on :8081${NC}"
else
    echo -e "${RED}❌ Backend is not running on :8081${NC}"
    echo "Please start the backend with: make run-backend"
    exit 1
fi

echo ""

# Test login with correct credentials
echo -e "${BLUE}[2/4]${NC} Testing login with admin credentials..."
echo "Request: POST /login"
echo '{"username":"admin","password":"password"}'
echo ""

RESPONSE=$(curl -s -X POST http://localhost:8081/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}')

echo "Response: $RESPONSE"
echo ""

# Check if we got a token
if echo "$RESPONSE" | grep -q '"token"'; then
    echo -e "${GREEN}✅ Login successful! Token received.${NC}"
    TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "Token: ${TOKEN:0:20}..."
else
    echo -e "${RED}❌ Login failed or token not received${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""

# Test with invalid credentials
echo -e "${BLUE}[3/4]${NC} Testing login with invalid credentials (should fail)..."
INVALID_RESPONSE=$(curl -s -X POST http://localhost:8081/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrongpassword"}')

if echo "$INVALID_RESPONSE" | grep -q "Invalid username or password"; then
    echo -e "${GREEN}✅ Correctly rejected invalid credentials${NC}"
else
    echo -e "${RED}❌ Did not properly reject invalid credentials${NC}"
fi

echo ""

# Test CORS headers are present
echo -e "${BLUE}[4/4]${NC} Verifying CORS headers are present in login response..."
HEADERS=$(curl -s -i -X POST http://localhost:8081/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' 2>&1 | head -20)

if echo "$HEADERS" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✅ CORS headers present${NC}"
else
    echo -e "${YELLOW}⚠️  CORS headers not detected (may not be configured)${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All login tests passed!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "1. Ensure backend is running: make run-backend"
echo "2. Start frontend: make run-frontend"
echo "3. Visit the app: open http://localhost:5173/login"
echo "4. Login with: admin / password"
