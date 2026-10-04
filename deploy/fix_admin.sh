#!/bin/bash
set -e

echo "=== Create admin .env ==="
echo 'NEXT_PUBLIC_API_URL=https://glo-box.ru/api' > /root/marketplace/apps/admin/.env
cat /root/marketplace/apps/admin/.env

echo ""
echo "=== Rebuild admin ==="
cd /root/marketplace/apps/admin
pnpm build 2>&1 | tail -15

echo ""
echo "=== Restart admin ==="
pm2 restart marketplace-admin
sleep 3
pm2 status
