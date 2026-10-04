#!/bin/bash
VK_TOKEN="${VK_TOKEN:?задайте VK_TOKEN}"
VK_GROUP_ID="238664552"
CALLBACK_URL="https://glo-box.ru/api/notifications/webhook/vk"
SECRET_KEY="${SECRET_KEY:?задайте SECRET_KEY}"

echo "=== Delete old server 3 ==="
curl -s "https://api.vk.com/method/groups.deleteCallbackServer?group_id=${VK_GROUP_ID}&server_id=3&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

echo ""
echo "=== Add new callback server ==="
curl -s "https://api.vk.com/method/groups.addCallbackServer?group_id=${VK_GROUP_ID}&url=${CALLBACK_URL}&title=GloBox&secret_key=${SECRET_KEY}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

echo ""
echo "=== Check status ==="
curl -s "https://api.vk.com/method/groups.getCallbackServers?group_id=${VK_GROUP_ID}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool
