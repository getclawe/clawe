FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    git \
    cmake \
    make \
    g++ \
    gettext-base \
    python3 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw@latest

RUN mkdir -p /data/config /data/workspace

# Copy templates and scripts
COPY docker/squadhub/templates/ /opt/clawe/templates/
COPY docker/squadhub/scripts/ /opt/clawe/scripts/
RUN chmod +x /opt/clawe/scripts/*.sh

# Copy bundled CLI (single file with all deps included)
COPY packages/cli/dist/clawe.js /usr/local/bin/clawe
RUN chmod +x /usr/local/bin/clawe

ENV OPENCLAW_STATE_DIR=/data/config
ENV OPENCLAW_PORT=18789
ENV OPENCLAW_SKIP_GMAIL_WATCHER=1

COPY docker/squadhub/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
    CMD wget -q --spider http://localhost:${OPENCLAW_PORT}/health || exit 1

EXPOSE ${OPENCLAW_PORT}

ENTRYPOINT ["/entrypoint.sh"]
