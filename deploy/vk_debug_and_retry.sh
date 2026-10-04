#!/bin/bash
VK_TOKEN="${VK_TOKEN:?задайте VK_TOKEN}"
VK_GROUP_ID="238664552"
CALLBACK_URL="https://glo-box.ru/api/notifications/webhook/vk"
SECRET_KEY="${SECRET_KEY:?задайте SECRET_KEY}"

echo "=== Full response headers from our endpoint ==="
curl -sv -X POST https://glo-box.ru/api/notifications/webhook/vk \
  -H "Content-Type: application/json" \
  -d '{"type":"confirmation","group_id":238664552,"secret":"'"${SECRET_KEY}"'"}' 2>&1

echo ""
echo "=== Response body hex dump (check for trailing chars) ==="
curl -s -X POST https://glo-box.ru/api/notifications/webhook/vk \
  -H "Content-Type: application/json" \
  -d '{"type":"confirmation","group_id":238664552,"secret":"'"${SECRET_KEY}"'"}' | xxd | head -5

echo ""
echo "=== Delete old server 4 ==="
curl -s "https://api.vk.com/method/groups.deleteCallbackServer?group_id=${VK_GROUP_ID}&server_id=4&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

echo ""
echo "=== Wait 2s then add new ==="
sleep 2
curl -s "https://api.vk.com/method/groups.addCallbackServer?group_id=${VK_GROUP_ID}&url=${CALLBACK_URL}&title=GloBox&secret_key=${SECRET_KEY}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

echo ""
echo "=== Wait 3s, check status ==="
sleep 3
curl -s "https://api.vk.com/method/groups.getCallbackServers?group_id=${VK_GROUP_ID}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool
