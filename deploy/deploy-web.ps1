# =================================================================
#  Деплой ТОЛЬКО Web (apps/web) на сервер 5.42.127.159
#  Команда: powershell -ExecutionPolicy Bypass -File .\deploy\deploy-web.ps1
# =================================================================

$ErrorActionPreference = "Stop"

$SERVER     = "root@5.42.127.159"
$REMOTE_DIR = "/root/marketplace"
$PROJECT    = "d:\project_work_frilans\marketplizzzz"
$ARCHIVE    = "$env:TEMP\marketplace-web-deploy.tar.gz"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy Web -> $SERVER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Архив только web-приложения ────────────────────────────────
Write-Host "[1/4] Creating archive apps/web..." -ForegroundColor Yellow

if (Test-Path $ARCHIVE) { Remove-Item $ARCHIVE -Force }

& tar `
  --exclude="web/.next" `
  --exclude="web/node_modules" `
  -czf $ARCHIVE `
  -C "$PROJECT\apps" `
  "web"

if ($LASTEXITCODE -ne 0) { throw "Archive error!" }

$sizeMb = [math]::Round((Get-Item $ARCHIVE).Length / 1MB, 1)
Write-Host "  Archive created: $sizeMb MB" -ForegroundColor Green

# ── 2. Загружаем на сервер ────────────────────────────────────────
Write-Host ""
Write-Host "[2/4] Uploading to server..." -ForegroundColor Yellow

& scp -o StrictHostKeyChecking=no $ARCHIVE "${SERVER}:/root/web-deploy.tar.gz"

if ($LASTEXITCODE -ne 0) { throw "Upload error!" }
Write-Host "  Uploaded." -ForegroundColor Green

# ── 3. Распаковка + сборка + рестарт ─────────────────────────────
Write-Host ""
Write-Host "[3/4] Build and restart on server..." -ForegroundColor Yellow

$remoteCommands = @"
set -e
echo '--- Распаковка web ---'
cd $REMOTE_DIR
tar -xzf /root/web-deploy.tar.gz -C apps/
rm -f /root/web-deploy.tar.gz

echo '--- Сборка web ---'
cd apps/web
npx next build

echo '--- Рестарт PM2 ---'
pm2 restart marketplace-web
"@

& ssh -o StrictHostKeyChecking=no -t $SERVER $remoteCommands

if ($LASTEXITCODE -ne 0) { throw "Deploy error!" }

# ── 4. Проверка ──────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] PM2 status..." -ForegroundColor Yellow
& ssh -o StrictHostKeyChecking=no $SERVER "pm2 status"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  WEB DEPLOY DONE!" -ForegroundColor Green
Write-Host "  https://glo-box.ru" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green

if (Test-Path $ARCHIVE) { Remove-Item $ARCHIVE -Force }
