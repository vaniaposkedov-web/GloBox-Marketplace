# Deploy scripts

3 батника в правильном порядке. Запускай двойным кликом.

## 1. `1-railway-api.bat`
Деплоит NestJS API + Postgres на Railway.
- Проверит логин (`railway whoami`)
- Покажет текущий проект/сервис (`railway status`)
- Предложит задать `WEB_ORIGIN` (список доменов фронтов через запятую)
- Запустит `railway up` (билд занимает 3–5 мин)
- Выведет публичный домен (`railway domain`)

**Скопируй URL из последней строки** — он нужен для шага 2.

**Обязательные env-переменные в Railway (задать вручную через `railway variables` если не заданы):**
- `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- `JWT_SECRET` = случайная строка ≥32 символов (например: `openssl rand -hex 32`)
- `WEB_ORIGIN` = домены фронтов через запятую: `https://glo-box.ru,https://seller-globox.ru,https://posred-globox.ru`

## 2. `2-vercel-all.bat`
Деплоит все 4 фронтенда на Vercel.
- Спросит API URL (с прошлого шага)
- Для каждого приложения:
    - `vercel link` (первый раз — выбери scope, имя проекта. Потом автоматически)
    - Обновит `NEXT_PUBLIC_API_URL` в production
    - Запустит `vercel --prod`

Порядок: `apps/web` → `apps/seller` → `apps/admin` → `apps/mediator`.

## 3. `3-seed-prod.bat`
Заполнит прод-БД тестовыми пользователями (admin / buyer / seller / mediator). Запускай один раз после первого деплоя.

---

## Если что-то пошло не так

### «Unauthorized» на Railway
```powershell
railway logout
railway login
```

### Vercel спрашивает scope/project
Обычно появляется только при первом `vercel link`. Выбери:
- **Scope**: `gagunsitor` (или команду GloBox, если есть)
- **Link to existing project?**: `Y` если уже создан, иначе `N` и задай имя.
- **Directory**: Enter (оставить `.`)

### После изменения кода — как задеплоить заново
- API: `railway up` в корне
- Любой фронт: `cd apps/<name>` → `vercel --prod`

### Prisma миграция на проде
Dockerfile API при старте делает `prisma db push --accept-data-loss --skip-generate`. Миграций как файлов **нет** — схема пушится напрямую. Если нужно форсировать пересоздание:
```powershell
railway run --service miraculous-grace npx prisma db push --force-reset
```
⚠️ Это **удалит все данные**. После — запусти `3-seed-prod.bat`.
