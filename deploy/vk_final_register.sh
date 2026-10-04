#!/bin/bash
VK_TOKEN="${VK_TOKEN:?задайте VK_TOKEN}"
VK_GROUP_ID="238664552"
CALLBACK_URL="https://glo-box.ru/api/notifications/webhook/vk"
SECRET_KEY="${SECRET_KEY:?задайте SECRET_KEY}"

echo "=== Test endpoint returns correct code ==="
curl -s -X POST http://localhost:4000/api/notifications/webhook/vk \
  -H "Content-Type: application/json" \
  -d '{"type":"confirmation","group_id":238664552}'

echo ""
echo "=== Delete old server 5 ==="
curl -s "https://api.vk.com/method/groups.deleteCallbackServer?group_id=${VK_GROUP_ID}&server_id=5&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

sleep 2

echo ""
echo "=== Register new callback server ==="
curl -s "https://api.vk.com/method/groups.addCallbackServer?group_id=${VK_GROUP_ID}&url=${CALLBACK_URL}&title=GloBox&secret_key=${SECRET_KEY}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

sleep 5

echo ""
echo "=== Final status ==="
curl -s "https://api.vk.com/method/groups.getCallbackServers?group_id=${VK_GROUP_ID}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool
