#!/bin/bash
set -e

# Clawe Add Agent Script
# Usage: ./scripts/add-agent.sh <id> <name> <emoji> <role> [cron_schedule]
#
# Creates a new agent using the shared base templates.
# Only generates a SOUL.md specific to this agent.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Args
AGENT_ID="$1"
AGENT_NAME="$2"
AGENT_EMOJI="$3"
AGENT_ROLE="$4"
CRON_SCHEDULE="${5:-"15,45 * * * *"}"

# Validate args
if [ -z "$AGENT_ID" ] || [ -z "$AGENT_NAME" ] || [ -z "$AGENT_EMOJI" ] || [ -z "$AGENT_ROLE" ]; then
    echo -e "${RED}Usage: $0 <id> <name> <emoji> <role> [cron_schedule]${NC}"
    echo ""
    echo "Arguments:"
    echo "  id            Lowercase identifier (e.g., 'coder')"
    echo "  name          Display name (e.g., 'Coder')"
    echo "  emoji         Agent emoji (e.g., '💻')"
    echo "  role          Role description (e.g., 'Developer')"
    echo "  cron_schedule Optional cron expression (default: '15,45 * * * *')"
    echo ""
    echo "Example:"
    echo "  $0 coder Coder 💻 Developer \"15,45 * * * *\""
    exit 1
fi

# Paths
TEMPLATES_DIR="$ROOT_DIR/docker/openclaw/templates"
WORKSPACE_DIR="$TEMPLATES_DIR/workspaces/$AGENT_ID"
INIT_SCRIPT="$ROOT_DIR/docker/openclaw/scripts/init-agents.sh"
CONFIG_TEMPLATE="$TEMPLATES_DIR/config.template.json"

echo -e "${GREEN}🦞 Adding agent: $AGENT_NAME $AGENT_EMOJI${NC}"
echo ""

# Check if agent already exists
if [ -d "$WORKSPACE_DIR" ]; then
    echo -e "${RED}Error: Workspace already exists at $WORKSPACE_DIR${NC}"
    exit 1
fi

# 1. Create workspace with only SOUL.md
echo -e "${YELLOW}1. Creating agent workspace...${NC}"
mkdir -p "$WORKSPACE_DIR"

cat > "$WORKSPACE_DIR/SOUL.md" << EOF
# SOUL.md — Who You Are

You are **$AGENT_NAME**, the $AGENT_ROLE. $AGENT_EMOJI

## Role

You're a specialist agent in the Clawe squad. Your job is to execute tasks assigned to you with excellence.

## Personality

_Customize this section to define how $AGENT_NAME thinks and works._

## What You're Good At

_List this agent's core skills and specialties._

## Team

- **Clawe 🦞** is your squad lead — coordinates and reviews
- You share context via workspace files
- Update \`shared/WORKING.md\` with your progress

## Task Discipline

⚠️ **Follow task workflow COMPLETELY:**

- Do NOT move to "review" until ALL subtasks are done
- If you need another agent, coordinate through Clawe
- Comment progress updates so the team knows where you are
- Only submit for review when the work is truly complete
EOF

echo -e "  ${GREEN}✓${NC} Created $WORKSPACE_DIR/SOUL.md"
echo -e "  ${YELLOW}→${NC} Other files (AGENTS.md, HEARTBEAT.md, etc.) generated from base templates"

# 2. Update init-agents.sh — add init_agent call before the completion message
echo -e "${YELLOW}2. Updating init-agents.sh...${NC}"

# Add new init_agent call before the "Agent initialization complete" line
sed -i "/echo \"✅ Agent initialization complete!\"/i\\init_agent \"$AGENT_ID\"  \"$AGENT_NAME\" \"$AGENT_EMOJI\" \"$AGENT_ROLE\"  \"worker\"" "$INIT_SCRIPT"

# Add to the squad list at the end
sed -i "/^echo \"\"$/i\\echo \"  $AGENT_EMOJI $AGENT_NAME ($AGENT_ROLE)    → \$DATA_DIR/workspace-$AGENT_ID\"" "$INIT_SCRIPT"

echo -e "  ${GREEN}✓${NC} Updated init-agents.sh"

# 3. Update config.template.json
echo -e "${YELLOW}3. Updating config.template.json...${NC}"

# Use Python to safely parse and update the JSON template
python3 -c "
import json, re, sys

with open('$CONFIG_TEMPLATE', 'r') as f:
    content = f.read()

# Handle envsubst placeholders that aren't valid JSON
placeholders = {}
counter = [0]

def replace_quoted(m):
    key = 'PLACEHOLDER_' + str(counter[0])
    placeholders[key] = m.group(1)
    counter[0] += 1
    return '\"' + key + '\"'

def replace_bare(m):
    key = 'PLACEHOLDER_' + str(counter[0])
    placeholders[key] = m.group(0)
    counter[0] += 1
    return '\"' + key + '\"'

# First quoted: \"\\\${VAR}\", then bare \\\${VAR}
safe = re.sub(r'\"(\\\$\{\w+\})\"', replace_quoted, content)
safe = re.sub(r'\\\$\{\w+\}', replace_bare, safe)

config = json.loads(safe)

config['agents']['list'].append({
    'id': '$AGENT_ID',
    'name': '$AGENT_NAME',
    'workspace': '/data/workspace-$AGENT_ID',
    'model': 'anthropic/claude-sonnet-4-20250514',
    'identity': {
        'name': '$AGENT_NAME',
        'emoji': '$AGENT_EMOJI'
    }
})

if '$AGENT_ID' not in config['tools']['agentToAgent']['allow']:
    config['tools']['agentToAgent']['allow'].append('$AGENT_ID')

result = json.dumps(config, indent=2)

for key, val in placeholders.items():
    result = result.replace('\"' + key + '\"', val)

with open('$CONFIG_TEMPLATE', 'w') as f:
    f.write(result + '\n')
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Updated config.template.json"
else
    echo -e "  ${YELLOW}⚠${NC} Could not auto-update config. Please manually add agent to config.template.json"
fi

# Summary
echo ""
echo -e "${GREEN}✅ Agent $AGENT_NAME $AGENT_EMOJI added successfully!${NC}"
echo ""
echo "Files created:"
echo "  $WORKSPACE_DIR/SOUL.md (customize this!)"
echo ""
echo "Base templates used (shared with all agents):"
echo "  $TEMPLATES_DIR/base/worker/AGENTS.md"
echo "  $TEMPLATES_DIR/base/worker/HEARTBEAT.md"
echo "  $TEMPLATES_DIR/base/worker/MEMORY.md"
echo "  $TEMPLATES_DIR/base/worker/TOOLS.md"
echo "  $TEMPLATES_DIR/base/worker/USER.md"
echo ""
echo "Next steps:"
echo "  1. Customize SOUL.md: $WORKSPACE_DIR/SOUL.md"
echo "  2. Rebuild and deploy:"
echo ""
echo "     docker compose build --no-cache openclaw"
echo "     docker compose up -d"
echo ""
echo "  3. Register at runtime: clawe agent:onboard $AGENT_ID $AGENT_NAME \"$AGENT_ROLE\" --emoji $AGENT_EMOJI --cron \"$CRON_SCHEDULE\""
echo "  4. Validate: ./scripts/validate-agent.sh $AGENT_ID"
