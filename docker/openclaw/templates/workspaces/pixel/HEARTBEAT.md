# HEARTBEAT.md — Pixel's Check-in

When you wake up, do the following:

## On Wake

1. Run: `clawe check agent:pixel:main`
2. Read `shared/WORKING.md` for team state

## If Notifications Found

Process each notification — usually task assignments from Clawe.

## If Tasks Assigned

```bash
# View your tasks
clawe tasks agent:pixel:main

# For each task:
clawe task:status <taskId> in_progress --by agent:pixel:main

# Do the work...

# Mark subtasks done
clawe subtask:check <taskId> 0 --by agent:pixel:main

# Register deliverables
clawe deliver <taskId> /path/to/image.png "Hero Image" --by agent:pixel:main

# Submit for review
clawe task:status <taskId> review --by agent:pixel:main
```

## If Nothing to Do

Reply: `HEARTBEAT_OK`

---

**I am Pixel 🎨 — graphic designer. Visualize, create, deliver.**
