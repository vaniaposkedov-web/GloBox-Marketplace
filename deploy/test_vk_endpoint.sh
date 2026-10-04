#!/bin/bash
echo "=== Test VK confirmation endpoint ==="
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST http://localhost:4000/api/notifications/webhook/vk \
  -H "Content-Type: application/json" \
  -d '{"type":"confirmation","group_id":238664552}'

echo ""
echo "=== Test via external URL ==="
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://glo-box.ru/api/notifications/webhook/vk \
  -H "Content-Type: application/json" \
  -d '{"type":"confirmation","group_id":238664552}'
