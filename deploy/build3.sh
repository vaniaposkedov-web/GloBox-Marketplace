#!/bin/bash
echo "=== API ===" && cd /root/marketplace/apps/api && npx nest build && pm2 restart marketplace-api && echo "API_OK"
echo "=== MEDIATOR ===" && cd /root/marketplace_posrednik/apps/mediator && npx next build && pm2 restart marketplace-mediator && echo "MED_OK"
pm2 save && echo "ALL_DONE"
