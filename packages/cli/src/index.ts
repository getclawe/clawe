import { check } from "./commands/check.js";
import { tasks } from "./commands/tasks.js";
import { taskCreate } from "./commands/task-create.js";
import { taskView } from "./commands/task-view.js";
import { taskStatus } from "./commands/task-status.js";
import { taskComment } from "./commands/task-comment.js";
import { taskAssign } from "./commands/task-assign.js";
import { subtaskAdd } from "./commands/subtask-add.js";
import { subtaskCheck, subtaskUncheck } from "./commands/subtask-check.js";
import { deliver, deliverables } from "./commands/deliver.js";
import { notify } from "./commands/notify.js";
import { squad } from "./commands/squad.js";
import { feed } from "./commands/feed.js";
import { agentRegister } from "./commands/agent-register.js";

const args = process.argv.slice(2);
const command = args[0];

function parseOptions(args: string[]): Record<string, string> {
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value =
        args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "true";
      options[key] = value;
      if (value !== "true") i++;
    }
  }
  return options;
}

function getPositionalArgs(args: string[]): string[] {
  return args.filter((arg) => !arg.startsWith("--"));
}

function printHelp(): void {
  console.log(`Clawe CLI - Multi-agent coordination

Commands:
  clawe check <sessionKey>              Check for notifications (heartbeat)
  clawe tasks <sessionKey>              List my active tasks
  clawe task:create <title> [opts]      Create a task
      --assign <sessionKey>             Assign to agent
      --by <sessionKey>                 Created by agent
      --priority <low|normal|high|urgent>
  clawe task:view <taskId>              View full task details
  clawe task:status <taskId> <status>   Update task status
      --by <sessionKey>                 Updated by agent
  clawe task:comment <taskId> <msg>     Comment on task
      --by <sessionKey>                 Comment author
  clawe task:assign <taskId> <sessionKey> Assign task
      --by <sessionKey>                 Assigned by
  clawe subtask:add <taskId> <title>    Add a subtask
      --assign <sessionKey>             Assign to agent
      --description <text>              Subtask description
  clawe subtask:check <taskId> <index>  Mark subtask done
      --by <sessionKey>                 Completed by
  clawe subtask:uncheck <taskId> <idx>  Mark subtask not done
  clawe deliver <taskId> <path> <title> Register a deliverable
      --by <sessionKey>                 Created by (required)
  clawe deliverables <taskId>           List deliverables for a task
  clawe notify <target> <message>       Send notification
      --from <sessionKey>               From agent
  clawe squad                           Show squad status
  clawe feed [--limit N]                Show activity feed
  clawe agent:register <name> <role> <sessionKey>
      --emoji <emoji>                   Agent emoji

Environment:
  CONVEX_URL    Convex deployment URL (required)
`);
}

async function main(): Promise<void> {
  if (!command || command === "help" || command === "--help") {
    printHelp();
    process.exit(0);
  }

  const positionalArgs = getPositionalArgs(args.slice(1));
  const options = parseOptions(args.slice(1));

  try {
    switch (command) {
      case "check": {
        const sessionKey = positionalArgs[0];
        if (!sessionKey) {
          console.error("Usage: clawe check <sessionKey>");
          process.exit(1);
        }
        await check(sessionKey);
        break;
      }

      case "tasks": {
        const sessionKey = positionalArgs[0];
        if (!sessionKey) {
          console.error("Usage: clawe tasks <sessionKey>");
          process.exit(1);
        }
        await tasks(sessionKey);
        break;
      }

      case "task:create": {
        const title = positionalArgs[0];
        if (!title) {
          console.error(
            "Usage: clawe task:create <title> [--assign <key>] [--by <key>]",
          );
          process.exit(1);
        }
        await taskCreate(title, {
          assign: options.assign,
          by: options.by,
          priority: options.priority as
            | "low"
            | "normal"
            | "high"
            | "urgent"
            | undefined,
        });
        break;
      }

      case "task:view": {
        const taskId = positionalArgs[0];
        if (!taskId) {
          console.error("Usage: clawe task:view <taskId>");
          process.exit(1);
        }
        await taskView(taskId);
        break;
      }

      case "task:status": {
        const taskId = positionalArgs[0];
        const status = positionalArgs[1];
        if (!taskId || !status) {
          console.error(
            "Usage: clawe task:status <taskId> <status> [--by <key>]",
          );
          process.exit(1);
        }
        await taskStatus(taskId, status, { by: options.by });
        break;
      }

      case "task:comment": {
        const taskId = positionalArgs[0];
        const message = positionalArgs[1];
        if (!taskId || !message) {
          console.error(
            "Usage: clawe task:comment <taskId> <message> [--by <key>]",
          );
          process.exit(1);
        }
        await taskComment(taskId, message, { by: options.by });
        break;
      }

      case "task:assign": {
        const taskId = positionalArgs[0];
        const assignee = positionalArgs[1];
        if (!taskId || !assignee) {
          console.error(
            "Usage: clawe task:assign <taskId> <sessionKey> [--by <key>]",
          );
          process.exit(1);
        }
        await taskAssign(taskId, assignee, { by: options.by });
        break;
      }

      case "subtask:add": {
        const taskId = positionalArgs[0];
        const title = positionalArgs[1];
        if (!taskId || !title) {
          console.error(
            "Usage: clawe subtask:add <taskId> <title> [--assign <key>]",
          );
          process.exit(1);
        }
        await subtaskAdd(taskId, title, {
          assign: options.assign,
          description: options.description,
        });
        break;
      }

      case "subtask:check": {
        const taskId = positionalArgs[0];
        const index = positionalArgs[1];
        if (!taskId || !index) {
          console.error(
            "Usage: clawe subtask:check <taskId> <index> [--by <key>]",
          );
          process.exit(1);
        }
        await subtaskCheck(taskId, index, { by: options.by });
        break;
      }

      case "subtask:uncheck": {
        const taskId = positionalArgs[0];
        const index = positionalArgs[1];
        if (!taskId || !index) {
          console.error(
            "Usage: clawe subtask:uncheck <taskId> <index> [--by <key>]",
          );
          process.exit(1);
        }
        await subtaskUncheck(taskId, index, { by: options.by });
        break;
      }

      case "deliver": {
        const taskId = positionalArgs[0];
        const path = positionalArgs[1];
        const title = positionalArgs[2];
        if (!taskId || !path || !title || !options.by) {
          console.error(
            "Usage: clawe deliver <taskId> <path> <title> --by <sessionKey>",
          );
          process.exit(1);
        }
        await deliver(taskId, path, title, { by: options.by });
        break;
      }

      case "deliverables": {
        const taskId = positionalArgs[0];
        if (!taskId) {
          console.error("Usage: clawe deliverables <taskId>");
          process.exit(1);
        }
        await deliverables(taskId);
        break;
      }

      case "notify": {
        const target = positionalArgs[0];
        const message = positionalArgs[1];
        if (!target || !message) {
          console.error(
            "Usage: clawe notify <targetSessionKey> <message> [--from <key>]",
          );
          process.exit(1);
        }
        await notify(target, message, { from: options.from });
        break;
      }

      case "squad": {
        await squad();
        break;
      }

      case "feed": {
        await feed({
          limit: options.limit ? parseInt(options.limit, 10) : undefined,
        });
        break;
      }

      case "agent:register": {
        const name = positionalArgs[0];
        const role = positionalArgs[1];
        const sessionKey = positionalArgs[2];
        if (!name || !role || !sessionKey) {
          console.error(
            "Usage: clawe agent:register <name> <role> <sessionKey> [--emoji <e>]",
          );
          process.exit(1);
        }
        await agentRegister(name, role, sessionKey, { emoji: options.emoji });
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run 'clawe help' for usage.");
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
