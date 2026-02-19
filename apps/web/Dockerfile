FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Prune monorepo to only web's dependencies
FROM base AS pruner
RUN npm install -g turbo@2
COPY . .
RUN turbo prune @clawe/web --docker

# Install dependencies (cached unless package.json/lockfile changes)
FROM base AS deps
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Build the app
FROM base AS builder
COPY --from=deps /app/ .
COPY --from=pruner /app/out/full/ .

# No build-time env vars needed - Convex URL is configured at runtime
RUN pnpm build --filter=@clawe/web

# Production runner
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create data directory for config storage
RUN mkdir -p /data/clawe && chown nextjs:nodejs /data/clawe

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV CLAWE_DATA_DIR=/data/clawe

CMD ["node", "apps/web/server.js"]
