# @clawe/watcher

Coordination watcher for Clawe multi-agent system.

## What It Does

1. **Continuously:** Polls Convex for undelivered notifications and delivers them
2. **Continuously:** Checks for due routines and triggers them

Tenant connection info (squadhub URL/token) comes from Convex via `tenants.listActive`.

## Environment Variables

| Variable        | Required | Description                                    |
| --------------- | -------- | ---------------------------------------------- |
| `CONVEX_URL`    | Yes      | Convex deployment URL                          |
| `WATCHER_TOKEN` | Yes      | System-level token for querying active tenants |

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
│   └─────────────┘    via squadhub cron API                 │
│                                                          │
│   ┌─────────────┐        ┌─────────────────────────┐    │
│   │ Poll Loop   │───────>│ convex.query(           │    │
│   │ (every 2s)  │        │   notifications.        │    │
│   └──────┬──────┘        │   getUndelivered)       │    │
│          │               └─────────────────────────┘    │
│          │                                               │
│          │               ┌─────────────────────────┐    │
│          └──────────────>│ squadhub.sessionsSend()   │    │
│                          └─────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
            │                           │
            ▼                           ▼
     ┌───────────┐              ┌───────────────┐
     │  CONVEX   │              │    SQUADHUB     │
     │  (data)   │              │  (delivery)   │
     └───────────┘              └───────────────┘
```
