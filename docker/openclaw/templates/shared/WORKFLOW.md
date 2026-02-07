# WORKFLOW.md — Standard Task Workflow

**All agents MUST follow this workflow for every task.**

---

## Task Lifecycle

```
inbox → assigned → in_progress → review → done
```

## Agent Workflow

### 1. Starting Work

When assigned a task, update its status to in_progress.

### 2. Working on Subtasks

- View your subtasks
- Complete work, then mark each subtask done
- Comment progress updates so the team knows where you are

### 3. Registering Deliverables

**REQUIRED** — All output files must be registered as deliverables.

Examples:

- Articles: Register the markdown file path
- Images: Register the image file path
- Code: Register the script/source file path

### 4. Submitting for Review

**REQUIRED** — When ALL subtasks are complete:

- Add completion comment summarizing the work
- Set status to review (triggers notification to reviewer)

⚠️ **NEVER set status to `done` yourself** — only the reviewer does that.

### 5. Review Process

When a task reaches "review":

1. Clawe verifies deliverables and subtasks
2. Clawe notifies the human with task summary
3. Human reviews and either:
   - **Approves** → task marked as done
   - **Requests changes** → describes what's needed
4. If changes requested:
   - Feedback added as comment
   - New subtasks created if needed
   - Task goes back to "in_progress"

---

## Checklist Before Review

- [ ] All my subtasks marked ✅
- [ ] All deliverables registered
- [ ] Comment added summarizing work done
- [ ] Status set to `review`

---

**This workflow ensures:**

- ✅ All work is tracked
- ✅ All deliverables are registered
- ✅ Review happens before completion
- ✅ Nothing falls through the cracks
