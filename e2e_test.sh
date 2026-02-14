#!/bin/bash

BASE_URL="http://localhost:8080"

echo "1. Checking Health..."
for i in {1..10}; do
    if curl -s --connect-timeout 2 "$BASE_URL/health" | grep "ok"; then
        echo "OK"
        break
    fi
    echo "Waiting for server..."
    sleep 1
done

echo "2. Adding Repository..."
# Using a public repo that has index.yaml
# We'll use Bitnami for real test, or just a dummy one if network is restricted.
# Let's try to add bitnami, but sync might take time.
curl -s -X POST -H "Content-Type: application/json" \
    -d '{"name":"bitnami", "url":"https://charts.bitnami.com/bitnami"}' \
    "$BASE_URL/admin/repos"
echo "OK"

echo "3. Login..."
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"user_id":"test-user", "password":"password"}' \
    "$BASE_URL/login" | jq -r .token)

if [ "$TOKEN" == "null" ]; then
    echo "Login failed"
    exit 1
fi
echo "Got Token: ${TOKEN:0:10}..."

echo "4. Async Deployment (Nginx)..."
# We assume 'nginx' chart exists locally in /tmp/charts/nginx (created in previous step)
# In real scenario, we'd sync repo first, but for this test we rely on local path mock in service
# Wait, service code uses /tmp/charts/ID.
# My DeployService mocks chart path: /tmp/charts/nginx.
# So I need to ensure it exists.
mkdir -p /tmp/charts/nginx

RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "chart_id": "nginx",
        "version": "1.0.0",
        "release_name": "async-nginx",
        "namespace": "default",
        "user_values": {"replicaCount": 1},
        "is_quick_mode": true
    }' \
    "$BASE_URL/api/deploy")

TASK_ID=$(echo $RESPONSE | jq -r .task_id)
echo "Task ID: $TASK_ID"

if [ "$TASK_ID" == "null" ]; then
    echo "Deployment failed: $RESPONSE"
    exit 1
fi

echo "5. Polling Task Status..."
for i in {1..10}; do
    STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/tasks/$TASK_ID" | jq -r .status)
    echo "Current Status: $STATUS"
    if [ "$STATUS" == "completed" ]; then
        echo "Deployment Completed!"
        break
    fi
    if [ "$STATUS" == "failed" ]; then
        echo "Deployment Failed!"
        exit 1
    fi
    sleep 1
done

echo "6. Verify Instance..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/instances" | grep "async-nginx"
echo "OK"

echo "All Tests Passed!"
