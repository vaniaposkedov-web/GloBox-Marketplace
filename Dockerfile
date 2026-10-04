# Dockerfile для апи-сервиса (Railway deploy).
# Весь монорепо копируется целиком, билдится shared + api.

FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Копируем всё монорепо
COPY . .

# Ставим зависимости (без frozen-lockfile — лок обновляется в dev)
RUN pnpm install --no-frozen-lockfile

# Сборка shared пакета → dist/index.js для runtime
RUN pnpm --filter @marketplace/shared build

# Prisma client генерируется по схеме apps/api/prisma/schema.prisma
RUN pnpm --filter @marketplace/api exec prisma generate

# Компиляция NestJS api → apps/api/dist/main.js
RUN pnpm --filter @marketplace/api build

# Перед запуском пушим схему БД (идемпотентно), потом стартуем API
CMD ["sh", "-c", "cd apps/api && (npx prisma db push --accept-data-loss --skip-generate || echo 'prisma push failed, continuing') && node dist/main.js"]
