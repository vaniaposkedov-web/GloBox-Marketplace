#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@globox.local","password":"'"${ADMIN_PASSWORD}"'"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

RESULT=$(curl -s "http://localhost:4000/api/admin/mediators" \
  -H "Authorization: Bearer $TOKEN")

echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('total mediators:', d['total'])"
