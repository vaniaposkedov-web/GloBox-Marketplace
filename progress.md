# GloBox — прогресс по блокам ТЗ

Актуально на `2026-05-05`. Аудит проведён построчно против полной спецификации (см. `HANDOVER.md` → разделы 1/2/3).

---

## БЛОК 1 — Регистрация и авторизация покупателя ✅

| Требование ТЗ | Статус | Где реализовано |
|---|---|---|
| 1.2.1 Whitelist email-доменов (gmail/mail.ru/bk.ru/list.ru/inbox.ru/yandex.ru/ya.ru/icloud.com/outlook.com/hotmail.com) | ✅ | `packages/shared/src/auth/email-whitelist.ts` + копия в `apps/web/src/shared/lib/email-whitelist.ts` |
| 1.2.2 Флоу email → 6-зн. код → пароль → телефон (15 мин, 3 попытки) | ✅ | `apps/api` + `apps/web/src/features/register-email/*` |
| 1.2.3 Пароль: 8+ символов, буквы+цифры, argon2, strength bar | ✅ | `PasswordStrengthBar` + `validatePassword` |
| 1.3 VK OAuth | ⚠️ MVP-заглушка (`vkId` есть в схеме, endpoint — TODO) |
| 1.4.1 Разрешённые страны (+7 РФ/Казахстан через префиксы 9/7, +375/+996/+998/+992/+374/+994/+373) | ✅ | `packages/shared/src/phone/countries.ts` |
| 1.4.2 Антифрод: 7+ одинаковых подряд, 8+ последовательных, Украина заблокирована | ✅ | `phone/validation.ts` — `hasSameDigitRun`, `hasSequentialRun`, `BLOCKED_COUNTRY_CODES=['380']` |
| 1.4.3 Гибридная SMS-модель для sensitive actions | ⚠️ Модель `SmsCode` создана, SMS-шлюз не подключён |
| 1.5.1 CAPTCHA + rate-limit 5/час | ⚠️ `captchaToken` в схеме, реальный провайдер не подключён |
| 1.5.2 Восстановление пароля | ✅ | `apps/web/src/features/password-reset/*` |
| 1.5.3 Сессии 30 дней + «Выйти со всех устройств» | ✅ | `sessions` table, `TokensService`, кнопка в настройках |
| 1.5.4 Поля пользователя в БД | ✅ | `User` модель |
| 1.6 Тексты ошибок («Используйте почту…», «Номер недействителен…») | ✅ | Точно по ТЗ |

**Что не подключено (внешние провайдеры, нужны ключи):**
- VK OAuth client_id / client_secret
- SMS-шлюз (например SMS Aero / SMSC)
- CAPTCHA (reCAPTCHA v3 или Yandex SmartCaptcha)

---

## БЛОК 2 — Регистрация и верификация поставщика ✅

| Требование ТЗ | Статус | Где |
|---|---|---|
| 2.1 Отдельный домен `seller-globox.ru` | ✅ | `apps/seller` (порт 3001) |
| 2.2 Изоляция сессий + `@@unique([email, role])`, `@@unique([phone, role])` | ✅ | `schema.prisma` User |
| 2.3 Общий флоу → pending → ЛК ограниченный | ✅ | — |
| 2.4 Шаг 1: телефон | ✅ (без MAX) |
| 2.4 Шаг 2: ФИО (фамилия/имя/отчество, валидация кириллица/латиница) | ✅ |
| 2.4 Шаг 3: локация (dict) + номер павильона | ✅ | `DictLocation` справочник, расширяемый из админки |
| 2.4 Шаг 4: тип субъекта (INDIVIDUAL/SELF_EMPLOYED/IP/OOO) | ✅ |
| 2.4 Шаг 5: категории (1–3, UI блокирует 4-ю) | ✅ | `SupplierTopCategory` + `SupplierCategoryLink` |
| 2.4 Шаг 6: ИНН (10/12) + ОГРНИП (13/15) — regex-валидация | ✅ |
| 2.4 Шаг 7: фото пропуска + селфи | ⚠️ Поля в БД есть (`passPhotoUrl`, `passSelfiePhotoUrl`), UI-заглушка — реальный S3-upload не подключён |
| 2.5 Ограниченный ЛК до одобрения | ✅ | `supplier.service.createListing` проверяет `status === 'APPROVED'` |
| 2.6 Статусы PENDING / NEEDS_REVISION / APPROVED / REJECTED | ✅ | `SupplierStatus` enum |
| 2.7 Чат с техподдержкой | ❌ Не реализован (в ТЗ — отдельный модуль) |
| 2.8 Изменение критичных данных через техподдержку | ✅ | `SupplierChangeRequest` модель |
| 2.9 SLA 24 часа + баннер | ⚠️ Данные хранятся (`submittedAt`), но авто-баннер в UI пока показывается жёстко |
| 2.10 Доработка/отказ логика | ✅ | `admin.service.ts`: approve/reject/requestRevision |
| 2.11 Поля в БД | ✅ | `SupplierProfile` |
| 2.12 MAX-бот, S3, иллюстрации | ⚠️ Заглушки — нужны сервисы от заказчика |

**Что работает в проде:** полный флоу регистрации, модерация через админ-панель, запрет повторной регистрации при `REJECTED`, блокировка создания товаров до одобрения.

---

## БЛОК 3 — Регистрация и верификация посредника ✅

| Требование ТЗ | Статус | Где |
|---|---|---|
| 3.1 Концепция: роль mediator, платформа не в расчётах | ✅ | Фичей расчётов нет по дизайну |
| 3.2 Домен `posred-globox.ru` | ✅ | `apps/mediator` (порт 3003) |
| 3.3 Правила ролей: supplier+mediator — OK, buyer+mediator — НЕТ | ✅ | `mediator.service.register()` проверяет `role=BUYER` конфликт; DB constraint `@@unique([email/phone, role])` |
| 3.4 Флоу → pending → ограниченный ЛК | ✅ | |
| 3.5 Шаг 1: ФИО (с валидацией) | ✅ |
| 3.5 Шаг 2: телефон (разрешённые страны, антифрод) | ✅ (без MAX) |
| 3.5 Шаг 3: ставка 3–20%, шаг 0.5% | ✅ | `MEDIATOR_COMMISSION_MIN=3`, `MAX=20` в shared |
| 3.5 Шаг 4: мин. сумма ≥ 0 | ✅ |
| 3.5 Шаг 5: 3 фото (аватар / паспорт / селфи с пропуском) | ⚠️ Поля в БД есть, UI-upload — заглушка |
| 3.6 Зона работы «весь Садовод» | ✅ | Отсутствие поля = работает везде |
| 3.7 Ограниченный ЛК до одобрения | ✅ | `apps/mediator/src/app/orders/page.tsx` блокирует до APPROVED |
| 3.8 Статусы + SLA 24ч баннер | ⚠️ Аналогично поставщику — счётчик есть, автобаннер упрощён |
| 3.9 Чат с техподдержкой + MAX | ❌ Не реализован |
| 3.10 Soft settings (ставка/мин.сумма/аватар — без модерации) | ✅ | `PATCH /api/mediator/settings` |
| 3.10 Hard settings через change-request | ✅ | `POST /api/mediator/change-request` + `MediatorChangeRequest` |
| 3.11 Повторная регистрация при REJECTED заблокирована | ✅ | `mediator.service.register()` |
| 3.12 Поля в БД (rating, completedOrdersCount и пр.) | ✅ | `MediatorProfile` |
| 3.13 MAX-бот, S3, иллюстрации | ⚠️ Заглушки |

---

## Что готово к деплою

- ✅ Prisma схема + Prisma Client (сгенерирован локально)
- ✅ API (`@marketplace/api`) — typecheck зелёный
- ✅ 4 фронтенда (`web`, `seller`, `admin`, `mediator`) — typecheck + `next build` зелёные
- ✅ Seed-скрипты: `pnpm seed` (admin/buyer/seller/mediator)
- ✅ Единый Header-компонент в `seller` и `mediator`
- ✅ CTA «Стать поставщиком / посредником» на `apps/web`
- ✅ Админ-панель: вкладки покупатели / поставщики / посредники / локации / категории
- ✅ CORS allowlist включает `localhost:3003` и все Vercel-домены
- ✅ `vercel.json` есть во всех 4 фронтендах
- ✅ `Dockerfile` + `railway.json` для API деплоя

---

## Тест-аккаунты (после `pnpm seed`)

| Роль | Email | Пароль | Статус |
|---|---|---|---|

---

## Деплой-инструкции

### Railway (API + Postgres)
```powershell
railway up
railway domain   # получить публичный URL
```
При старте контейнер автоматически выполняет `prisma db push`. Переменные:
- `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- `JWT_SECRET` = любая случайная строка 32+ символов
- `WEB_ORIGIN` = `https://glo-box.ru,https://seller-globox.ru,https://posred-globox.ru`

### Vercel (4 фронтенда)
Для каждого из `apps/web`, `apps/seller`, `apps/admin`, `apps/mediator`:
```powershell
cd apps/mediator
vercel link           # выбрать/создать проект
vercel env add NEXT_PUBLIC_API_URL production
# значение: https://<railway-domain>
vercel --prod
```

### После деплоя — seed прод-БД
```powershell
railway run node apps/api/prisma/seed-all.cjs
```

---

## Что НЕ доделано (нужно от заказчика / внешние провайдеры)

1. **MAX Bot** — регистрация `@GloBoxSellerBot` / `@GloBoxMediatorBot`, API-ключ. Без этого поставщик/посредник регистрируются **без верификации телефона через MAX**.
2. **S3** (Selectel / Yandex Object Storage / VK Cloud) — upload фото документов. Сейчас поля в БД `*PhotoUrl` принимают любой URL, UI ждёт pre-signed URL.
3. **SMS-шлюз** (для 1.4.3 — гибридная верификация покупателей).
4. **VK OAuth** — client_id / redirect_uri от приложения ВК.
5. **CAPTCHA** — ключи reCAPTCHA v3 или Yandex SmartCaptcha.
6. **SMTP** — сейчас коды email показываются в логах API (`DEV_EXPOSE_CODES=true`).
7. **Чат с техподдержкой** (разделы 2.7 / 3.9) — отдельный большой модуль, не начинали.
8. **Иллюстрации** «как правильно / неправильно фотографировать» — не от разработчика.
9. **Тексты UA/PDn-согласия** — не от разработчика.
