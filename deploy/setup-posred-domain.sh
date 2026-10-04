#!/bin/bash
# ==============================================
# Настройка домена posred-globox.ru для посредника
# Запускать на сервере: bash /root/marketplace_posrednik/deploy/setup-posred-domain.sh
# ==============================================
set -e

DOMAIN="posred-globox.ru"
PORT=3003
MEDIATOR_DIR="/root/marketplace_posrednik"

echo "============================================"
echo "  Настройка домена ${DOMAIN}"
echo "============================================"

# --- 1. Nginx конфиг для нового домена ---
echo "[1/6] Создаём Nginx конфиг для ${DOMAIN}..."

cat > /etc/nginx/sites-available/${DOMAIN} << 'NGINX_EOF'
server {
    server_name posred-globox.ru www.posred-globox.ru;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
NGINX_EOF

# Включаем сайт
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}

echo "  Nginx конфиг создан."

# --- 2. Обновляем glo-box.ru — редирект /posrednik → posred-globox.ru ---
echo "[2/6] Добавляем редирект /posrednik → https://${DOMAIN}..."

GLOBOX_CONF="/etc/nginx/sites-available/glo-box.ru"
if grep -q "location /posrednik" "$GLOBOX_CONF"; then
    # Заменяем блок proxy_pass на redirect
    # Сначала удаляем старый блок /posrednik целиком и вставляем редирект
    python3 - "$GLOBOX_CONF" << 'PYEOF'
import sys, re

conf_path = sys.argv[1]
with open(conf_path, 'r') as f:
    content = f.read()

# Remove the old /posrednik location block
pattern = r'\n\s*location /posrednik \{[^}]*\}\n'
replacement = '''
    # Редирект /posrednik → posred-globox.ru
    location /posrednik {
        return 301 https://posred-globox.ru$request_uri;
    }
'''
content = re.sub(pattern, replacement, content)

with open(conf_path, 'w') as f:
    f.write(content)
print("  Блок /posrednik заменён на редирект.")
PYEOF
else
    echo "  Блок /posrednik не найден в ${GLOBOX_CONF}, пропускаем."
fi

# --- 3. Проверяем и перезагружаем Nginx ---
echo "[3/6] Проверяем Nginx конфиг..."
nginx -t
systemctl reload nginx
echo "  Nginx перезагружен."

# --- 4. Обновляем .env.production посредника (убираем basePath) ---
echo "[4/6] Обновляем .env.production (убираем basePath)..."

cat > ${MEDIATOR_DIR}/apps/mediator/.env.production << EOF
NEXT_PUBLIC_API_URL=https://glo-box.ru/api
EOF

echo "  basePath убран, API URL без изменений."

# --- 5. Пересобираем mediator ---
echo "[5/6] Пересборка mediator (без basePath)..."
cd ${MEDIATOR_DIR}/apps/mediator
npx next build

# Перезапуск PM2
pm2 restart marketplace-mediator
pm2 save

echo "  Mediator пересобран и перезапущен."

# --- 6. Обновляем CORS в API ---
echo "[6/6] Обновляем CORS в API..."

API_MAIN="/root/marketplace/apps/api/src/main.ts"
if [ -f "$API_MAIN" ]; then
    if ! grep -q "posred-globox.ru" "$API_MAIN"; then
        sed -i 's|"http://localhost:3003",|"http://localhost:3003",\n    "https://posred-globox.ru",\n    "https://www.posred-globox.ru",|' "$API_MAIN"
        echo "  CORS обновлён. Пересборка API..."
        cd /root/marketplace/apps/api
        npx nest build
        pm2 restart marketplace-api
        pm2 save
        echo "  API пересобран и перезапущен."
    else
        echo "  posred-globox.ru уже в CORS списке."
    fi
else
    echo "  WARN: Файл main.ts не найден по пути ${API_MAIN}"
fi

echo ""
echo "============================================"
echo "  ГОТОВО! HTTP настроен."
echo "============================================"
echo ""
echo "  Проверьте: http://${DOMAIN}"
echo ""
echo "  Для SSL выполните:"
echo "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""
echo "============================================"
