FROM node:22-slim

WORKDIR /app

# Copy built artifacts from monorepo build
# These should be built before docker build with: pnpm build

# Watcher
COPY apps/watcher/dist/ ./dist/

# Shared package (squadhub client)
COPY packages/shared/package.json ./node_modules/@clawe/shared/package.json
COPY packages/shared/dist/ ./node_modules/@clawe/shared/dist/

# Backend (Convex API types)
COPY packages/backend/package.json ./node_modules/@clawe/backend/package.json
COPY packages/backend/convex/_generated/ ./node_modules/@clawe/backend/convex/_generated/
COPY packages/backend/convex/*.ts ./node_modules/@clawe/backend/convex/

# Create a clean package.json without workspace:* references (npm doesn't support them)
RUN echo '{"name":"@clawe/watcher","private":true,"type":"module"}' > package.json

# Install production dependencies
RUN npm install convex axios ws moment-timezone --omit=dev

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
