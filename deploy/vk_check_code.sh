#!/bin/bash
VK_TOKEN="${VK_TOKEN:?задайте VK_TOKEN}"
VK_GROUP_ID="238664552"

echo "=== Get actual confirmation code from VK ==="
curl -s "https://api.vk.com/method/groups.getCallbackConfirmationCode?group_id=${VK_GROUP_ID}&access_token=${VK_TOKEN}&v=5.199" | python3 -m json.tool

echo ""
echo "=== Current .env confirmation value ==="
grep VK_BOT_CONFIRMATION /root/marketplace/apps/api/.env

echo ""
echo "=== Check nginx logs for VK requests ==="
grep -i "webhook/vk" /var/log/nginx/access.log 2>/dev/null | tail -10
