#!/bin/bash
set -e
echo "[1/3] Building API..."
cd /root/marketplace/apps/api
npx nest build
pm2 restart marketplace-api
echo "API_DONE"

echo "[2/3] Building Mediator..."
cd /root/marketplace/apps/mediator
npx next build
pm2 restart marketplace-mediator
echo "MEDIATOR_DONE"

echo "[3/3] Building Admin..."
cd /root/marketplace/apps/admin
npx next build
pm2 restart marketplace-admin
echo "ADMIN_DONE"

pm2 save
echo "ALL_DONE"
