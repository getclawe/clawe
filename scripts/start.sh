#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() { echo -e "${GREEN}==>${NC} $1"; }
echo_warn() { echo -e "${YELLOW}==>${NC} $1"; }
echo_error() { echo -e "${RED}ERROR:${NC} $1"; }

# Auto-generate .env if it doesn't exist
if [ ! -f .env ]; then
    echo_info "Creating .env from .env.example..."
    cp .env.example .env

    # Generate secure random token
    TOKEN=$(openssl rand -hex 32)

    # Cross-platform sed (macOS vs Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-secure-token-here/$TOKEN/" .env
    else
        sed -i "s/your-secure-token-here/$TOKEN/" .env
    fi

    echo_info "Generated SQUADHUB_TOKEN: ${TOKEN:0:8}..."
    echo_warn "Please edit .env and set your CONVEX_URL"
fi

# Load .env
set -a
source .env
set +a

# Validate required environment variables
MISSING_VARS=()

if [ -z "$CONVEX_URL" ] || [ "$CONVEX_URL" = "https://your-deployment.convex.cloud" ]; then
    MISSING_VARS+=("CONVEX_URL")
fi

if [ -z "$SQUADHUB_TOKEN" ] || [ "$SQUADHUB_TOKEN" = "your-secure-token-here" ]; then
    MISSING_VARS+=("SQUADHUB_TOKEN")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo_error "Missing required environment variables in .env:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please edit .env and set these values before running."
    exit 1
fi

# Build packages needed for Docker images
echo_info "Building packages..."
pnpm install --frozen-lockfile
pnpm --filter @clawe/cli build
pnpm --filter @clawe/shared build
pnpm --filter @clawe/watcher build

echo_info "Starting Clawe (production mode)..."

# Use only docker-compose.yml (ignore override) for production
docker compose -f docker-compose.yml up --build "$@"
