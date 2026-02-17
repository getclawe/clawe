import { ConvexHttpClient } from "convex/browser";
import { api } from "@clawe/backend";
import {
  cronList,
  cronAdd,
  checkHealth,
  type SquadhubConnection,
  type CronAddJob,
  type CronJob,
} from "@clawe/shared/squadhub";

/**
 * Default agent definitions for new tenants.
 */
const DEFAULT_AGENTS = [
  {
    id: "main",
    name: "Clawe",
    emoji: "\u{1F99E}",
    role: "Squad Lead",
    cron: "0,15,30,45 * * * *",
  },
  {
    id: "inky",
    name: "Inky",
    emoji: "\u270D\uFE0F",
    role: "Writer",
    cron: "3,18,33,48 * * * *",
  },
  {
    id: "pixel",
    name: "Pixel",
    emoji: "\u{1F3A8}",
    role: "Designer",
    cron: "7,22,37,52 * * * *",
  },
  {
    id: "scout",
    name: "Scout",
    emoji: "\u{1F50D}",
    role: "SEO",
    cron: "11,26,41,56 * * * *",
  },
];

const HEARTBEAT_MESSAGE =
  "Read HEARTBEAT.md and follow it strictly. Check for notifications with 'clawe check'. If nothing needs attention, reply HEARTBEAT_OK.";

/**
 * Default routines seeded for new tenants.
 */
const SEED_ROUTINES = [
  {
    title: "Weekly Performance Review",
    description:
      "Review last week's content performance, engagement metrics, and campaign results. Identify top-performing pieces and areas for improvement.",
    priority: "normal" as const,
    schedule: { type: "weekly" as const, daysOfWeek: [1], hour: 9, minute: 0 },
    color: "emerald",
  },
  {
    title: "Morning Brief",
    description: "Prepare daily morning brief for the team",
    priority: "high" as const,
    schedule: {
      type: "weekly" as const,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      hour: 8,
      minute: 0,
    },
    color: "amber",
  },
  {
    title: "Competitor Scan",
    description: "Scan competitor activities and updates",
    priority: "normal" as const,
    schedule: {
      type: "weekly" as const,
      daysOfWeek: [1, 4],
      hour: 10,
      minute: 0,
    },
    color: "rose",
  },
];

type ProvisionResult = {
  agents: number;
  crons: number;
  routines: number;
  errors: string[];
};

/**
 * Register default agents in Convex.
 */
async function registerAgents(convex: ConvexHttpClient): Promise<{
  count: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let count = 0;

  for (const agent of DEFAULT_AGENTS) {
    const sessionKey = `agent:${agent.id}:main`;
    try {
      await convex.mutation(api.agents.upsert, {
        name: agent.name,
        role: agent.role,
        sessionKey,
        emoji: agent.emoji,
      });
      count++;
    } catch (err) {
      errors.push(
        `Failed to register ${agent.name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { count, errors };
}

/**
 * Setup heartbeat cron jobs on the squadhub gateway.
 */
async function setupCrons(connection: SquadhubConnection): Promise<{
  count: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let count = 0;

  const result = await cronList(connection);
  if (!result.ok) {
    return {
      count: 0,
      errors: [`Failed to list crons: ${result.error?.message}`],
    };
  }

  const existingNames = new Set(
    result.result.details.jobs.map((j: CronJob) => j.name),
  );

  for (const agent of DEFAULT_AGENTS) {
    const cronName = `${agent.id}-heartbeat`;

    if (existingNames.has(cronName)) {
      count++;
      continue;
    }

    const job: CronAddJob = {
      name: cronName,
      agentId: agent.id,
      enabled: true,
      schedule: { kind: "cron", expr: agent.cron },
      sessionTarget: "isolated",
      payload: {
        kind: "agentTurn",
        message: HEARTBEAT_MESSAGE,
        model: "anthropic/claude-sonnet-4-20250514",
        timeoutSeconds: 600,
      },
      delivery: { mode: "none" },
    };

    const addResult = await cronAdd(connection, job);
    if (addResult.ok) {
      count++;
    } else {
      errors.push(`Failed to add ${cronName}: ${addResult.error?.message}`);
    }
  }

  return { count, errors };
}

/**
 * Seed default routines if none exist.
 */
async function seedRoutines(convex: ConvexHttpClient): Promise<{
  count: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let count = 0;

  const existing = await convex.query(api.routines.list, {});
  if (existing.length > 0) {
    return { count: existing.length, errors: [] };
  }

  for (const routine of SEED_ROUTINES) {
    try {
      await convex.mutation(api.routines.create, routine);
      count++;
    } catch (err) {
      errors.push(
        `Failed to create routine "${routine.title}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { count, errors };
}

/**
 * Run full tenant provisioning setup:
 * 1. Wait for squadhub to be healthy
 * 2. Register default agents in Convex
 * 3. Setup heartbeat cron jobs on squadhub
 * 4. Seed default routines in Convex
 */
export async function setupTenant(
  connection: SquadhubConnection,
  convexUrl: string,
  authToken?: string,
): Promise<ProvisionResult> {
  const convex = new ConvexHttpClient(convexUrl);
  if (authToken) {
    convex.setAuth(authToken);
  }
  const allErrors: string[] = [];

  // Check squadhub is reachable
  const health = await checkHealth(connection);
  if (!health.ok) {
    return {
      agents: 0,
      crons: 0,
      routines: 0,
      errors: [`Squadhub not reachable: ${health.error?.message}`],
    };
  }

  // Register agents
  const agentResult = await registerAgents(convex);
  allErrors.push(...agentResult.errors);

  // Setup crons
  const cronResult = await setupCrons(connection);
  allErrors.push(...cronResult.errors);

  // Seed routines
  const routineResult = await seedRoutines(convex);
  allErrors.push(...routineResult.errors);

  return {
    agents: agentResult.count,
    crons: cronResult.count,
    routines: routineResult.count,
    errors: allErrors,
  };
}
