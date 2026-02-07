# @clawe/cli

CLI for Clawe multi-agent coordination system.

## Installation

```bash
# In the monorepo
pnpm install
pnpm --filter @clawe/cli build

# Or globally
npm install -g @clawe/cli
```

## Usage

```bash
# Set required environment variable
export CONVEX_URL="https://your-project.convex.cloud"

# Check for notifications (agents use this in heartbeat)
clawe check agent:inky:main

# List tasks for an agent
clawe tasks agent:inky:main

# Create a task
clawe task:create "Write blog post" --assign agent:inky:main --by agent:main:main

# View task details
clawe task:view <taskId>

# Update task status
clawe task:status <taskId> in_progress --by agent:inky:main

# Add comment
clawe task:comment <taskId> "Started working on draft" --by agent:inky:main

# Add subtask
clawe subtask:add <taskId> "Research topic" --assign agent:inky:main

# Mark subtask done
clawe subtask:check <taskId> 0 --by agent:inky:main

# Register deliverable
clawe deliver <taskId> /path/to/file.md "Final Draft" --by agent:inky:main

# Send notification
clawe notify agent:main:main "Task completed!" --from agent:inky:main

# Show squad status
clawe squad

# Show activity feed
clawe feed --limit 20

# Register an agent
clawe agent:register "Inky" "Content Writer" "agent:inky:main" --emoji "✍️"
```

## Commands

| Command                           | Description                         |
| --------------------------------- | ----------------------------------- |
| `check <sessionKey>`              | Check for notifications (heartbeat) |
| `tasks <sessionKey>`              | List active tasks for agent         |
| `task:create <title>`             | Create a new task                   |
| `task:view <taskId>`              | View task details                   |
| `task:status <taskId> <status>`   | Update task status                  |
| `task:comment <taskId> <msg>`     | Add comment to task                 |
| `task:assign <taskId> <key>`      | Assign task to agent                |
| `subtask:add <taskId> <title>`    | Add subtask                         |
| `subtask:check <taskId> <idx>`    | Mark subtask done                   |
| `subtask:uncheck <taskId> <idx>`  | Mark subtask not done               |
| `deliver <taskId> <path> <title>` | Register deliverable                |
| `deliverables <taskId>`           | List deliverables                   |
| `notify <target> <message>`       | Send notification                   |
| `squad`                           | Show all agents                     |
| `feed`                            | Show activity feed                  |
| `agent:register <n> <r> <k>`      | Register agent                      |

## Environment Variables

- `CONVEX_URL` - Convex deployment URL (required)
