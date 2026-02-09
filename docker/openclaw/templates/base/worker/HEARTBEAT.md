# HEARTBEAT.md — ${AGENT_NAME}'s Check-in

When you wake up, do the following:

## On Wake

1. Run: `clawe check agent:${AGENT_ID}:main`
2. Read `shared/WORKING.md` for team state

## If Notifications Found

Process each notification — usually task assignments from Clawe.

## If Tasks Assigned

```bash
# View your tasks
clawe tasks agent:${AGENT_ID}:main

# For each task:
clawe task:status <taskId> in_progress --by agent:${AGENT_ID}:main

# Do the work...

# Mark subtasks done
clawe subtask:check <taskId> 0 --by agent:${AGENT_ID}:main

# Register deliverables
clawe deliver <taskId> /path/to/file "Deliverable Title" --by agent:${AGENT_ID}:main

# Submit for review
clawe task:status <taskId> review --by agent:${AGENT_ID}:main
```

⚠️ **NEVER submit for review with incomplete subtasks!**

## If Nothing to Do

Reply: `HEARTBEAT_OK`

---

**I am ${AGENT_NAME} ${AGENT_EMOJI} — ${AGENT_ROLE}.**
