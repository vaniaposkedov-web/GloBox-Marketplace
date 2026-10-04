#!/bin/bash

echo "=== Admin .env files ==="
cat /root/marketplace/apps/admin/.env.local 2>/dev/null || echo "no .env.local"
cat /root/marketplace/apps/admin/.env.production 2>/dev/null || echo "no .env.production"
cat /root/marketplace/apps/admin/.env 2>/dev/null || echo "no .env"

echo ""
echo "=== Get admin token ==="
TOKEN=$(curl -s -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@globox.local","password":"'"${ADMIN_PASSWORD}"'"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
echo "TOKEN=${TOKEN:0:30}..."

echo ""
echo "=== Test mediators list ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/admin/mediators | python3 -m json.tool 2>/dev/null | head -40

echo ""
echo "=== Check admin port / nginx ==="
grep -A5 "admin" /etc/nginx/sites-enabled/* 2>/dev/null | head -20
