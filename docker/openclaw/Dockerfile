FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    git \
    cmake \
    make \
    g++ \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw@latest

RUN mkdir -p /data/config /data/workspace

# Copy templates and scripts
COPY docker/openclaw/templates/ /opt/clawe/templates/
COPY docker/openclaw/scripts/ /opt/clawe/scripts/
RUN chmod +x /opt/clawe/scripts/*.sh

# Setup CLI directory
RUN mkdir -p /opt/clawe/cli/node_modules/@clawe/backend/convex

# Copy CLI (pre-built with pnpm build)
COPY packages/cli/package.json /opt/clawe/cli/package.json
COPY packages/cli/bin/ /opt/clawe/cli/bin/
COPY packages/cli/dist/ /opt/clawe/cli/dist/

# Copy backend types for CLI
COPY packages/backend/package.json /opt/clawe/cli/node_modules/@clawe/backend/package.json
COPY packages/backend/convex/_generated/ /opt/clawe/cli/node_modules/@clawe/backend/convex/_generated/
COPY packages/backend/convex/*.ts /opt/clawe/cli/node_modules/@clawe/backend/convex/

# Install CLI dependencies (only convex)
RUN cd /opt/clawe/cli && npm install convex --omit=dev

# Make CLI available globally
RUN ln -sf /opt/clawe/cli/bin/clawe.js /usr/local/bin/clawe
RUN chmod +x /opt/clawe/cli/bin/clawe.js

ENV OPENCLAW_STATE_DIR=/data/config
ENV OPENCLAW_PORT=18789

COPY docker/openclaw/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
    CMD wget -q --spider http://localhost:${OPENCLAW_PORT}/health || exit 1

EXPOSE ${OPENCLAW_PORT}

ENTRYPOINT ["/entrypoint.sh"]
