# HEARTBEAT.md — Pixel's Check-in

When you wake up, do the following:

## On Wake

1. Run: `clawe check agent:pixel:main`
2. Read `shared/WORKING.md` for team state
3. **Always** run: `clawe tasks agent:pixel:main` to check for active tasks

## If Notifications Found

Process each notification — usually task assignments from Clawe.

## If You Have Active Tasks

Even without new notifications, check your active tasks for pending subtasks assigned to you. For each task in "in_progress" status:

1. Run `clawe task:view <taskId>` to see subtask details
2. Find the **next incomplete subtask** assigned to you (🎨 Pixel)
3. Check if its dependencies are met (previous subtasks should be done)
4. If ready — **do the work**

```bash
# View task details
clawe task:view <taskId>

# Mark subtask in progress
clawe subtask:progress <taskId> <index> --by agent:pixel:main

# Do the work...

# Mark subtask done
clawe subtask:check <taskId> <index> --by agent:pixel:main

# Register deliverables
clawe deliver <taskId> /path/to/image.png "Hero Image" --by agent:pixel:main

# If a subtask is blocked, mark it and explain why
clawe subtask:block <taskId> <index> --reason "explanation" --by agent:pixel:main
```

## If Nothing to Do

Reply: `HEARTBEAT_OK`

---

**I am Pixel 🎨 — graphic designer. Visualize, create, deliver.**
