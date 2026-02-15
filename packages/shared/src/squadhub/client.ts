import axios from "axios";
import type {
  ToolResult,
  ConfigGetResult,
  ConfigPatchResult,
  SessionsListResult,
  GatewayHealthResult,
  TelegramProbeResult,
} from "./types";

export type SquadhubConnection = {
  squadhubUrl: string;
  squadhubToken: string;
};

function createClient(connection: SquadhubConnection) {
  return axios.create({
    baseURL: connection.squadhubUrl,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${connection.squadhubToken}`,
    },
  });
}

async function invokeTool<T>(
  connection: SquadhubConnection,
  tool: string,
  action?: string,
  args?: Record<string, unknown>,
): Promise<ToolResult<T>> {
  try {
    const client = createClient(connection);
    const { data } = await client.post("/tools/invoke", {
      tool,
      action,
      args,
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        ok: false,
        error: {
          type: "http_error",
          message: `HTTP ${error.response.status}: ${error.response.statusText}`,
        },
      };
    }
    return {
      ok: false,
      error: {
        type: "network_error",
        message: "Network error",
      },
    };
  }
}

export async function checkHealth(
  connection: SquadhubConnection,
): Promise<ToolResult<GatewayHealthResult>> {
  try {
    const client = createClient(connection);
    const { data } = await client.post("/tools/invoke", {
      tool: "sessions_list",
      action: "json",
    });

    if (data.ok) {
      return { ok: true, result: data.result };
    }

    return {
      ok: false,
      error: { type: "unhealthy", message: "Gateway unhealthy" },
    };
  } catch {
    return {
      ok: false,
      error: { type: "unreachable", message: "Gateway unreachable" },
    };
  }
}

// Telegram Configuration
export async function saveTelegramBotToken(
  connection: SquadhubConnection,
  botToken: string,
): Promise<ToolResult<ConfigPatchResult>> {
  return patchConfig(connection, {
    channels: {
      telegram: {
        enabled: true,
        botToken,
        dmPolicy: "pairing",
      },
    },
  });
}

export async function removeTelegramBotToken(
  connection: SquadhubConnection,
): Promise<ToolResult<ConfigPatchResult>> {
  return patchConfig(connection, {
    channels: {
      telegram: {
        enabled: false,
        botToken: null,
      },
    },
  });
}

// Probe Telegram bot token directly via Telegram API
export async function probeTelegramToken(
  botToken: string,
): Promise<TelegramProbeResult> {
  try {
    const { data } = await axios.get(
      `https://api.telegram.org/bot${botToken}/getMe`,
    );

    if (data.ok && data.result) {
      return {
        ok: true,
        bot: {
          id: data.result.id,
          username: data.result.username,
          canJoinGroups: data.result.can_join_groups,
          canReadAllGroupMessages: data.result.can_read_all_group_messages,
        },
      };
    }

    return {
      ok: false,
      error: data.description || "Invalid bot token",
    };
  } catch {
    return {
      ok: false,
      error: "Failed to connect to Telegram API",
    };
  }
}

// Configuration
export async function getConfig(
  connection: SquadhubConnection,
): Promise<ToolResult<ConfigGetResult>> {
  return invokeTool(connection, "gateway", "config.get");
}

export async function patchConfig(
  connection: SquadhubConnection,
  config: Record<string, unknown>,
  baseHash?: string,
): Promise<ToolResult<ConfigPatchResult>> {
  return invokeTool(connection, "gateway", "config.patch", {
    raw: JSON.stringify(config),
    baseHash,
  });
}

// Sessions
export async function listSessions(
  connection: SquadhubConnection,
  activeMinutes?: number,
): Promise<ToolResult<SessionsListResult>> {
  return invokeTool(connection, "sessions_list", "json", { activeMinutes });
}

// Messages
export async function sendMessage(
  connection: SquadhubConnection,
  channel: string,
  target: string,
  message: string,
): Promise<ToolResult<{ messageId: string }>> {
  return invokeTool(connection, "message", undefined, {
    channel,
    target,
    message,
  });
}

// Sessions - Send message to an agent session
export async function sessionsSend(
  connection: SquadhubConnection,
  sessionKey: string,
  message: string,
  timeoutSeconds?: number,
): Promise<ToolResult<{ response: string }>> {
  return invokeTool(connection, "sessions_send", undefined, {
    sessionKey,
    message,
    timeoutSeconds: timeoutSeconds ?? 10,
  });
}

// Cron types (matching squadhub src/cron/types.ts)
export type CronSchedule =
  | { kind: "at"; at: string }
  | { kind: "every"; everyMs: number; anchorMs?: number }
  | { kind: "cron"; expr: string; tz?: string };

export type CronSessionTarget = "main" | "isolated";
export type CronWakeMode = "next-heartbeat" | "now";
export type CronDeliveryMode = "none" | "announce";

export interface CronDelivery {
  mode: CronDeliveryMode;
  channel?: string;
  to?: string;
  bestEffort?: boolean;
}

export type CronPayload =
  | { kind: "systemEvent"; text: string }
  | {
      kind: "agentTurn";
      message: string;
      model?: string;
      thinking?: string;
      timeoutSeconds?: number;
      allowUnsafeExternalContent?: boolean;
      deliver?: boolean;
      channel?: string;
      to?: string;
      bestEffortDeliver?: boolean;
    };

export interface CronJobState {
  nextRunAtMs?: number;
  runningAtMs?: number;
  lastRunAtMs?: number;
  lastStatus?: "ok" | "error" | "skipped";
  lastError?: string;
  lastDurationMs?: number;
  consecutiveErrors?: number;
}

export interface CronJob {
  id: string;
  agentId?: string;
  name: string;
  description?: string;
  enabled: boolean;
  deleteAfterRun?: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: CronSchedule;
  sessionTarget: CronSessionTarget;
  wakeMode: CronWakeMode;
  payload: CronPayload;
  delivery?: CronDelivery;
  state: CronJobState;
}

export interface CronListResult {
  jobs: CronJob[];
}

export interface CronAddJob {
  name: string;
  agentId?: string;
  description?: string;
  enabled?: boolean;
  deleteAfterRun?: boolean;
  schedule: CronSchedule;
  sessionTarget: CronSessionTarget;
  wakeMode?: CronWakeMode;
  payload: CronPayload;
  delivery?: CronDelivery;
}

// Cron - List jobs
export async function cronList(
  connection: SquadhubConnection,
): Promise<ToolResult<CronListResult>> {
  return invokeTool(connection, "cron", undefined, { action: "list" });
}

// Cron - Add job
export async function cronAdd(
  connection: SquadhubConnection,
  job: CronAddJob,
): Promise<ToolResult<{ id: string }>> {
  return invokeTool(connection, "cron", undefined, { action: "add", job });
}
