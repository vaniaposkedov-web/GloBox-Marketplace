# MCP-серверы Cascade — установлены и работают

Этот документ — фактическая шпаргалка по уже установленному набору
MCP-серверов, расширяющих возможности Cascade в этом репозитории.
Все серверы **бесплатны** и не требуют API-ключей.

## Расположение конфига

- Файл: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`
  (на этой машине: `C:\Users\vanap\.codeium\windsurf\mcp_config.json`)
- UI: Cascade panel → ⚙ → **MCP servers** → **Edit Config**
- После правки — нажать **Refresh** в той же панели,
  чтобы Cascade перезапустил серверы.

## Установленные серверы

| Сервер | Назначение | Пакет npm | Версия |
|---|---|---|---|
| **filesystem** | Чтение/запись/поиск файлов внутри `d:\project_work_frilans\marketplizzzz` | `@modelcontextprotocol/server-filesystem` | 2026.1.14 |
| **memory** | Постоянная память (knowledge graph) между сессиями | `@modelcontextprotocol/server-memory` | 2026.1.26 |
| **sequential-thinking** | Структурированное step-by-step рассуждение с ревизией | `@modelcontextprotocol/server-sequential-thinking` | 2025.12.18 |
| **fetch** | Загрузка любых web-страниц как HTML / Markdown / plain / JSON / YouTube-транскрипты | `mcp-fetch-server` | 1.1.2 |
| **playwright** | Реальный браузер (Chromium): навигация, клики, скриншоты, e2e-тесты | `@playwright/mcp` | 0.0.70 |
| **context7** | Актуальные доки любой npm-библиотеки (antd, tailwind, next, react, prisma, …) | `@upstash/context7-mcp` | 2.2.0 |
| **shadcn-ui** | Реестр shadcn/ui (компоненты, blocks, темы) — источник идей | `@jpisnice/shadcn-ui-mcp-server` | 2.0.0 |

## Финальный конфиг

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "d:\\project_work_frilans\\marketplizzzz"
      ]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "mcp-fetch-server"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "shadcn-ui": {
      "command": "npx",
      "args": ["-y", "@jpisnice/shadcn-ui-mcp-server"]
    }
  }
}
```

## Что я смогу автоматизировать

### При проектировании UI
- **«посмотри в context7 актуальный API antd Form.useWatch и переделай форму
  на него»** — без догадок, по живой документации
- **«дай 3 варианта блока «Преимущества» из shadcn-blocks и адаптируй под
  тёплую палитру»** — через `shadcn-ui`
- **«открой через playwright wildberries.ru, сделай скриншот карточки
  товара, и сделай похожую в нашем стиле»**

### При интеграции
- **«сходи fetch-ом на главную dashboard.tailwindui.com и собери из
  markdown-выдачи список используемых паттернов»**
- **«запомни в memory, что мы используем тёплую палитру `amber/orange/rose`
  и keepable cookie-banner стиль»** — будет помниться между сессиями

### При QA
- **«через playwright прокликай регистрацию поставщика на localhost:3000 и
  проверь все шаги»**
- **«сделай через filesystem скан apps/web/src/features/register-* и собери
  список TODO в одном файле»**

## Опциональные платные / с ключом

Если позже захотите расширить — потребуют регистрации:

| Сервер | Что добавит | Получить ключ |
|---|---|---|
| **21st.dev Magic** | Каталог готовых UI-блоков с генерацией | https://21st.dev/magic |
| **Brave Search** | Web-поиск без капчи (актуальные референсы) | https://brave.com/search/api/ |
| **GitHub** | Управление репозиторием/issues/PR прямо из чата | github.com/settings/tokens |
| **Figma Dev Mode** | Чтение Figma-макетов | Figma Dev Mode plugin |

## Если что-то не подцепилось

1. Проверьте, что `node --version` ≥ 20 (на машине `v24.11.1` — OK)
2. Откройте Cascade → MCP panel → у каждого сервера должна быть
   зелёная точка. Если красная — кликните на сервер, посмотрите логи.
3. Первый запуск каждого сервера долгий (npx скачивает пакет) — норма.
4. Для **playwright** установлен Chromium через `npx playwright install chromium`.
   Если Playwright MCP жалуется на отсутствие браузера — повторить эту команду.
