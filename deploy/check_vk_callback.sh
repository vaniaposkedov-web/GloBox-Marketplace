#!/bin/bash
VK_TOKEN="${VK_TOKEN:?задайте VK_TOKEN}"
VK_GROUP_ID="238664552"

echo "=== VK Callback Servers ==="
curl -s "https://api.vk.com/method/groups.getCallbackServers?group_id=${VK_GROUP_ID}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

echo ""
echo "=== Testing VK endpoint locally ==="
curl -s -X POST http://localhost:4000/api/notifications/webhook/vk -H 'Content-Type: application/json' -d '{"type":"confirmation","group_id":238664552}'
echo ""
