#!/bin/bash
# ==============================================
# Скрипт деплоя приложения (запускать на сервере)
# После загрузки файлов: bash /root/marketplace/deploy/deploy-app.sh
# ==============================================
set -e

APP_DIR="/root/marketplace"
cd "${APP_DIR}"

echo "============================================"
echo "  Деплой приложения"
echo "============================================"

# --- 0. Git pull ---
echo "[0/6] Обновление кода из git..."
if [ -d ".git" ]; then
  git pull origin main
else
  echo "  [skip] .git не найден, пропускаем git pull"
fi

# --- 1. Установка зависимостей ---
echo "[1/6] Установка зависимостей..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# --- 2. Генерация Prisma ---
echo "[2/6] Генерация Prisma Client..."
cd apps/api
npx prisma generate
npx prisma db push --skip-generate --accept-data-loss
cd "${APP_DIR}"

# --- 3. Сборка shared ---
echo "[3/6] Сборка shared пакета..."
pnpm run build:shared

# --- 4. Сборка API ---
echo "[4/6] Сборка API..."
cd apps/api
npx nest build
cd "${APP_DIR}"

# --- 5. Сборка Web ---
echo "[5/6] Сборка Web..."
cd apps/web
npx next build
cd "${APP_DIR}"

# --- 6. PM2 ---
echo "[6/6] Запуск через PM2..."
cp deploy/ecosystem.config.cjs .
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "============================================"
echo "  ГОТОВО! Приложение запущено."
echo "============================================"
echo ""
echo "  pm2 status     — статус процессов"
echo "  pm2 logs        — логи"
echo "  pm2 restart all — перезапуск"
echo ""
echo "  Сайт: http://glo-box.ru"
echo "  API:  http://glo-box.ru/api"
echo "  Docs: http://glo-box.ru/docs"
echo "============================================"
