# Agent Onboarding - Clawe

Guide for adding new agents to your Clawe squad.

## Live Onboarding (No Rebuild)

Clawe can onboard new agents at runtime — no container restart needed:

```bash
# From inside Docker (run by Clawe or via docker exec)
clawe agent:onboard <id> <name> <role> [options]

# Example:
clawe agent:onboard coder Coder Developer --emoji 💻 --cron "15,45 * * * *"
```

This does everything in one command:

1. ✅ Registers agent in Convex
2. ✅ Creates workspace from base templates
3. ✅ Patches OpenClaw config (adds agent)
4. ✅ Adds heartbeat cron

The agent starts working on the next heartbeat cycle.

## Build-Time Setup (For New Deployments)

When setting up Clawe from scratch or adding agents before first deploy:

```bash
# From clawe root directory
./scripts/add-agent.sh <id> <name> <emoji> <role> [cron_schedule]

# Example:
./scripts/add-agent.sh coder Coder 💻 Developer "15,45 * * * *"

# Then rebuild:
docker compose build --no-cache openclaw
docker compose up -d

# Validate:
./scripts/validate-agent.sh coder
```

## How It Works

Clawe uses a **base template system** — shared templates generate most workspace files, while each agent only needs a unique `SOUL.md`.

### Template Structure

```
docker/openclaw/templates/
├── base/                    # Shared templates (with ${AGENT_ID}, ${AGENT_NAME}, etc.)
│   ├── lead/                # For squad lead agents
│   │   ├── AGENTS.md
│   │   ├── BOOTSTRAP.md
│   │   ├── HEARTBEAT.md
│   │   ├── MEMORY.md
│   │   ├── TOOLS.md
│   │   └── USER.md
│   └── worker/              # For specialist agents
│       ├── AGENTS.md
│       ├── HEARTBEAT.md
│       ├── MEMORY.md
│       ├── TOOLS.md
│       └── USER.md
└── workspaces/              # Agent-specific files (SOUL.md only)
    ├── main/
    │   └── SOUL.md          # Clawe's unique identity
    ├── inky/
    │   └── SOUL.md          # Inky's unique identity
    ├── pixel/
    │   └── SOUL.md
    └── scout/
        └── SOUL.md
```

### Template Variables

Base templates use these variables (replaced by `envsubst` at init time):

| Variable         | Example          | Description      |
| ---------------- | ---------------- | ---------------- |
| `${AGENT_ID}`    | `inky`           | Agent identifier |
| `${AGENT_NAME}`  | `Inky`           | Display name     |
| `${AGENT_EMOJI}` | `✍️`             | Agent emoji      |
| `${AGENT_ROLE}`  | `Content Writer` | Role description |

### Agent Types

- **lead** — Squad coordinator. Gets BOOTSTRAP.md, review-focused HEARTBEAT.md, squad management instructions.
- **worker** — Specialist. Gets task-focused HEARTBEAT.md, worker instructions, review warning.

New agents added via `add-agent.sh` are always type `worker`. To add a new lead, edit `init-agents.sh` manually.

## What the Script Does

`add-agent.sh` automatically:

1. Creates `workspaces/<id>/SOUL.md` with a starter template
2. Adds `init_agent` call to `init-agents.sh`
3. Adds agent to `config.template.json` (agents list + allow list)

After rebuilding, use `clawe agent:onboard` to register the agent at runtime (Convex + cron).

## Overriding Base Templates

If an agent needs a custom version of any base file, just add it to their workspace folder:

```
workspaces/pixel/
├── SOUL.md          # Always required (unique)
└── TOOLS.md         # Optional override (replaces base/worker/TOOLS.md)
```

Agent-specific files are copied **after** base templates, so they override.

## Heartbeat Schedule Convention

Stagger heartbeats to avoid rate limits:

| Agent  | Cron Schedule         | Minutes            |
| ------ | --------------------- | ------------------ |
| Clawe  | `0 * * * *`           | :00 (hourly)       |
| Inky   | `3,18,33,48 * * * *`  | :03, :18, :33, :48 |
| Pixel  | `7,22,37,52 * * * *`  | :07, :22, :37, :52 |
| Scout  | `11,26,41,56 * * * *` | :11, :26, :41, :56 |
| (next) | `15,30,45,0 * * * *`  | :15, :30, :45, :00 |

## Validation

```bash
./scripts/validate-agent.sh <agent-id>
```

Checks:

- Workspace template exists with SOUL.md
- Base templates exist for agent type
- Agent in init-agents.sh
- Agent in config.template.json (agents list + allow list)
- Runtime checks (if Docker is running)

## Removing an Agent

1. Delete workspace: `rm -rf docker/openclaw/templates/workspaces/<id>/`
2. Remove `init_agent` line from `docker/openclaw/scripts/init-agents.sh`
3. Remove from `docker/openclaw/templates/config.template.json`
4. Rebuild: `docker compose build --no-cache openclaw && docker compose up -d`
