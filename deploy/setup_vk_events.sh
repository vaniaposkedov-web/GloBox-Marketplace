#!/bin/bash
VK_TOKEN="${VK_TOKEN:?задайте VK_TOKEN}"
VK_GROUP_ID="238664552"
SERVER_ID="2"

echo "=== Setting callback events (message_new) ==="
curl -s "https://api.vk.com/method/groups.setCallbackSettings?group_id=${VK_GROUP_ID}&server_id=${SERVER_ID}&api_version=5.199&message_new=1&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

echo ""
echo "=== Verify callback servers ==="
curl -s "https://api.vk.com/method/groups.getCallbackServers?group_id=${VK_GROUP_ID}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool
