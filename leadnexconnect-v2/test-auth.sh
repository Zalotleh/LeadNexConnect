#!/bin/bash

echo "🧪 Testing Authentication Endpoints"
echo "===================================="
echo ""

BASE_URL="http://localhost:4000/api"

# Test 1: Login
echo "1️⃣ Testing Login (user1@leadnex.com)..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@leadnex.com","password":"ChangeMe123!"}')

echo "$LOGIN_RESPONSE" | jq '.'

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed - no token received"
  exit 1
fi

echo "✅ Login successful! Token: ${TOKEN:0:20}..."
echo ""

# Test 2: Get current user
echo "2️⃣ Testing Get Current User..."
USER_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

echo "$USER_RESPONSE" | jq '.'
echo ""

# Test 3: Protected endpoint (leads)
echo "3️⃣ Testing Protected Endpoint (GET /api/leads)..."
LEADS_RESPONSE=$(curl -s -X GET "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN")

echo "$LEADS_RESPONSE" | jq '. | {success, totalCount: (.data.leads | length)}'
echo ""

# Test 4: Unauthorized access
echo "4️⃣ Testing Unauthorized Access (no token)..."
UNAUTH_RESPONSE=$(curl -s -X GET "$BASE_URL/leads")

echo "$UNAUTH_RESPONSE" | jq '.'
echo ""

# Test 5: Admin login
echo "5️⃣ Testing Admin Login..."
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@leadnex.com","password":"Admin@123!"}')

echo "$ADMIN_RESPONSE" | jq '. | {success, user: .data.user.email, role: .data.user.role}'
echo ""

# Test 6: Logout
echo "6️⃣ Testing Logout..."
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $TOKEN")

echo "$LOGOUT_RESPONSE" | jq '.'
echo ""

echo "===================================="
echo "✅ All auth tests completed!"
