FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Prune monorepo to only web's dependencies
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo prune @clawe/web --docker

# Install dependencies (cached unless package.json/lockfile changes)
FROM base AS deps
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Build the app
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_AUTH_PROVIDER
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_CLAWE_EDITION
ARG NEXT_PUBLIC_COGNITO_USER_POOL_ID
ARG NEXT_PUBLIC_COGNITO_CLIENT_ID
ARG NEXT_PUBLIC_COGNITO_DOMAIN
ENV NEXT_PUBLIC_AUTH_PROVIDER=${NEXT_PUBLIC_AUTH_PROVIDER}
ENV NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL}
ENV NEXT_PUBLIC_CLAWE_EDITION=${NEXT_PUBLIC_CLAWE_EDITION}
ENV NEXT_PUBLIC_COGNITO_USER_POOL_ID=${NEXT_PUBLIC_COGNITO_USER_POOL_ID}
ENV NEXT_PUBLIC_COGNITO_CLIENT_ID=${NEXT_PUBLIC_COGNITO_CLIENT_ID}
ENV NEXT_PUBLIC_COGNITO_DOMAIN=${NEXT_PUBLIC_COGNITO_DOMAIN}

COPY --from=deps /app/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm build --filter=@clawe/web

# Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NO_COLOR=1
ENV FORCE_COLOR=0
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV CLAWE_DATA_DIR=/data/clawe

# Create data directory with built-in node user (UID 1000)
RUN mkdir -p /data/clawe && chown node:node /data/clawe

COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public

USER node

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
