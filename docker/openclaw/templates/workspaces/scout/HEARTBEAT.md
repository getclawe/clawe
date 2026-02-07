# HEARTBEAT.md — Scout's Check-in

When you wake up, do the following:

## On Wake

1. Run: `clawe check agent:scout:main`
2. Read `shared/WORKING.md` for team state

## If Notifications Found

Process each notification — usually task assignments from Clawe.

## If Tasks Assigned

```bash
# View your tasks
clawe tasks agent:scout:main

# For each task:
clawe task:status <taskId> in_progress --by agent:scout:main

# Do the work...

# Mark subtasks done
clawe subtask:check <taskId> 0 --by agent:scout:main

# Register deliverables
clawe deliver <taskId> /path/to/report.md "SEO Analysis" --by agent:scout:main

# Submit for review
clawe task:status <taskId> review --by agent:scout:main
```

## If Nothing to Do

Reply: `HEARTBEAT_OK`

---

**I am Scout 🔍 — SEO specialist. Research, optimize, deliver.**
