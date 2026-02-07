import axios from "axios";
import type {
  ToolResult,
  ConfigGetResult,
  ConfigPatchResult,
  SessionsListResult,
  GatewayHealthResult,
  TelegramProbeResult,
} from "./types";

const OPENCLAW_URL = process.env.OPENCLAW_URL || "http://localhost:18789";
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || "";

const openclawClient = axios.create({
  baseURL: OPENCLAW_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENCLAW_TOKEN}`,
  },
});

async function invokeTool<T>(
  tool: string,
  action?: string,
  args?: Record<string, unknown>,
): Promise<ToolResult<T>> {
  try {
    const { data } = await openclawClient.post("/tools/invoke", {
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

// Health check - uses /tools/invoke with gateway config.get to verify connectivity
export async function checkHealth(): Promise<ToolResult<GatewayHealthResult>> {
  try {
    const { data } = await openclawClient.post("/tools/invoke", {
      tool: "gateway",
      action: "config.get",
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
  botToken: string,
): Promise<ToolResult<ConfigPatchResult>> {
  return patchConfig({
    channels: {
      telegram: {
        enabled: true,
        botToken,
        dmPolicy: "pairing",
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
export async function getConfig(): Promise<ToolResult<ConfigGetResult>> {
  return invokeTool("gateway", "config.get");
}

export async function patchConfig(
  config: Record<string, unknown>,
  baseHash?: string,
): Promise<ToolResult<ConfigPatchResult>> {
  return invokeTool("gateway", "config.patch", {
    raw: JSON.stringify(config),
    baseHash,
  });
}

// Sessions
export async function listSessions(
  activeMinutes?: number,
): Promise<ToolResult<SessionsListResult>> {
  return invokeTool("sessions_list", "json", { activeMinutes });
}

// Messages
export async function sendMessage(
  channel: string,
  target: string,
  message: string,
): Promise<ToolResult<{ messageId: string }>> {
  return invokeTool("message", undefined, { channel, target, message });
}
