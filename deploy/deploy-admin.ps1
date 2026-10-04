# Deploy ONLY Admin panel to server
# Usage: powershell -ExecutionPolicy Bypass -File .\deploy\deploy-admin.ps1
$ErrorActionPreference = "Stop"
$SERVER = "root@5.42.127.159"

Write-Host "`n=== Deploy Admin ===" -ForegroundColor Cyan

# 1. Archive only admin
$archive = "$env:TEMP\mp-admin.tar.gz"
if (Test-Path $archive) { Remove-Item $archive -Force }

& tar `
  --exclude="marketplizzzz/.git" `
  --exclude="marketplizzzz/node_modules" `
  --exclude="marketplizzzz/apps/admin/.next" `
  -czf $archive `
  -C "d:\project_work_frilans" `
  "marketplizzzz/apps/admin"

$sizeMb = [math]::Round((Get-Item $archive).Length / 1MB, 1)
Write-Host "  Archive: $sizeMb MB" -ForegroundColor Green

# 2. Upload
Write-Host "  Uploading..." -ForegroundColor Yellow
& scp -o StrictHostKeyChecking=no $archive "${SERVER}:/root/mp-admin.tar.gz"

# 3. Build on server
Write-Host "  Building on server..." -ForegroundColor Yellow
$script = @'
set -e
cd /root/marketplace
tar -xzf /root/mp-admin.tar.gz --strip-components=1
rm -f /root/mp-admin.tar.gz
pnpm install 2>&1 | tail -3
cd apps/admin
echo 'NEXT_PUBLIC_API_URL=https://glo-box.ru/api' > .env.production
node node_modules/next/dist/bin/next build 2>&1 | tail -15

# Fix nginx: admin moved from port 3002 to 3004
sed -i 's|location /admin.*|location /admin {|' /etc/nginx/sites-enabled/glo-box.ru 2>/dev/null || true
# Replace port 3002 with 3004 ONLY in the /admin location block (glo-box.ru config)
python3 -c "
import re, sys
with open('/etc/nginx/sites-enabled/glo-box.ru') as f:
    c = f.read()
# Replace proxy_pass for /admin block from 3002 to 3004
c = re.sub(r'(location\s+/admin\s*\{[^}]*proxy_pass\s+http://127\.0\.0\.1:)3002', r'\g<1>3004', c, flags=re.DOTALL)
with open('/etc/nginx/sites-enabled/glo-box.ru', 'w') as f:
    f.write(c)
print('nginx patched')
" 2>/dev/null || true
nginx -t && nginx -s reload || true

# Start/restart admin on port 3004
pm2 delete marketplace-admin 2>/dev/null || true
cd /root/marketplace/apps/admin
PORT=3004 pm2 start node_modules/next/dist/bin/next --name marketplace-admin -- start -p 3004
pm2 save
echo "=== Admin deployed on port 3004 ==="
'@
$sf = "$env:TEMP\mp-admin-deploy.sh"
[System.IO.File]::WriteAllText($sf, $script, [System.Text.UTF8Encoding]::new($false))
& scp -o StrictHostKeyChecking=no $sf "${SERVER}:/root/mp-admin-deploy.sh"
& ssh -o StrictHostKeyChecking=no $SERVER "bash /root/mp-admin-deploy.sh"

Write-Host "`n=== Admin Deploy DONE ===" -ForegroundColor Green
Remove-Item $archive, $sf -Force -ErrorAction SilentlyContinue
