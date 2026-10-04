FROM node:20-bookworm-slim AS base

RUN apt-get update && apt-get install -y openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app
COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @marketplace/shared build
RUN pnpm --filter @marketplace/api exec prisma generate
RUN pnpm --filter @marketplace/api build

WORKDIR /app/apps/api

RUN chmod +x start.sh

EXPOSE 4000
CMD ["sh", "start.sh"]
