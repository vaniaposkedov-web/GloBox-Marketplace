#!/bin/bash
# ==============================================
# Скрипт настройки сервера Timeweb для Marketplace
# Запускать: bash /root/setup-server.sh
# ==============================================
set -e

DOMAIN="glo-box.ru"
APP_DIR="/root/marketplace"
DB_PASS="mkt_$(openssl rand -hex 12)"

echo "============================================"
echo "  Настройка сервера для ${DOMAIN}"
echo "============================================"

# --- 1. Обновление системы ---
echo "[1/8] Обновление системы..."
apt-get update -qq
apt-get upgrade -y -qq

# --- 2. Node.js 20 ---
echo "[2/8] Установка Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "  Node.js: $(node -v)"

# --- 3. pnpm ---
echo "[3/8] Установка pnpm..."
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm@9
fi
echo "  pnpm: $(pnpm -v)"

# --- 4. PM2 ---
echo "[4/8] Установка PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# --- 5. PostgreSQL ---
echo "[5/8] Установка PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
fi

# Создаём БД и пользователя
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='marketplace'" | grep -q 1 || {
    sudo -u postgres psql -c "CREATE USER marketplace WITH PASSWORD '${DB_PASS}';"
    echo "  Создан пользователь marketplace"
}
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='marketplace'" | grep -q 1 || {
    sudo -u postgres psql -c "CREATE DATABASE marketplace OWNER marketplace;"
    echo "  Создана база marketplace"
}

# --- 6. Nginx ---
echo "[6/8] Установка Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl enable nginx
fi

# Nginx config
cat > /etc/nginx/sites-available/${DOMAIN} << 'NGINX_EOF'
server {
    listen 80;
    server_name glo-box.ru www.glo-box.ru;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # API (NestJS)
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Swagger docs
    location /docs {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "  Nginx настроен для ${DOMAIN}"

# --- 7. Certbot (SSL) ---
echo "[7/8] Установка Certbot..."
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
fi
echo "  SSL будет настроен после привязки домена (шаг в инструкции)"

# --- 8. Firewall ---
echo "[8/8] Настройка файрвола..."
ufw allow 22/tcp 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true

# --- Создаём каталог приложения ---
mkdir -p ${APP_DIR}

# --- Сохраняем пароль БД ---
echo "DB_PASS=${DB_PASS}" > /root/.marketplace_db_pass
chmod 600 /root/.marketplace_db_pass

echo ""
echo "============================================"
echo "  ГОТОВО! Сервер настроен."
echo "============================================"
echo ""
echo "  Пароль БД: ${DB_PASS}"
echo "  Сохранён в: /root/.marketplace_db_pass"
echo ""
echo "  DATABASE_URL=postgresql://marketplace:${DB_PASS}@localhost:5432/marketplace?schema=public"
echo ""
echo "  Следующий шаг: загрузите проект на сервер"
echo "============================================"
