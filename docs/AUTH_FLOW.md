# Авторизация и Регистрация — Полный путь кода

> Документ для разработчика. Описывает все потоки регистрации/авторизации: какие файлы задействованы, какие эндпоинты вызываются, как проходит проверка кодов.

---

## Оглавление

1. [Архитектура](#1-архитектура)
2. [Регистрация по Email (3 шага)](#2-регистрация-по-email)
3. [Регистрация по Телефону (SMS)](#3-регистрация-по-телефону)
4. [Вход по Email + Пароль](#4-вход-по-email--пароль)
5. [Вход по Email + Код + Пароль](#5-вход-по-email--код--пароль)
6. [Вход по Телефону + SMS + Пароль](#6-вход-по-телефону--sms--пароль)
7. [Восстановление пароля (3 шага)](#7-восстановление-пароля)
8. [VK OAuth](#8-vk-oauth)
9. [MAX Bot (max.ru)](#9-max-bot)
10. [JWT и Защита эндпоинтов](#10-jwt-и-защита-эндпоинтов)
11. [Карта файлов](#11-карта-файлов)
12. [Переменные окружения](#12-переменные-окружения)
13. [Prisma-модели](#13-prisma-модели)

---

## 1. Архитектура

```
Frontend (Next.js)              API (NestJS)                       БД (PostgreSQL)
─────────────────              ─────────────                       ───────────────
features/auth-methods/api.ts → AuthController → AuthService      → Prisma (User, EmailCode, SmsCode)
features/register-email/api.ts                  EmailCodeService  → EmailCode (argon2 hash кода)
features/password-reset/api.ts                  SmsCodeService    → SmsCode  (argon2 hash кода)
                                                VkOAuthService    → VK ID API
                                                MaxAuthService    → MAX Platform API
                                                TokensService     → JWT (JwtService)
                                                MailService       → SMTP
                                                SmsSenderService  → SMSC.ru
```

**Все ответы с токеном**: `{ accessToken: string; userId: string }`  
**JWT payload**: `{ sub: userId, role: UserRole }`, TTL = `JWT_ACCESS_TTL` (по умолчанию 30d).

---

## 2. Регистрация по Email

**3-шаговый поток с подтверждением кодом на email.**

### Шаг 1 — Запросить код

```
POST /api/auth/register/email
Body: { email: string, captchaToken?: string }
Response: { ok: true, devCode?: string }  // devCode только при DEV_EXPOSE_CODES=true
```

**Фронтенд**: `features/register-email/api.ts` → `requestEmailCode()`  
**Бэкенд**: `AuthController.requestEmailCode()` → `AuthService.requestEmailRegistrationCode()`

Путь кода:
1. Zod-валидация `registerEmailRequestSchema` (email whitelist + формат)
2. `AuthService`: проверка уникальности email → `ConflictException` если занят
3. `EmailCodeService.issue(email, "REGISTRATION")`:
   - Генерация 6-значного кода (`crypto.randomInt`)
   - Хеширование кода через `argon2id`
   - Инвалидация старых кодов для этого email+purpose
   - Сохранение в таблицу `email_codes` с TTL 15 мин
4. `MailService.sendRegistrationCode(email, code)` — отправка письма через SMTP
5. Возврат `{ ok: true }`

### Шаг 2 — Проверить код (без расхода)

```
POST /api/auth/register/verify
Body: { email: string, code: string }
Response: { ok: true } | BadRequestException
```

**Фронтенд**: `features/register-email/api.ts` → `verifyEmailCode()`  
**Бэкенд**: `AuthController.verifyEmailCode()` → `AuthService.verifyEmailRegistrationCode()`

Путь кода:
1. Zod-валидация `verifyEmailCodeSchema` (email + 6-значный код)
2. `EmailCodeService.check(email, "REGISTRATION", code, { consume: false })`:
   - Найти последний неиспользованный код для email+purpose
   - Проверить TTL (15 мин)
   - Проверить число попыток (макс. 3)
   - `argon2.verify(codeHash, code)` — если не совпал → инкремент попыток
   - **НЕ расходует** код (consume: false) — код остаётся для шага 3
3. Если неверный → `BadRequestException` с `attemptsLeft`

### Шаг 3 — Завершить регистрацию

```
POST /api/auth/register/complete
Body: { email, code, password, phone, firstName, lastName }
Response: { accessToken: string, userId: string }
```

**Фронтенд**: `features/register-email/api.ts` → `completeRegistration()`  
**Бэкенд**: `AuthController.completeRegistration()` → `AuthService.completeEmailRegistration()`

Путь кода:
1. Zod-валидация `completeEmailRegistrationSchema` (все поля + whitelist + пароль мин. 8 символов)
2. `EmailCodeService.check(email, "REGISTRATION", code, { consume: true })` — **расходует** код
3. Проверка уникальности email и phone → `ConflictException`
4. `argon2.hash(password)` — хеш пароля
5. `prisma.user.create()` с role=BUYER, emailVerified=true, phoneVerified=false
6. `TokensService.signAccessToken(userId, role)` — генерация JWT
7. Возврат `{ accessToken, userId }`

---

## 3. Регистрация по Телефону

**2-шаговый поток с SMS-кодом.**

### Шаг 1 — Запросить SMS-код

```
POST /api/auth/register/phone/request-code
Body: { phone: string }  // в любом формате, нормализуется в E.164
Response: { ok: true, maskedPhone: string, devCode?: string }
```

**Фронтенд**: `features/auth-methods/api.ts` → `requestPhoneCode()`  
**Бэкенд**: `AuthController.registerPhoneRequestCode()` → `AuthService.requestPhoneRegistrationCode()`

Путь кода:
1. Zod `phoneSchema` трансформирует телефон в E.164 (напр. `+79261234567`)
2. Проверка уникальности phone → `ConflictException`
3. `SmsCodeService.issue(phone, "PHONE_VERIFICATION")`:
   - Генерация 6-значного кода
   - Хеширование через argon2id
   - Инвалидация предыдущих кодов
   - Сохранение в `sms_codes` с TTL 5 мин
   - `SmsSenderService.send(phone, message)` → HTTP к SMSC.ru API

### Шаг 2 — Завершить регистрацию

```
POST /api/auth/register/phone/complete
Body: { phone, code, password, firstName?, lastName? }
Response: { accessToken: string, userId: string }
```

**Фронтенд**: `features/auth-methods/api.ts` → `registerWithPhone()`  
**Бэкенд**: `AuthController.registerWithPhone()` → `AuthService.registerWithPhone()`

Путь кода:
1. `SmsCodeService.check(phone, "PHONE_VERIFICATION", code, { consume: true })`
2. Проверка уникальности phone
3. `argon2.hash(password)`
4. `prisma.user.create()` с phoneVerified=true, role=BUYER, roles=["BUYER"]
5. JWT → `{ accessToken, userId }`

---

## 4. Вход по Email + Пароль

**Самый простой поток — без кода.**

```
POST /api/auth/login/email
Body: { email, password, captchaToken? }
Response: { accessToken, userId }
```

**Фронтенд**: через форму входа  
**Бэкенд**: `AuthController.loginEmail()` → `AuthService.loginWithEmail()`

Путь кода:
1. Zod `loginWithEmailSchema`
2. `prisma.user.findUnique({ where: { email } })`
3. Если нет user или нет passwordHash → `UnauthorizedException("Неверный email или пароль")`
4. `argon2.verify(passwordHash, password)` → если не совпал → то же исключение
5. `prisma.user.update({ lastLoginAt: now })`
6. JWT → `{ accessToken, userId }`

> **Важно**: одно и то же сообщение об ошибке при несуществующем email и неверном пароле (защита от перебора).

---

## 5. Вход по Email + Код + Пароль

**Двухфакторный вход: сначала код на email, потом проверка пароля.**

### Шаг 1 — Запросить код

```
POST /api/auth/login/email/request-code
Body: { email }
Response: { ok: true, devCode?: string }
```

**Фронтенд**: `features/auth-methods/api.ts` → `requestLoginEmailCode()`  
**Бэкенд**: `AuthService.requestLoginEmailCode()`

- Если email не существует — имитация задержки (80ms), ответ `{ ok: true }` (не раскрываем)
- Если существует → `EmailCodeService.issue(email, "LOGIN_VERIFICATION")` + отправка письма

### Шаг 2 — Вход

```
POST /api/auth/login/email/verify
Body: { email, code, password }
Response: { accessToken, userId }
```

**Фронтенд**: `features/auth-methods/api.ts` → `loginWithEmailCode()`  
**Бэкенд**: `AuthService.loginWithEmailCode()`

Путь:
1. `EmailCodeService.check(email, "LOGIN_VERIFICATION", code, { consume: true })`
2. `prisma.user.findUnique({ email })`
3. `argon2.verify(passwordHash, password)`
4. JWT → `{ accessToken, userId }`

---

## 6. Вход по Телефону + SMS + Пароль

### Шаг 1 — Запросить SMS-код

```
POST /api/auth/login/phone/request-code
Body: { phone }
Response: { ok: true, maskedPhone, devCode? }
```

**Фронтенд**: `features/auth-methods/api.ts` → `requestLoginPhoneCode()`  
**Бэкенд**: `AuthService.requestLoginPhoneCode()`

- Если phone не существует — имитация задержки, ответ `{ ok: true, maskedPhone }`
- Если существует → `SmsCodeService.issue(phone, "LOGIN_VERIFICATION", userId)` + SMS

### Шаг 2 — Вход

```
POST /api/auth/login/phone/verify
Body: { phone, code, password }
Response: { accessToken, userId }
```

**Фронтенд**: `features/auth-methods/api.ts` → `loginWithPhoneCode()`  
**Бэкенд**: `AuthService.loginWithPhoneCode()`

Путь:
1. `SmsCodeService.check(phone, "LOGIN_VERIFICATION", code, { consume: true })`
2. `prisma.user.findUnique({ phone })`
3. `argon2.verify(passwordHash, password)`
4. JWT → `{ accessToken, userId }`

---

## 7. Восстановление пароля

**3-шаговый поток через email-код.**

### Шаг 1 — Запросить код сброса

```
POST /api/auth/password-reset/request
Body: { email, captchaToken? }
Response: { ok: true, devCode? }
```

**Фронтенд**: `features/password-reset/api.ts` → `requestPasswordReset()`  
**Бэкенд**: `AuthService.requestPasswordReset()`

- Если email не найден — имитация задержки (защита от timing attack), ответ `{ ok: true }`
- Если найден → `EmailCodeService.issue(email, "PASSWORD_RESET")` + письмо

### Шаг 2 — Проверить код (без расхода)

```
POST /api/auth/password-reset/verify
Body: { email, code }
Response: { ok: true }
```

**Фронтенд**: `features/password-reset/api.ts` → `verifyPasswordReset()`  
**Бэкенд**: `AuthService.verifyPasswordResetCode()` → `EmailCodeService.check(..., { consume: false })`

### Шаг 3 — Установить новый пароль

```
POST /api/auth/password-reset/complete
Body: { email, code, newPassword }
Response: { accessToken, userId }
```

**Фронтенд**: `features/password-reset/api.ts` → `completePasswordReset()`  
**Бэкенд**: `AuthService.completePasswordReset()`

Путь:
1. `EmailCodeService.check(email, "PASSWORD_RESET", code, { consume: true })`
2. `prisma.user.findUnique({ email })`
3. `argon2.hash(newPassword)` → `prisma.user.update({ passwordHash, lastLoginAt })`
4. JWT → `{ accessToken, userId }` (пользователь сразу залогинен)

---

## 8. VK OAuth

**OAuth 2.0 + PKCE через VK ID.**

### Шаг 1 — Получить URL авторизации

```
GET /api/auth/vk/auth-url
Response: { url: "https://id.vk.com/authorize?..." }
```

**Фронтенд**: `features/auth-methods/api.ts` → `getVkAuthUrl()`  
**Бэкенд**: `AuthController.getVkAuthUrl()` → `VkOAuthService.getAuthUrl(state)`

Путь:
1. Генерация `code_verifier` (PKCE) — `crypto.randomBytes(32).toString("base64url")`
2. Генерация `code_challenge` — `SHA256(code_verifier).toString("base64url")`
3. Сохранение `state → code_verifier` в in-memory Map (TTL 10 мин)
4. Формирование URL: `https://id.vk.com/authorize?response_type=code&client_id=...&redirect_uri=...&state=...&code_challenge=...&code_challenge_method=S256&scope=vkid.personal_info email`

### Шаг 2 — Обмен code на JWT

```
POST /api/auth/vk/callback
Body: { code, state?, device_id? }
Response: { accessToken, userId }
```

**Фронтенд**: `app/auth/vk/callback/page.tsx` → `vkExchangeCode(code, state, deviceId)`  
**Бэкенд**: `AuthController.vkCallback()` → `VkOAuthService.handleCallback(code, state, deviceId)`

Путь:
1. Извлечь `code_verifier` из PKCE store по `state`
2. `POST https://id.vk.com/oauth2/auth` — обмен code → access_token
   - Параметры: `grant_type=authorization_code, code, client_id, redirect_uri, code_verifier, device_id`
3. `POST https://id.vk.com/oauth2/user_info` — получение профиля (first_name, last_name, avatar, email, phone)
4. Поиск user по `vkId`:
   - **Найден** → обновить `lastLoginAt`
   - **Не найден, но есть email** → поиск по email → привязка `vkId`
   - **Не найден совсем** → `prisma.user.create()` с role=BUYER, emailVerified=true
5. JWT → `{ accessToken, userId }`

---

## 9. MAX Bot (max.ru)

**Авторизация через мессенджер MAX с кнопкой «Поделиться контактом».**

### Архитектура потока

```
Фронтенд                     API (NestJS)                 MAX Platform API
────────                     ────────────                 ────────────────
1. POST /auth/max/start  →   startSession()
   ← { sessionId, botLink }

2. Пользователь открывает botLink в MAX

3.                            ← Webhook: bot_started      (MAX → наш сервер)
                              onBotStarted():
                                - парсит sessionId из payload
                                - сохраняет userId → sessionId
                                - POST /messages →                → «Поделиться контактом»

4. Пользователь нажимает кнопку

5.                            ← Webhook: message_created   (MAX → наш сервер)
                              onMessageCreated():
                                - парсит телефон из vcf_info
                                - верифицирует hash (HMAC-SHA256)
                                - findOrCreate user
                                - генерирует JWT
                                - POST /messages →                → «✅ Авторизованы!»

6. GET /auth/max/status/:id → checkStatus()
   ← { ready: true, accessToken, userId }
```

### Эндпоинты

```
POST /api/auth/max/start        → { sessionId, botLink }
POST /api/auth/max/bot-callback → { ok: true }           // Webhook от MAX
GET  /api/auth/max/status/:id   → { ready: bool, accessToken?, userId? }
```

### Файлы

- **Бэкенд**: `apps/api/src/modules/auth/telegram-auth.service.ts` — `MaxAuthService`
- **Фронтенд**: `apps/web/src/features/auth-methods/ui/max-flow.tsx` — `MaxFlow` компонент
- **API-клиент**: `apps/web/src/features/auth-methods/api.ts` → `maxStartSession()`, `maxCheckStatus()`

### Webhook от MAX — формат данных

**bot_started** (пользователь перешёл по ссылке бота):
```json
{
  "update_type": "bot_started",
  "timestamp": 1234567890,
  "user": { "user_id": 281270489, "first_name": "Иван" },
  "payload": "auth_<sessionId>"
}
```

**message_created** (пользователь поделился контактом):
```json
{
  "update_type": "message_created",
  "message": {
    "sender": { "user_id": 281270489 },
    "body": {
      "attachments": [{
        "type": "contact",
        "payload": {
          "vcf_info": "BEGIN:VCARD\r\nTEL;TYPE=cell:79990000000\r\nFN:Иван Иванов\r\nEND:VCARD\r\n",
          "max_info": { "first_name": "Иван", "last_name": "Иванов" },
          "hash": "<HMAC-SHA256 от vcf_info ключом bot_token>"
        }
      }]
    }
  }
}
```

### Верификация hash

```typescript
const expected = createHmac("sha256", botToken)
  .update(vcfInfo.replace(/\\r\\n/g, "\r\n"))
  .digest("hex");
// Сравнение expected === hash из payload
```

### Конфигурация

```env
MAX_BOT_TOKEN=<токен из business.max.ru>
MAX_BOT_USERNAME=id052903284888_bot
```

Webhook URL: `https://glo-box.ru/api/auth/max/bot-callback`  
MAX API: `https://platform-api.max.ru`  
Авторизация в MAX API: заголовок `Authorization: <token>` (без Bearer, без access_token_ префикса).

---

## 10. JWT и Защита эндпоинтов

### Генерация токена

**Файл**: `apps/api/src/modules/auth/tokens.service.ts`

```typescript
// Payload: { sub: userId, role: UserRole }
// Подпись: HS256 с секретом JWT_SECRET
// TTL: JWT_ACCESS_TTL (по умолчанию "30d")
const token = await jwt.signAsync({ sub: userId, role });
```

### Защита эндпоинтов

**Файл**: `apps/api/src/modules/auth/jwt-auth.guard.ts`

```typescript
// Ожидает заголовок: Authorization: Bearer <token>
// Декодирует → req.user = { sub: userId, role }
// При ошибке → UnauthorizedException
```

**Использование в контроллерах**:
```typescript
@Get("me")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
async me(@CurrentUser() user: AccessTokenPayload) {
  return this.authService.getProfile(user.sub);
}
```

**Декоратор** `@CurrentUser()`: `apps/api/src/modules/auth/current-user.decorator.ts` — извлекает `req.user`.

### Хранение на фронте

**Файл**: `apps/web/src/shared/auth/session.ts`

- JWT хранится в `localStorage`
- `setSession(token, user)` — сохраняет токен + данные пользователя
- `clearSession()` — удаляет из localStorage
- `useSession()` — хук, возвращает `{ user, token, hydrated }`
- API-клиент автоматически добавляет `Authorization: Bearer <token>` к запросам

---

## 11. Карта файлов

### Бэкенд (`apps/api/src/modules/auth/`)

| Файл | Описание |
|------|----------|
| `auth.module.ts` | NestJS модуль — регистрация всех провайдеров |
| `auth.controller.ts` | Все эндпоинты `/auth/*` (регистрация, вход, сброс, OAuth, MAX) |
| `auth.service.ts` | Основная логика: email-регистрация, вход, сброс пароля, phone-регистрация |
| `email-code.service.ts` | Генерация/проверка 6-значных email-кодов (argon2 hash, TTL 15 мин, 3 попытки) |
| `sms-code.service.ts` | Генерация/проверка SMS-кодов (argon2 hash, TTL 5 мин, 3 попытки) |
| `tokens.service.ts` | JWT sign/verify |
| `jwt-auth.guard.ts` | Guard для защищённых эндпоинтов |
| `current-user.decorator.ts` | `@CurrentUser()` декоратор |
| `vk-oauth.service.ts` | VK ID OAuth 2.0 + PKCE |
| `telegram-auth.service.ts` | MAX bot авторизация (webhook handler) |

### Фронтенд (`apps/web/src/`)

| Файл | Описание |
|------|----------|
| `features/register-email/api.ts` | API: 3 шага email-регистрации |
| `features/auth-methods/api.ts` | API: phone, VK, MAX, email-login |
| `features/password-reset/api.ts` | API: 3 шага сброса пароля |
| `features/auth-methods/ui/max-flow.tsx` | UI: MAX авторизация (кнопка + polling) |
| `shared/auth/session.ts` | localStorage хранилище JWT + хук `useSession()` |
| `shared/api/client.ts` | HTTP-клиент с auto-attach Bearer token |

### Shared (`packages/shared/src/auth/`)

| Файл | Описание |
|------|----------|
| `schemas.ts` | Zod-схемы всех DTO (валидация на клиенте и сервере) |

### Prisma (`apps/api/prisma/schema.prisma`)

| Модель | Описание |
|--------|----------|
| `User` | Основная сущность. Поля: email, phone, passwordHash, vkId, telegramId, role, roles |
| `EmailCode` | 6-значные коды (email). Purposes: REGISTRATION, PASSWORD_RESET, EMAIL_BINDING, LOGIN_VERIFICATION |
| `SmsCode` | SMS-коды (phone). Purposes: PHONE_VERIFICATION, LOGIN_VERIFICATION |
| `Session` | Серверные сессии (refresh token hash) |

---

## 12. Переменные окружения

```env
# JWT
JWT_SECRET=<секрет для подписи токенов>
JWT_ACCESS_TTL=30d

# Коды (dev)
DEV_EXPOSE_CODES=true   # В dev-режиме возвращает код в ответе API

# SMTP (для email-кодов)
SMTP_HOST=...
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM="Globox <noreply@glo-box.ru>"

# SMS (SMSC.ru)
SMS_PROVIDER=smsc
SMSC_LOGIN=...
SMSC_PASSWORD=...
SMSC_SENDER=Globox

# VK OAuth
VK_CLIENT_ID=...
VK_CLIENT_SECRET=...
VK_REDIRECT_URI=https://glo-box.ru/auth/vk/callback

# MAX Bot
MAX_BOT_TOKEN=<токен из business.max.ru>
MAX_BOT_USERNAME=id052903284888_bot
```

---

## 13. Prisma-модели

### User
```prisma
model User {
  id            String     @id @default(uuid()) @db.Uuid
  email         String?    @unique
  emailVerified Boolean    @default(false)
  passwordHash  String?
  vkId          String?    @unique      // VK OAuth
  telegramId    String?    @unique      // MAX bot userId
  phone         String?    @unique      // E.164
  phoneVerified Boolean    @default(false)
  firstName     String?
  lastName      String?
  avatarUrl     String?
  role          UserRole   @default(BUYER)
  roles         UserRole[] @default([BUYER])
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  lastLoginAt   DateTime?
}
```

### EmailCode
```prisma
model EmailCode {
  id         String           @id @default(uuid())
  email      String
  codeHash   String           // argon2id hash 6-значного кода
  purpose    EmailCodePurpose // REGISTRATION | PASSWORD_RESET | EMAIL_BINDING | LOGIN_VERIFICATION
  attempts   Int              @default(0)  // макс 3
  expiresAt  DateTime         // +15 минут от создания
  consumedAt DateTime?        // null = ещё не использован
  createdAt  DateTime         @default(now())
}
```

### SmsCode
```prisma
model SmsCode {
  id         String         @id @default(uuid())
  userId     String?
  phone      String
  codeHash   String         // argon2id hash 6-значного кода
  purpose    SmsCodePurpose // PHONE_VERIFICATION | LOGIN_VERIFICATION
  attempts   Int            @default(0)  // макс 3
  expiresAt  DateTime       // +5 минут от создания
  consumedAt DateTime?
  createdAt  DateTime       @default(now())
}
```

---

## Rate Limits (Throttle)

| Эндпоинт | Лимит | Период |
|-----------|-------|--------|
| `register/email` | 5 | 1 час |
| `register/verify` | 10 | 1 час |
| `register/complete` | 5 | 1 час |
| `register/phone/*` | 5 | 1 час |
| `login/email` | 10 | 1 час |
| `login/email/*` (код) | 5-10 | 1 час |
| `login/phone/*` | 5-10 | 1 час |
| `password-reset/*` | 5-10 | 1 час |
| `vk/callback` | 10 | 1 час |
| `max/start` | 10 | 1 час |

---

## Безопасность

- **Пароли**: хешируются через `argon2id`
- **Коды**: хешируются через `argon2id` (в БД хранится только хеш)
- **Timing attacks**: при несуществующем email/phone — искусственная задержка 80ms
- **Перебор кодов**: максимум 3 попытки на один код
- **TTL кодов**: email = 15 мин, SMS = 5 мин
- **JWT**: HS256, секрет из env, TTL 30 дней
- **VK OAuth**: PKCE (S256) + state параметр
- **MAX**: HMAC-SHA256 верификация контакта
