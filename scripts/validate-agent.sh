#!/bin/bash
set -e

# Clawe Validate Agent Script
# Usage: ./scripts/validate-agent.sh <agent-id>

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

AGENT_ID="$1"

if [ -z "$AGENT_ID" ]; then
    echo -e "${RED}Usage: $0 <agent-id>${NC}"
    echo ""
    echo "Example: $0 coder"
    exit 1
fi

echo -e "${GREEN}🦞 Validating agent: $AGENT_ID${NC}"
echo ""

ERRORS=0
WARNINGS=0

check_pass() { echo -e "  ${GREEN}✓${NC} $1"; }
check_fail() { echo -e "  ${RED}✗${NC} $1"; ERRORS=$((ERRORS + 1)); }
check_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; WARNINGS=$((WARNINGS + 1)); }

# Paths
WORKSPACE_DIR="$ROOT_DIR/docker/openclaw/templates/workspaces/$AGENT_ID"
BASE_LEAD="$ROOT_DIR/docker/openclaw/templates/base/lead"
BASE_WORKER="$ROOT_DIR/docker/openclaw/templates/base/worker"
INIT_SCRIPT="$ROOT_DIR/docker/openclaw/scripts/init-agents.sh"
CONFIG_TEMPLATE="$ROOT_DIR/docker/openclaw/templates/config.template.json"

# Detect agent type from init-agents.sh
if grep -q "\"$AGENT_ID\".*\"lead\"" "$INIT_SCRIPT" 2>/dev/null; then
    AGENT_TYPE="lead"
    BASE_DIR="$BASE_LEAD"
else
    AGENT_TYPE="worker"
    BASE_DIR="$BASE_WORKER"
fi

# 1. Check workspace template
echo -e "${YELLOW}1. Workspace Template (type: $AGENT_TYPE)${NC}"

if [ -d "$WORKSPACE_DIR" ]; then
    check_pass "Directory exists: workspaces/$AGENT_ID/"
else
    check_fail "Directory missing: workspaces/$AGENT_ID/"
fi

# SOUL.md must be in the agent's own workspace
if [ -f "$WORKSPACE_DIR/SOUL.md" ]; then
    check_pass "SOUL.md exists (agent-specific)"
else
    check_fail "SOUL.md missing (must be in workspaces/$AGENT_ID/)"
fi

# Other files should exist in base templates
for file in AGENTS.md HEARTBEAT.md MEMORY.md TOOLS.md USER.md; do
    if [ -f "$WORKSPACE_DIR/$file" ]; then
        check_pass "$file exists (agent override)"
    elif [ -f "$BASE_DIR/$file" ]; then
        check_pass "$file exists (from base/$AGENT_TYPE/)"
    else
        check_fail "$file missing (not in workspace or base)"
    fi
done

# Check SOUL.md has task discipline
if [ -f "$WORKSPACE_DIR/SOUL.md" ]; then
    if grep -q "Task Discipline" "$WORKSPACE_DIR/SOUL.md"; then
        check_pass "SOUL.md has Task Discipline section"
    else
        check_warn "SOUL.md missing Task Discipline section"
    fi
fi

# Check HEARTBEAT.md has the warning (check both locations)
HEARTBEAT_FILE="$WORKSPACE_DIR/HEARTBEAT.md"
[ ! -f "$HEARTBEAT_FILE" ] && HEARTBEAT_FILE="$BASE_DIR/HEARTBEAT.md"
if [ -f "$HEARTBEAT_FILE" ]; then
    if grep -q "NEVER submit for review" "$HEARTBEAT_FILE"; then
        check_pass "HEARTBEAT.md has review warning"
    else
        check_warn "HEARTBEAT.md missing review warning"
    fi
fi

# 2. Check init-agents.sh
echo ""
echo -e "${YELLOW}2. Init Script${NC}"

if grep -q "\"$AGENT_ID\"" "$INIT_SCRIPT"; then
    check_pass "Agent in init-agents.sh"
else
    check_fail "Agent not in init-agents.sh"
fi

# 3. Check config.template.json
echo ""
echo -e "${YELLOW}3. Config Template${NC}"

if grep -q "\"id\": \"$AGENT_ID\"" "$CONFIG_TEMPLATE" 2>/dev/null || \
   grep -q "\"$AGENT_ID\"" "$CONFIG_TEMPLATE" 2>/dev/null; then
    check_pass "Agent in config.template.json agents.list"
else
    check_fail "Agent not in config.template.json agents.list"
fi

if grep -A 100 "agentToAgent" "$CONFIG_TEMPLATE" 2>/dev/null | grep -q "\"$AGENT_ID\""; then
    check_pass "Agent in agentToAgent.allow"
else
    check_fail "Agent not in agentToAgent.allow"
fi

# 4. Check if Docker is running and agent is deployed
echo ""
echo -e "${YELLOW}4. Runtime (if Docker running)${NC}"

if command -v docker &> /dev/null && docker compose -f "$ROOT_DIR/docker-compose.yml" ps 2>/dev/null | grep -q "openclaw"; then
    AGENT_WS="/data/workspace-$AGENT_ID"
    [ "$AGENT_TYPE" = "lead" ] && AGENT_WS="/data/workspace"

    if docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T openclaw test -d "$AGENT_WS" 2>/dev/null; then
        check_pass "Workspace deployed in container"
    else
        check_warn "Workspace not in container (rebuild needed?)"
    fi

    if docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T openclaw cat /data/config/openclaw.json 2>/dev/null | grep -q "\"$AGENT_ID\""; then
        check_pass "Agent in running config"
    else
        check_warn "Agent not in running config (rebuild needed?)"
    fi
else
    echo -e "  ${YELLOW}-${NC} Docker not running, skipping runtime checks"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s), no errors${NC}"
else
    echo -e "${RED}❌ $ERRORS error(s), $WARNINGS warning(s)${NC}"
fi

exit $ERRORS
