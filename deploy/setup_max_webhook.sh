#!/bin/bash
TOKEN="${MAX_BOT_TOKEN:?задайте MAX_BOT_TOKEN}"
URL="https://glo-box.ru/api/notifications/webhook/max"

echo "=== Getting current subscriptions ==="
curl -s -X GET "https://platform-api.max.ru/subscriptions" \
  -H "Authorization: $TOKEN" | python3 -m json.tool 2>/dev/null || cat

echo ""
echo "=== Setting webhook ==="
curl -s -X POST "https://platform-api.max.ru/subscriptions" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$URL\"}" | python3 -m json.tool 2>/dev/null || cat

echo ""
echo "=== Verifying ==="
curl -s -X GET "https://platform-api.max.ru/subscriptions" \
  -H "Authorization: $TOKEN" | python3 -m json.tool 2>/dev/null || cat
