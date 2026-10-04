#!/bin/bash
# Test notification API endpoints
echo "=== Test /api/notifications/my (no auth) ==="
curl -s https://glo-box.ru/api/notifications/my
echo ""

echo "=== Test /api/notifications/link/TELEGRAM (no auth) ==="
curl -s -X POST https://glo-box.ru/api/notifications/link/TELEGRAM
echo ""

echo "=== Test CORS preflight from posred-globox.ru ==="
curl -s -o /dev/null -w "HTTP %{http_code}" \
  -X OPTIONS https://glo-box.ru/api/notifications/my \
  -H "Origin: https://posred-globox.ru" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type"
echo ""

echo "=== Check API logs ==="
pm2 logs marketplace-api --lines 10 --nostream 2>&1 | grep -i "notif\|error\|Error" | tail -10
echo ""
echo "DONE"
