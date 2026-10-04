#!/bin/bash
VK_TOKEN="${VK_TOKEN:?задайте VK_TOKEN}"
VK_GROUP_ID="238664552"

echo "=== Delete server 2 (old failed) ==="
curl -s "https://api.vk.com/method/groups.deleteCallbackServer?group_id=${VK_GROUP_ID}&server_id=2&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

echo ""
echo "=== Current servers ==="
curl -s "https://api.vk.com/method/groups.getCallbackServers?group_id=${VK_GROUP_ID}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

echo ""
echo "=== Set events for server 3 ==="
curl -s "https://api.vk.com/method/groups.setCallbackSettings?group_id=${VK_GROUP_ID}&server_id=3&api_version=5.199&message_new=1&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

echo ""
echo "=== Final check ==="
curl -s "https://api.vk.com/method/groups.getCallbackServers?group_id=${VK_GROUP_ID}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool
