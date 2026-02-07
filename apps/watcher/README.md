# @clawe/watcher

Coordination watcher for Clawe multi-agent system.

## What It Does

1. **On startup:** Registers all agents in Convex (upsert)
2. **On startup:** Ensures heartbeat crons are configured for all agents
3. **Continuously:** Polls Convex for undelivered notifications and delivers them

This enables:

- Automatic agent heartbeat scheduling (no manual cron setup needed)
- Near-instant notification delivery without waiting for heartbeats

## Environment Variables

| Variable         | Required | Description                   |
| ---------------- | -------- | ----------------------------- |
| `CONVEX_URL`     | Yes      | Convex deployment URL         |
| `OPENCLAW_URL`   | Yes      | OpenClaw gateway URL          |
| `OPENCLAW_TOKEN` | Yes      | OpenClaw authentication token |

## Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Agent Heartbeats

The watcher configures these heartbeat schedules on startup:

| Agent    | Schedule              | Description       |
| -------- | --------------------- | ----------------- |
| Clawe 🦞 | `0 * * * *`           | Every hour at :00 |
| Inky ✍️  | `3,18,33,48 * * * *`  | Every 15 min      |
| Pixel 🎨 | `7,22,37,52 * * * *`  | Every 15 min      |
| Scout 🔍 | `11,26,41,56 * * * *` | Every 15 min      |

Schedules are staggered to avoid rate limits.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    WATCHER                               │
│                                                          │
│   ┌─────────────┐                                        │
│   │ On Startup  │──> Check/create heartbeat crons        │
│   └─────────────┘    via OpenClaw cron API               │
│                                                          │
│   ┌─────────────┐        ┌─────────────────────────┐    │
│   │ Poll Loop   │───────>│ convex.query(           │    │
│   │ (every 2s)  │        │   notifications.        │    │
│   └──────┬──────┘        │   getUndelivered)       │    │
│          │               └─────────────────────────┘    │
│          │                                               │
│          │               ┌─────────────────────────┐    │
│          └──────────────>│ openclaw.sessionsSend() │    │
│                          └─────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
            │                           │
            ▼                           ▼
     ┌───────────┐              ┌───────────────┐
     │  CONVEX   │              │   OPENCLAW    │
     │  (data)   │              │  (delivery)   │
     └───────────┘              └───────────────┘
```
