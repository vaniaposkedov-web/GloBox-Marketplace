# Деплой на Timeweb VPS + домен glo-box.ru

Сервер: **5.42.127.159** (Timeweb VPS)
Домен: **glo-box.ru** (Timeweb)

---

## Шаг 0. Подключение домена в Timeweb

1. Откройте **https://timeweb.cloud** → войдите в панель
2. Перейдите в **Домены** → найдите `glo-box.ru`
3. Откройте **DNS-записи** и настройте:

| Тип | Имя | Значение |
|-----|-----|----------|
| **A** | `@` | `5.42.127.159` |
| **A** | `www` | `5.42.127.159` |

4. Сохраните. DNS обновится за **5-30 минут** (иногда до 24ч).

Проверить: `nslookup glo-box.ru` — должен показать `5.42.127.159`

---

## Шаг 1. Подключиться к серверу

Откройте **Windows Terminal** (или cmd) и введите:

```bash
ssh root@5.42.127.159
```


---

## Шаг 2. Настроить сервер (один раз)

На сервере выполните:

```bash
# Скачать скрипт настройки из проекта (или скопировать вручную)
apt-get update && apt-get install -y git

# Клонировать проект
git clone <URL_вашего_репо> /root/marketplace
# Или загрузить через scp (см. Шаг 2б)

# Запустить скрипт настройки
cd /root/marketplace
bash deploy/setup-server.sh
```

**Скрипт автоматически установит:**
- Node.js 20
- pnpm 9
- PM2 (менеджер процессов)
- PostgreSQL (база данных)
- Nginx (прокси-сервер)
- Certbot (SSL-сертификат)

Скрипт выдаст `DATABASE_URL` — сохраните его.

---

## Шаг 2б. Загрузка через scp (без git)

Если репозитория нет — загрузите файлы с локальной машины.

В **новом** терминале на вашем компьютере:

```bash
scp -r d:\project_work_frilans\marketplizzzz root@5.42.127.159:/root/marketplace
```

---

## Шаг 3. Настроить .env на сервере

На сервере:

```bash
nano /root/marketplace/apps/api/.env
```

Обязательно измените:

```env
NODE_ENV=production
API_PORT=4000
API_HOST=127.0.0.1
WEB_ORIGIN=https://glo-box.ru

# Вставьте DATABASE_URL из вывода setup-server.sh
DATABASE_URL=postgresql://marketplace:ПАРОЛЬ_ИЗ_СКРИПТА@localhost:5432/marketplace?schema=public

JWT_SECRET=СГЕНЕРИРУЙТЕ_СЛУЧАЙНУЮ_СТРОКУ_32_СИМВОЛА
JWT_ACCESS_TTL=30d

SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=ваш_email@yandex.ru
SMTP_PASS=пароль_приложения
SMTP_FROM="Marketplace <ваш_email@yandex.ru>"

SMS_PROVIDER=stub
SMS_API_KEY=
SMS_TEST_MODE=false

DEV_EXPOSE_CODES=false
CAPTCHA_PROVIDER=disabled
```

Также настройте `.env.local` для фронтенда:

```bash
nano /root/marketplace/apps/web/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://glo-box.ru
```

---

## Шаг 4. Собрать и запустить

```bash
cd /root/marketplace
bash deploy/deploy-app.sh
```

Скрипт:
1. Установит зависимости (`pnpm install`)
2. Сгенерирует Prisma Client и применит схему
3. Соберёт shared, API и Web
4. Запустит через PM2

---

## Шаг 5. SSL-сертификат (после привязки домена)

Когда DNS заработает (проверьте `nslookup glo-box.ru`):

```bash
certbot --nginx -d glo-box.ru -d www.glo-box.ru --non-interactive --agree-tos -m ваш@email.ru
```

Certbot автоматически:
- Получит бесплатный SSL-сертификат (Let's Encrypt)
- Настроит Nginx на HTTPS
- Добавит автопродление

---

## Шаг 6. Проверка

После всех шагов:

| Что проверить | URL |
|---------------|-----|
| Главная | https://glo-box.ru |
| Регистрация | https://glo-box.ru/register |
| API health | https://glo-box.ru/api/health |
| Swagger docs | https://glo-box.ru/docs |

---

## Полезные команды (на сервере)

```bash
# Статус приложения
pm2 status

# Логи
pm2 logs
pm2 logs marketplace-api
pm2 logs marketplace-web

# Перезапуск
pm2 restart all

# Обновить код и передеплоить
cd /root/marketplace
git pull
bash deploy/deploy-app.sh

# Статус Nginx
systemctl status nginx
nginx -t

# Статус PostgreSQL
systemctl status postgresql

# Продлить SSL (обычно автоматически)
certbot renew
```

---

## Архитектура на сервере

```
Интернет
    │
    ▼
Nginx (:80/:443)  ← SSL (Let's Encrypt)
    │
    ├── /        → Next.js (:3000) — фронтенд
    ├── /api/    → NestJS  (:4000) — бэкенд
    └── /docs    → Swagger (:4000)
    
PM2 управляет обоими процессами
PostgreSQL — локальная база данных
```
