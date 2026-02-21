FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Prune monorepo to only watcher's dependencies
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo prune @clawe/watcher --docker

# Install dependencies (cached unless package.json/lockfile changes)
FROM base AS deps
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Build the app
FROM base AS builder
COPY --from=deps /app/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm build --filter=@clawe/watcher

# Extract watcher with production deps only
RUN pnpm --filter=@clawe/watcher --prod deploy deploy

# Production runner
FROM node:22-slim
WORKDIR /app

ENV NODE_ENV=production
ENV NO_COLOR=1
ENV FORCE_COLOR=0

COPY --from=builder --chown=node:node /app/deploy .

USER node

CMD ["node", "dist/index.js"]
