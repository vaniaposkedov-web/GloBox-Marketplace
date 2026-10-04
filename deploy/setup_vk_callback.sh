#!/bin/bash
VK_TOKEN="${VK_TOKEN:?задайте VK_TOKEN}"
VK_GROUP_ID="238664552"
CALLBACK_URL="https://glo-box.ru/api/notifications/webhook/vk"
SECRET_KEY="${SECRET_KEY:?задайте SECRET_KEY}"

echo "=== Step 1: Delete old callback server (id=1) ==="
curl -s "https://api.vk.com/method/groups.deleteCallbackServer?group_id=${VK_GROUP_ID}&server_id=1&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

echo ""
echo "=== Step 2: Add new callback server ==="
curl -s "https://api.vk.com/method/groups.addCallbackServer?group_id=${VK_GROUP_ID}&url=${CALLBACK_URL}&title=GloBox&secret_key=${SECRET_KEY}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

echo ""
echo "=== Step 3: Get callback servers ==="
curl -s "https://api.vk.com/method/groups.getCallbackServers?group_id=${VK_GROUP_ID}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool
