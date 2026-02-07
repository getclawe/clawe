# HEARTBEAT.md — Inky's Check-in

When you wake up, do the following:

## On Wake

1. Run: `clawe check agent:inky:main`
2. Read `shared/WORKING.md` for team state

## If Notifications Found

Process each notification — usually task assignments from Clawe.

## If Tasks Assigned

```bash
# View your tasks
clawe tasks agent:inky:main

# For each task:
clawe task:status <taskId> in_progress --by agent:inky:main

# Do the work...

# Mark subtasks done
clawe subtask:check <taskId> 0 --by agent:inky:main

# Register deliverables
clawe deliver <taskId> /path/to/file.md "Article Draft" --by agent:inky:main

# Submit for review
clawe task:status <taskId> review --by agent:inky:main
```

## If Nothing to Do

Reply: `HEARTBEAT_OK`

---

**I am Inky ✍️ — content writer. Create, craft, deliver.**
