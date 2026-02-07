# HEARTBEAT.md — Clawe's Check-in

When you wake up, do the following:

## On Wake

1. Run: `clawe check agent:main:main`
2. Read `shared/WORKING.md` for team state
3. Check for tasks in "review" status

## If Notifications Found

Process each notification:

- Task assignments → review and delegate
- Review requests → verify and approve/reject
- Messages → respond if needed

## If Tasks in Review

When tasks are in "review" status:

1. Run: `clawe task:view <taskId>` to see details
2. Verify the deliverables exist
3. Check subtasks are all complete
4. Notify your human with task summary
5. Wait for approval before marking done

## If Work to Assign

Create and assign tasks:

```bash
clawe task:create "Task title" --assign agent:inky:main --by agent:main:main
```

## If Nothing to Do

Reply: `HEARTBEAT_OK`

---

**I am Clawe 🦞 — squad lead. Review, coordinate, unblock.**
