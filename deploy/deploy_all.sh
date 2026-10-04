#!/bin/bash
set -e

cd /root/marketplace
echo "=== Git pull ==="
git pull

echo ""
echo "=== Build admin ==="
cd /root/marketplace/apps/admin
pnpm build 2>&1 | tail -5

echo ""
echo "=== Build mediator ==="
cd /root/marketplace/apps/mediator
pnpm build 2>&1 | tail -5

echo ""
echo "=== Restart PM2 ==="
pm2 restart marketplace-admin marketplace-mediator --update-env
sleep 3
pm2 status
