FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    git \
    cmake \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw@latest

RUN mkdir -p /data/config /data/workspace

ENV OPENCLAW_STATE_DIR=/data/config
ENV OPENCLAW_PORT=18789

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
    CMD wget -q --spider http://localhost:${OPENCLAW_PORT}/health || exit 1

EXPOSE ${OPENCLAW_PORT}

ENTRYPOINT ["/entrypoint.sh"]
