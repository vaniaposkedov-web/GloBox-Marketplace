# Deploy ONLY API + shared to server
# Usage: powershell -ExecutionPolicy Bypass -File .\deploy\deploy-api.ps1
$ErrorActionPreference = "Stop"
$SERVER = "root@5.42.127.159"

Write-Host "`n=== Deploy API ===" -ForegroundColor Cyan

# 1. Archive only api + shared + root configs
$archive = "$env:TEMP\mp-api.tar.gz"
if (Test-Path $archive) { Remove-Item $archive -Force }

& tar `
  --exclude="marketplizzzz/.git" `
  --exclude="marketplizzzz/node_modules" `
  --exclude="marketplizzzz/apps/api/dist" `
  --exclude="marketplizzzz/apps/api/.env" `
  --exclude="marketplizzzz/packages/shared/dist" `
  -czf $archive `
  -C "d:\project_work_frilans" `
  "marketplizzzz/apps/api" `
  "marketplizzzz/packages" `
  "marketplizzzz/package.json" `
  "marketplizzzz/pnpm-lock.yaml" `
  "marketplizzzz/pnpm-workspace.yaml" `
  "marketplizzzz/tsconfig.json"

$sizeMb = [math]::Round((Get-Item $archive).Length / 1MB, 1)
Write-Host "  Archive: $sizeMb MB" -ForegroundColor Green

# 2. Upload
Write-Host "  Uploading..." -ForegroundColor Yellow
& scp -o StrictHostKeyChecking=no $archive "${SERVER}:/root/mp-api.tar.gz"

# 3. Build on server
Write-Host "  Building on server..." -ForegroundColor Yellow
$script = @'
set -e
cd /root/marketplace
tar -xzf /root/mp-api.tar.gz --strip-components=1
rm -f /root/mp-api.tar.gz
pnpm install 2>&1 | tail -3
cd apps/api && npx prisma generate && npx prisma db push --skip-generate --accept-data-loss 2>&1 | tail -5
cd /root/marketplace && pnpm run build:shared 2>&1 | tail -3
cd apps/api && rm -rf dist
npx nest build > /tmp/nest-build.log 2>&1 || { tail -30 /tmp/nest-build.log; exit 1; }
tail -5 /tmp/nest-build.log
pm2 restart marketplace-api
echo "=== API deployed ==="
'@
$sf = "$env:TEMP\mp-api-deploy.sh"
[System.IO.File]::WriteAllText($sf, $script, [System.Text.UTF8Encoding]::new($false))
& scp -o StrictHostKeyChecking=no $sf "${SERVER}:/root/mp-api-deploy.sh"
& ssh -o StrictHostKeyChecking=no $SERVER "bash /root/mp-api-deploy.sh"

Write-Host "`n=== API Deploy DONE ===" -ForegroundColor Green
Remove-Item $archive, $sf -Force -ErrorAction SilentlyContinue
