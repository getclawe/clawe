#!/bin/bash
# Sync environment variables to the local Convex backend on dev startup.
# Called as a background process from the backend's dev script.
# Waits for the local Convex backend to be ready, then sets env vars.

CONVEX_LOCAL="http://127.0.0.1:3210"

# Wait for local Convex backend
until curl -s "$CONVEX_LOCAL" >/dev/null 2>&1; do
  sleep 1
done

AUTH_PROVIDER="${AUTH_PROVIDER:-nextauth}"

if [ "$AUTH_PROVIDER" = "cognito" ]; then
  [ -n "$COGNITO_ISSUER_URL" ] && convex env set COGNITO_ISSUER_URL "$COGNITO_ISSUER_URL"
  [ -n "$COGNITO_CLIENT_ID" ] && convex env set COGNITO_CLIENT_ID "$COGNITO_CLIENT_ID"
else
  # NextAuth: NEXTAUTH_ISSUER_URL comes from NEXTAUTH_URL
  [ -n "$NEXTAUTH_URL" ] && convex env set NEXTAUTH_ISSUER_URL "$NEXTAUTH_URL"

  # NEXTAUTH_JWKS_URL: build data URI from dev-jwks/jwks.json if not already set
  if [ -z "$NEXTAUTH_JWKS_URL" ]; then
    JWKS_FILE="$(dirname "$0")/../packages/backend/convex/dev-jwks/jwks.json"
    if [ -f "$JWKS_FILE" ]; then
      JWKS_ENCODED=$(python3 -c "import urllib.parse, sys; print('data:application/json,' + urllib.parse.quote(sys.stdin.read().strip()))" < "$JWKS_FILE")
      convex env set NEXTAUTH_JWKS_URL "$JWKS_ENCODED"
    fi
  else
    convex env set NEXTAUTH_JWKS_URL "$NEXTAUTH_JWKS_URL"
  fi
fi

[ -n "$WATCHER_TOKEN" ] && convex env set WATCHER_TOKEN "$WATCHER_TOKEN"

echo "[sync-convex-env] Convex env vars synced"
