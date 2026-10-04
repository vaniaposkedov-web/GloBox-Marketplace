# Deploy ONLY Mediator panel to server
# Usage: powershell -ExecutionPolicy Bypass -File .\deploy\deploy-mediator.ps1
$ErrorActionPreference = "Stop"
$SERVER = "root@5.42.127.159"

Write-Host "`n=== Deploy Mediator ===" -ForegroundColor Cyan

# 1. Archive full project (mediator needs shared etc)
$archive = "$env:TEMP\mp-mediator.tar.gz"
if (Test-Path $archive) { Remove-Item $archive -Force }

& "$env:SystemRoot\System32\tar.exe" `
  --exclude="marketplizzzz/.git" `
  --exclude="marketplizzzz/node_modules" `
  --exclude="marketplizzzz/.pnpm-store" `
  --exclude="marketplizzzz/apps/web" `
  --exclude="marketplizzzz/apps/admin" `
  --exclude="marketplizzzz/apps/seller" `
  --exclude="marketplizzzz/apps/api" `
  --exclude="marketplizzzz/apps/mediator/.next" `
  --exclude="marketplizzzz/packages/shared/dist" `
  -czf $archive `
  -C "d:\project_work_frilans" `
  "marketplizzzz"

$sizeMb = [math]::Round((Get-Item $archive).Length / 1MB, 1)
Write-Host "  Archive: $sizeMb MB" -ForegroundColor Green

# 2. Upload
Write-Host "  Uploading..." -ForegroundColor Yellow
& scp -o StrictHostKeyChecking=no $archive "${SERVER}:/root/mp-mediator.tar.gz"

# 3. Build on server
Write-Host "  Building on server..." -ForegroundColor Yellow
$script = @'
set -e
TMPDIR=/root/tmp_med_deploy
rm -rf $TMPDIR && mkdir -p $TMPDIR
tar -xzf /root/mp-mediator.tar.gz --strip-components=1 -C $TMPDIR
rm -f /root/mp-mediator.tar.gz
rsync -a --delete $TMPDIR/ /root/marketplace_posrednik/ --exclude='.git' --exclude='node_modules' --exclude='.next'
rm -rf $TMPDIR
cd /root/marketplace_posrednik
pnpm install 2>&1 | tail -5
cd apps/mediator
echo 'NEXT_PUBLIC_API_URL=https://glo-box.ru/api' > .env.production
node node_modules/next/dist/bin/next build 2>&1 | tail -15
pm2 restart marketplace-mediator
echo "=== Mediator deployed ==="
'@
$sf = "$env:TEMP\mp-med-deploy.sh"
[System.IO.File]::WriteAllText($sf, $script, [System.Text.UTF8Encoding]::new($false))
& scp -o StrictHostKeyChecking=no $sf "${SERVER}:/root/mp-med-deploy.sh"
& ssh -o StrictHostKeyChecking=no $SERVER "bash /root/mp-med-deploy.sh"

Write-Host "`n=== Mediator Deploy DONE ===" -ForegroundColor Green
Remove-Item $archive, $sf -Force -ErrorAction SilentlyContinue
