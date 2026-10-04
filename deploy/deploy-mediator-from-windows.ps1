# =================================================================
#  Деплой ПОСРЕДНИКА на сервер 5.42.127.159
#  Команда: powershell -ExecutionPolicy Bypass -File .\deploy\deploy-mediator-from-windows.ps1
# =================================================================

$ErrorActionPreference = "Stop"

$SERVER     = "root@5.42.127.159"
$REMOTE_DIR = "/root/marketplace_posrednik"
$PROJECT    = "d:\project_work_frilans\marketplizzzz"
$ARCHIVE    = "$env:TEMP\mediator-deploy.tar.gz"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Деплой Посредника -> $SERVER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Создаём архив ──────────────────────────────────────────────

Write-Host "[1/4] Создаём архив..." -ForegroundColor Yellow

if (Test-Path $ARCHIVE) { Remove-Item $ARCHIVE -Force }

& tar `
  --exclude="marketplizzzz/.git" `
  --exclude="marketplizzzz/node_modules" `
  --exclude="marketplizzzz/.pnpm-store" `
  --exclude="marketplizzzz/apps/web" `
  --exclude="marketplizzzz/apps/admin" `
  --exclude="marketplizzzz/apps/seller" `
  --exclude="marketplizzzz/apps/api" `
  --exclude="marketplizzzz/apps/mediator/.next" `
  -czf $ARCHIVE `
  -C "d:\project_work_frilans" `
  "marketplizzzz"

if ($LASTEXITCODE -ne 0) { throw "Ошибка создания архива!" }

$sizeMb = [math]::Round((Get-Item $ARCHIVE).Length / 1MB, 1)
Write-Host "  Архив создан: $ARCHIVE ($sizeMb МБ)" -ForegroundColor Green

# ── 2. Загружаем архив на сервер ─────────────────────────────────

Write-Host ""
Write-Host "[2/4] Загружаем на сервер..." -ForegroundColor Yellow

& scp -o StrictHostKeyChecking=no $ARCHIVE "${SERVER}:/root/mediator-deploy.tar.gz"

if ($LASTEXITCODE -ne 0) { throw "Ошибка загрузки на сервер!" }
Write-Host "  Загружено успешно." -ForegroundColor Green

# ── 3. Распаковываем и деплоим ────────────────────────────────────

Write-Host ""
Write-Host "[3/4] Распаковываем и запускаем деплой..." -ForegroundColor Yellow

$remoteCommands = @"
set -e
echo '--- Распаковка архива ---'
mkdir -p $REMOTE_DIR
cd /root

tar -xzf /root/mediator-deploy.tar.gz \
    --strip-components=1 \
    -C $REMOTE_DIR

rm -f /root/mediator-deploy.tar.gz

echo '--- Запуск деплой-скрипта ---'
cd $REMOTE_DIR
bash deploy/deploy-mediator.sh
"@

& ssh -o StrictHostKeyChecking=no -t $SERVER $remoteCommands

if ($LASTEXITCODE -ne 0) { throw "Ошибка деплоя на сервере!" }

# ── 4. Проверка статуса ──────────────────────────────────────────

Write-Host ""
Write-Host "[4/4] Проверяем статус PM2..." -ForegroundColor Yellow

& ssh -o StrictHostKeyChecking=no $SERVER "pm2 status"

# ── Итог ─────────────────────────────────────────────────────────

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ДЕПЛОЙ ПОСРЕДНИКА ЗАВЕРШЁН!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Сайт:  https://glo-box.ru/posrednik"  -ForegroundColor White
Write-Host ""
Write-Host "  Логи:  ssh root@5.42.127.159 'pm2 logs marketplace-mediator'" -ForegroundColor Gray
Write-Host ""

# Удаляем локальный архив
if (Test-Path $ARCHIVE) { Remove-Item $ARCHIVE -Force }
