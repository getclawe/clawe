# CLAWE-CLI.md — Squad Communication

The `clawe` CLI is how you coordinate with other agents.

**IMPORTANT: Use the clawe CLI for ALL inter-agent communication. Never communicate with other agents in any other way — no writing to shared files to "leave messages", no other tools, no workarounds. The CLI is the only supported method.**

## Getting Help

```bash
clawe --help
```

Run this anytime to see all available commands and options.

## Your Identity

Every command needs to know who you are. Use your session key:

| Agent | Session Key        |
| ----- | ------------------ |
| Clawe | `agent:main:main`  |
| Inky  | `agent:inky:main`  |
| Pixel | `agent:pixel:main` |
| Scout | `agent:scout:main` |

---

## Communication Commands

### Send a Direct Message

```bash
clawe notify <targetSessionKey> "<message>" --from <yourSessionKey>
```

Example:

```bash
clawe notify agent:inky:main "Please write a blog post about AI agents" --from agent:main:main
```

### Check Your Notifications

```bash
clawe check <yourSessionKey>
```

---

## Task Management

### See Your Tasks

```bash
clawe tasks <yourSessionKey>
```

### Create a Task

```bash
clawe task:create "<title>" --assign <assigneeSessionKey> --by <yourSessionKey>
```

Options:

- `--assign` — Who should do it
- `--by` — Who created it (you)
- `--priority` — `low`, `normal`, `high`, or `urgent`
- `--description` — Task description with context

Example:

```bash
clawe task:create "Write blog post about AI teams" --assign agent:inky:main --by agent:main:main --priority high --description "2000 words, practical focus"
```

### Plan a Full Task (Recommended)

Create a task with description + subtasks + assignments in one shot:

```bash
clawe task:plan '<json>'
```

Example:

```bash
clawe task:plan '{
  "title": "Blog Post: AI Agent Teams",
  "description": "Write a 2000-word post about multi-agent coordination. Target: developers. Tone: practical.",
  "priority": "high",
  "assignee": "agent:inky:main",
  "by": "agent:main:main",
  "subtasks": [
    { "title": "Research topic", "assign": "agent:scout:main" },
    { "title": "Write first draft (2000 words)" },
    { "title": "SEO optimization", "assign": "agent:scout:main" },
    { "title": "Create hero image", "assign": "agent:pixel:main" }
  ]
}'
```

This creates the task, all subtasks, assigns agents, and sends notifications — all atomically.

### View Task Details

```bash
clawe task:view <taskId>
```

### Update Task Status

```bash
clawe task:status <taskId> <status> --by <yourSessionKey>
```

Statuses: `pending`, `in_progress`, `in_review`, `completed`, `blocked`

### Comment on a Task

```bash
clawe task:comment <taskId> "<message>" --by <yourSessionKey>
```

### Assign/Reassign a Task

```bash
clawe task:assign <taskId> <newAssigneeSessionKey> --by <yourSessionKey>
```

---

## Subtasks

### Add a Subtask

```bash
clawe subtask:add <taskId> "<title>" --assign <sessionKey>
```

### Mark Subtask Complete

```bash
clawe subtask:check <taskId> <index> --by <yourSessionKey>
```

---

## Deliverables

### Register a Deliverable

When you complete work, register what you produced:

```bash
clawe deliver <taskId> "<filepath>" "<title>" --by <yourSessionKey>
```

Example:

```bash
clawe deliver abc123 "/data/workspace/blog/ai-teams.md" "AI Teams Blog Post" --by agent:inky:main
```

### List Deliverables

```bash
clawe deliverables <taskId>
```

---

## Squad Status

### See Who's Available

```bash
clawe squad
```

### Activity Feed

```bash
clawe feed --limit 20
```

---

## Business Context

The business context contains information about the website/business the squad is working for. This helps you understand the context, tone, and target audience for your work.

### Get Business Context

Any agent can read the business context:

```bash
clawe business:get
```

Returns JSON with:

- `url` — The business website URL
- `name` — Business name
- `description` — What the business does
- `metadata` — Additional info (industry, target audience, tone, etc.)

**Always check the business context before starting work on content, design, or SEO tasks.**

### Set Business Context (Clawe Only)

Only Clawe should update the business context during onboarding:

```bash
clawe business:set "<url>" --name "<name>" --description "<desc>" --approve --remove-bootstrap
```

Options:

- `--name` — Business name
- `--description` — What the business does
- `--metadata` — Additional metadata as JSON
- `--approve` — Mark as approved
- `--remove-bootstrap` — Remove BOOTSTRAP.md after saving

---

## Quick Reference

| Action           | Command                                                |
| ---------------- | ------------------------------------------------------ |
| Message someone  | `clawe notify <target> "<msg>" --from <me>`            |
| Check messages   | `clawe check <me>`                                     |
| My tasks         | `clawe tasks <me>`                                     |
| Create task      | `clawe task:create "<title>" --assign <who> --by <me>` |
| Plan full task   | `clawe task:plan '<json>'`                             |
| Update status    | `clawe task:status <id> <status> --by <me>`            |
| Comment          | `clawe task:comment <id> "<msg>" --by <me>`            |
| Squad status     | `clawe squad`                                          |
| Business context | `clawe business:get`                                   |
