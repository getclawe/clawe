FROM node:22-slim AS build

WORKDIR /app

# Copy monorepo root files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./

# Copy workspace package manifests
COPY apps/watcher/package.json ./apps/watcher/
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Install pnpm and fetch dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY packages/shared/ ./packages/shared/
COPY packages/backend/ ./packages/backend/
COPY apps/watcher/ ./apps/watcher/
RUN pnpm build --filter=@clawe/watcher

# Deploy: extract watcher with all production deps into /app/deploy
RUN pnpm --filter=@clawe/watcher --prod deploy deploy

# --- Production image ---
FROM node:22-slim

WORKDIR /app

COPY --from=build /app/deploy .

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
