#!/bin/sh
set -e

# Clawe Agent Initialization Script
# Generates agent workspaces from base templates + agent-specific SOUL.md

TEMPLATES_DIR="/opt/clawe/templates"
BASE_DIR="$TEMPLATES_DIR/base"
WORKSPACES_DIR="$TEMPLATES_DIR/workspaces"
DATA_DIR="/data"

echo "🦞 Initializing Clawe agents..."

# Create shared directory
echo "  → Creating shared directory..."
mkdir -p "$DATA_DIR/shared"
cp -r "$TEMPLATES_DIR/shared/"* "$DATA_DIR/shared/"
echo "  ✓ Shared state initialized"

# ──────────────────────────────────────────────
# init_agent <id> <name> <emoji> <role> <type>
#   type: "lead" or "worker"
# ──────────────────────────────────────────────
init_agent() {
    AGENT_ID="$1"
    AGENT_NAME="$2"
    AGENT_EMOJI="$3"
    AGENT_ROLE="$4"
    AGENT_TYPE="${5:-worker}"

    # Workspace path: lead uses /data/workspace, workers use /data/workspace-<id>
    if [ "$AGENT_TYPE" = "lead" ]; then
        WS_DIR="$DATA_DIR/workspace"
    else
        WS_DIR="$DATA_DIR/workspace-$AGENT_ID"
    fi

    echo "  → Creating $AGENT_NAME $AGENT_EMOJI workspace..."
    mkdir -p "$WS_DIR/memory"

    # Export variables for envsubst
    export AGENT_ID AGENT_NAME AGENT_EMOJI AGENT_ROLE

    # Generate files from base templates
    for template in "$BASE_DIR/$AGENT_TYPE"/*.md; do
        filename=$(basename "$template")
        envsubst '${AGENT_ID} ${AGENT_NAME} ${AGENT_EMOJI} ${AGENT_ROLE}' < "$template" > "$WS_DIR/$filename"
    done

    # Copy agent-specific files (SOUL.md and any overrides)
    if [ -d "$WORKSPACES_DIR/$AGENT_ID" ]; then
        cp -r "$WORKSPACES_DIR/$AGENT_ID/"* "$WS_DIR/"
    fi

    # Symlink shared directory
    ln -sf "$DATA_DIR/shared" "$WS_DIR/shared"

    echo "  ✓ $AGENT_NAME workspace initialized"
}

# ──────────────────────────────────────────────
# Initialize all agents
# ──────────────────────────────────────────────

init_agent "main"  "Clawe" "🦞" "Squad Lead"       "lead"
init_agent "inky"  "Inky"  "✍️"  "Content Writer"   "worker"
init_agent "pixel" "Pixel" "🎨" "Graphic Designer"  "worker"
init_agent "scout" "Scout" "🔍" "SEO Specialist"    "worker"

echo "✅ Agent initialization complete!"
echo ""
echo "Squad:"
echo "  🦞 Clawe (Squad Lead)       → $DATA_DIR/workspace"
echo "  ✍️  Inky (Content Writer)    → $DATA_DIR/workspace-inky"
echo "  🎨 Pixel (Graphic Designer)  → $DATA_DIR/workspace-pixel"
echo "  🔍 Scout (SEO Specialist)    → $DATA_DIR/workspace-scout"
echo ""
