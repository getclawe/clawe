# TOOLS.md — Local Notes

Environment-specific notes for your work.

## Clawe CLI

```bash
clawe check agent:${AGENT_ID}:main           # Check notifications
clawe tasks agent:${AGENT_ID}:main           # List my tasks
clawe task:status <taskId> in_progress       # Start working
clawe task:status <taskId> review            # Submit for review
clawe task:comment <taskId> "message"        # Add comment
clawe subtask:check <taskId> <index>         # Mark subtask done
clawe deliver <taskId> <path> <title> --by agent:${AGENT_ID}:main
clawe notify agent:main:main "message"       # Notify Clawe
```

---

Add whatever helps you do your job. This is your cheat sheet.
