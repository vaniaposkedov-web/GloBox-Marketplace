#!/bin/bash
# ==============================================
# Деплой посредника (запускать на сервере)
# bash /root/marketplace_posrednik/deploy/deploy-mediator.sh
# ==============================================
set -e

APP_DIR="/root/marketplace_posrednik"
PORT=3003

cd "${APP_DIR}"

echo "============================================"
echo "  Деплой посредника (mediator)"
echo "============================================"

# --- 1. Установка зависимостей ---
echo "[1/4] Установка зависимостей..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# --- 2. Создаём .env.production ---
echo "[2/4] Настройка переменных окружения..."
cat > apps/mediator/.env.production << EOF
NEXT_PUBLIC_API_URL=https://glo-box.ru/api
NEXT_PUBLIC_BASE_PATH=
EOF

# --- 3. Сборка ---
echo "[3/4] Сборка mediator..."
cd apps/mediator
npx next build
cd "${APP_DIR}"

# --- 4. PM2 ---
echo "[4/4] Запуск через PM2..."

# Остановить предыдущий процесс если есть
pm2 stop marketplace-mediator 2>/dev/null || true
pm2 delete marketplace-mediator 2>/dev/null || true

cd apps/mediator
pm2 start node_modules/next/dist/bin/next \
  --name marketplace-mediator \
  -- start -p ${PORT}
cd "${APP_DIR}"

pm2 save

# --- 5. Nginx ---
echo ""
echo "--- Настройка Nginx ---"

# Проверяем, есть ли уже блок для /posrednik в nginx
NGINX_CONF="/etc/nginx/sites-available/glo-box.ru"
if [ -f "$NGINX_CONF" ] && ! grep -q "location /posrednik" "$NGINX_CONF"; then
  # Добавляем location блок перед последним }
  sed -i '/^}$/i \
    # Mediator (Posrednik)\
    location /posrednik {\
        proxy_pass http://127.0.0.1:'"${PORT}"';\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection '\''upgrade'\'';\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_cache_bypass $http_upgrade;\
    }\
    location /posrednik/_next/ {\
        proxy_pass http://127.0.0.1:'"${PORT}"';\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_cache_bypass $http_upgrade;\
    }' "$NGINX_CONF"

  nginx -t && systemctl reload nginx
  echo "  Nginx обновлён: /posrednik -> localhost:${PORT}"
else
  echo "  Nginx: блок /posrednik уже существует или конфиг не найден"
fi

echo ""
echo "============================================"
echo "  ГОТОВО! Посредник запущен."
echo "============================================"
echo ""
echo "  pm2 status              — статус"
echo "  pm2 logs marketplace-mediator — логи"
echo ""
echo "  Сайт: https://glo-box.ru/posrednik"
echo "============================================"
