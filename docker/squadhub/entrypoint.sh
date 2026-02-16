#!/bin/sh
set -e

CONFIG_FILE="${OPENCLAW_STATE_DIR}/openclaw.json"
PORT="${OPENCLAW_PORT:-18789}"
TOKEN="${SQUADHUB_TOKEN:-}"
TEMPLATES_DIR="/opt/clawe/templates"

# Map to OPENCLAW_TOKEN for the openclaw CLI
export OPENCLAW_TOKEN="$TOKEN"

if [ -z "$TOKEN" ]; then
    echo "ERROR: SQUADHUB_TOKEN environment variable is required"
    exit 1
fi

# Check if first run (no config exists)
if [ ! -f "$CONFIG_FILE" ]; then
    echo "==> First run detected."
    
    # 1. Run OpenClaw onboarding first (creates base config + workspace)
    echo "==> Running OpenClaw onboarding..."
    openclaw onboard \
        --non-interactive \
        --accept-risk \
        --mode local \
        --auth-choice skip \
        --gateway-port "$PORT" \
        --gateway-bind lan \
        --gateway-auth token \
        --gateway-token "$TOKEN" \
        --workspace /data/workspace \
        --skip-channels \
        --skip-skills \
        --skip-health \
        --skip-ui \
        --skip-daemon \
        --tailscale off
    
    # 2. Initialize agent workspaces (adds specialist workspaces + shared state)
    echo "==> Initializing agent workspaces..."
    /opt/clawe/scripts/init-agents.sh
    
    # 3. Patch the config with our agent setup
    echo "==> Patching config with agent setup..."
    export OPENCLAW_PORT="${PORT}"
    export CONVEX_URL="${CONVEX_URL:-}"
    
    envsubst '$OPENCLAW_PORT $OPENCLAW_TOKEN $CONVEX_URL' < "$TEMPLATES_DIR/config.template.json" > "$CONFIG_FILE"
    
    echo "==> Setup complete."
else
    echo "==> Config exists. Skipping initialization."
fi

# Pre-pair: write paired.json from identity BEFORE gateway starts.
# This ensures the local CLI device is recognized on boot.
node /opt/clawe/scripts/pair-device.js

# Background: watch for new pending requests every 60s.
node /opt/clawe/scripts/pair-device.js --watch &

echo "==> Starting OpenClaw gateway on port $PORT..."

exec openclaw gateway run \
    --port "$PORT" \
    --bind 0.0.0.0 \
    --token "$TOKEN" \
    --allow-unconfigured
