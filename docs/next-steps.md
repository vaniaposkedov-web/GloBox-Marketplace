# Следующие шаги

Что уже сделано в этом коммите:

- Монорепо: `pnpm workspaces` с `apps/web`, `apps/api`, `packages/shared`
- **Backend (NestJS + Fastify + Prisma)** — модули Auth, Mail, Prisma, Health
- **Frontend (Next.js 15 + React 19 + FSD + Tailwind)** — 3-шаговая форма регистрации, страница входа
- **Shared (Zod)** — whitelist email-доменов, анти-фрод телефона, валидация пароля
- **Реализован блок 1.2** — регистрация по email полностью:
  - шаг 1: ввод email → код на SMTP
  - шаг 2: ввод 6-значного кода (15 мин, 3 попытки)
  - шаг 3: пароль + ФИО + телефон → создание пользователя → JWT
- **Реализована валидация 1.4.1 + 1.4.2** (коды стран + анти-фрод), на фронте и бэке
- Docker Compose: Postgres 17 + Redis + MailHog для локального dev
- Конфиги для Vercel и Railway
- Git инициализирован, первый коммит сделан

---

## Что в очереди (по ТЗ, Block 1)

- [ ] **1.3** — VK OAuth (редирект, callback, создание/линковка пользователя)
- [ ] **1.4.3** — SMS-подтверждение при чувствительных действиях (интеграция провайдера + rate-limit в Redis)
- [ ] **1.5.1** — CAPTCHA (reCAPTCHA v3 / Yandex SmartCaptcha) на формах
- [ ] **1.5.2** — восстановление пароля (код на email → новый пароль)
- [ ] **1.5.3** — refresh-токены, «Выйти со всех устройств»
- [ ] Админка: управление whitelist доменов из БД без релиза (1.2.1)

---

## Рекомендации по совместной работе

### Роли

- **Ты (владелец репо)** — деплой на Vercel/Railway, env vars, GitHub-настройки
- **Напарник** — клонирует репо, работает локально с `.env.local`

### Git flow

```
main                       ← всегда зелёная, автодеплой на prod
├── feat/vk-oauth          ← твоя фича
├── feat/sms-verification  ← фича напарника
└── fix/phone-validation   ← любые фиксы
```

Мержим через PR в `main`. Vercel делает **preview deploy** на каждый PR — удобно для ревью UI.

### Cascade (Windsurf)

- Оба открываете проект в Windsurf (`C:\Users\user\CascadeProjects\marketplace`)
- Каждый у себя использует Cascade — правки идут в ветках, мержите через PR
- Или: один работает через Cascade, коммитит, второй делает `git pull`

### Локальный dev (когда поставишь Docker)

```powershell
pnpm install
pnpm db:up                   # поднимает Postgres + Redis + MailHog
pnpm --filter @marketplace/shared build
pnpm db:migrate              # прогнать миграции
pnpm dev                     # параллельно запускает frontend + backend
```

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:4000>
- Swagger: <http://localhost:4000/docs>
- MailHog (посмотреть письма с кодами): <http://localhost:8025>

### Если Docker ставить не хочешь

Можешь подключиться к удалённой БД:

1. Зарегистрируй бесплатный Postgres на [Neon](https://neon.tech) или [Supabase](https://supabase.com)
2. В `apps/api/.env` пропиши полученный `DATABASE_URL`
3. `pnpm db:migrate` — миграции применятся к удалённой БД
4. Для Redis: [Upstash](https://upstash.com) тоже бесплатно
5. Для почты на dev: [Ethereal](https://ethereal.email) (временные inbox'ы)

---

## Известные TODO в коде

- `apps/api/src/modules/auth/auth.module.ts` — импорт `MailService` напрямую, позже вынести в `MailModule` как импорт
- `apps/api/src/main.ts` — `fastifyCookie` регистрируется с приведением типов (конфликт версий @fastify/cookie и Fastify в NestJS 10) — при апгрейде на Nest 11 поправить
- Rate-limit в контроллере через `@Throttle` — переехать на Redis-storage, чтобы лимиты работали между инстансами
