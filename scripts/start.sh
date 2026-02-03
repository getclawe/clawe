#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Auto-generate .env if it doesn't exist
if [ ! -f .env ]; then
    echo "==> Creating .env with auto-generated OPENCLAW_TOKEN..."
    cp .env.example .env

    TOKEN=$(openssl rand -hex 32)

    # Cross-platform sed (macOS vs Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/change-me-to-secure-random-token/$TOKEN/" .env
    else
        sed -i "s/change-me-to-secure-random-token/$TOKEN/" .env
    fi

    echo "==> Generated OPENCLAW_TOKEN: ${TOKEN:0:8}..."
fi

echo "==> Starting Clawe (production mode)..."

# Use only docker-compose.yml (ignore override) for production
docker-compose -f docker-compose.yml up "$@"
