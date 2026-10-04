# =================================================================
#  Deploy API + Admin + Mediator to server 5.42.127.159
#  Run: powershell -ExecutionPolicy Bypass -File .\deploy\deploy-all-from-windows.ps1
# =================================================================

$ErrorActionPreference = "Stop"

$SERVER     = "root@5.42.127.159"
$REMOTE_DIR_API  = "/root/marketplace"
$REMOTE_DIR_MED  = "/root/marketplace_posrednik"
$PROJECT    = "d:\project_work_frilans\marketplizzzz"
$ARCHIVE    = "$env:TEMP\marketplace-all-deploy.tar.gz"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy API + Admin + Mediator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# -- 1. Archive --
Write-Host "[1/4] Creating archive..." -ForegroundColor Yellow

if (Test-Path $ARCHIVE) { Remove-Item $ARCHIVE -Force }

& tar `
  --exclude="marketplizzzz/.git" `
  --exclude="marketplizzzz/node_modules" `
  --exclude="marketplizzzz/.pnpm-store" `
  --exclude="marketplizzzz/apps/web" `
  --exclude="marketplizzzz/apps/seller" `
  --exclude="marketplizzzz/apps/mediator/.next" `
  --exclude="marketplizzzz/apps/admin/.next" `
  --exclude="marketplizzzz/apps/api/dist" `
  --exclude="marketplizzzz/packages/shared/dist" `
  -czf $ARCHIVE `
  -C "d:\project_work_frilans" `
  "marketplizzzz"

if ($LASTEXITCODE -ne 0) { throw "Archive error!" }

$sizeMb = [math]::Round((Get-Item $ARCHIVE).Length / 1MB, 1)
Write-Host "  Archive created: $sizeMb MB" -ForegroundColor Green

# -- 2. Upload --
Write-Host ""
Write-Host "[2/4] Uploading to server..." -ForegroundColor Yellow

& scp -o StrictHostKeyChecking=no $ARCHIVE "${SERVER}:/root/all-deploy.tar.gz"

if ($LASTEXITCODE -ne 0) { throw "Upload error!" }
Write-Host "  Upload OK." -ForegroundColor Green

# -- 3. Deploy --
Write-Host ""
Write-Host "[3/4] Deploying on server..." -ForegroundColor Yellow

$remoteScript = @'
set -e
cd /root

echo '=== Extracting archive ==='
TMPDIR=/root/tmp_deploy_all
rm -rf $TMPDIR
mkdir -p $TMPDIR
tar -xzf /root/all-deploy.tar.gz --strip-components=1 -C $TMPDIR
rm -f /root/all-deploy.tar.gz

echo '=== Deploy API ==='
REMOTE_DIR_API=/root/marketplace
REMOTE_DIR_MED=/root/marketplace_posrednik
mkdir -p $REMOTE_DIR_API
rsync -a --delete $TMPDIR/apps/api/ $REMOTE_DIR_API/apps/api/
rsync -a $TMPDIR/packages/ $REMOTE_DIR_API/packages/
cp -f $TMPDIR/package.json $REMOTE_DIR_API/package.json
cp -f $TMPDIR/pnpm-lock.yaml $REMOTE_DIR_API/pnpm-lock.yaml 2>/dev/null || true
cp -f $TMPDIR/pnpm-workspace.yaml $REMOTE_DIR_API/pnpm-workspace.yaml 2>/dev/null || true
cp -f $TMPDIR/tsconfig.json $REMOTE_DIR_API/tsconfig.json 2>/dev/null || true
cp -rf $TMPDIR/deploy/ $REMOTE_DIR_API/deploy/
cd $REMOTE_DIR_API
bash deploy/deploy-app.sh

echo '=== Deploy Mediator ==='
mkdir -p $REMOTE_DIR_MED
rsync -a --delete $TMPDIR/ $REMOTE_DIR_MED/ --exclude='.git'
NEXT_BIN=$(find $REMOTE_DIR_MED/node_modules/.pnpm -name "next" -path "*/dist/bin/next" | head -1)
cd $REMOTE_DIR_MED/apps/mediator
echo "NEXT_PUBLIC_API_URL=https://glo-box.ru/api" > .env.production
node $NEXT_BIN build
pm2 restart marketplace-mediator 2>/dev/null || pm2 start $NEXT_BIN --name marketplace-mediator --interpreter node --cwd $REMOTE_DIR_MED/apps/mediator -- start -p 3003
pm2 save

echo '=== Deploy Admin ==='
rsync -a --delete $TMPDIR/apps/admin/ $REMOTE_DIR_API/apps/admin/
cd $REMOTE_DIR_API/apps/admin
echo 'NEXT_PUBLIC_API_URL=https://glo-box.ru/api' > .env.production
ADMIN_NEXT=$(find $REMOTE_DIR_API/node_modules/.pnpm -name "next" -path "*/dist/bin/next" | head -1)
node $ADMIN_NEXT build
pm2 restart marketplace-admin 2>/dev/null || pm2 start $ADMIN_NEXT --name marketplace-admin --interpreter node --cwd $REMOTE_DIR_API/apps/admin -- start -p 3002
pm2 save

rm -rf $TMPDIR
echo '=== DONE ==='
'@

# Write script to temp file and send via SSH
$scriptFile = "$env:TEMP\deploy-remote.sh"
[System.IO.File]::WriteAllText($scriptFile, $remoteScript, [System.Text.UTF8Encoding]::new($false))

& scp -o StrictHostKeyChecking=no $scriptFile "${SERVER}:/root/deploy-remote.sh"
if ($LASTEXITCODE -ne 0) { throw "Script upload error!" }

& ssh -o StrictHostKeyChecking=no -t $SERVER "bash /root/deploy-remote.sh"
if ($LASTEXITCODE -ne 0) { throw "Deploy error!" }

# -- 4. Status --
Write-Host ""
Write-Host "[4/4] PM2 status..." -ForegroundColor Yellow

& ssh -o StrictHostKeyChecking=no $SERVER "pm2 status"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOY COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Mediator: https://posred-globox.ru" -ForegroundColor White
Write-Host "  API:      https://glo-box.ru/api" -ForegroundColor White
Write-Host "  Admin:    https://glo-box.ru/admin" -ForegroundColor White
Write-Host ""

if (Test-Path $ARCHIVE) { Remove-Item $ARCHIVE -Force }
if (Test-Path $scriptFile) { Remove-Item $scriptFile -Force }
