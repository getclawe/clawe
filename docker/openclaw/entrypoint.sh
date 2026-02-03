#!/bin/sh
set -e

CONFIG_FILE="${OPENCLAW_STATE_DIR}/openclaw.json"
PORT="${OPENCLAW_PORT:-18789}"
TOKEN="${OPENCLAW_TOKEN:-}"

if [ -z "$TOKEN" ]; then
    echo "ERROR: OPENCLAW_TOKEN environment variable is required"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo "==> First run detected. Running non-interactive onboarding..."

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

    echo "==> Onboarding complete."
else
    echo "==> Config exists. Skipping onboarding."
fi

echo "==> Starting OpenClaw gateway on port $PORT..."

exec openclaw gateway run \
    --port "$PORT" \
    --bind 0.0.0.0 \
    --token "$TOKEN"
