#!/bin/bash
TOKEN="${MAX_BOT_TOKEN:?задайте MAX_BOT_TOKEN}"
URL="https://glo-box.ru/api/notifications/webhook/max"

curl -s -X POST "https://platform-api.max.ru/subscriptions" \
  -H "Authorization: ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${URL}\"}"

echo ""
echo "Done"
