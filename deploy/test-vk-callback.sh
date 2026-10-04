#!/bin/bash
curl -s -X POST https://glo-box.ru/api/notifications/webhook/vk \
  -H "Content-Type: application/json" \
  -d '{"type":"confirmation","group_id":238664552}'
echo ""
