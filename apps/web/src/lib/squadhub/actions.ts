"use server";

import {
  checkHealth,
  getConfig,
  patchConfig,
  saveTelegramBotToken as saveTelegramBotTokenClient,
  removeTelegramBotToken as removeTelegramBotTokenClient,
  probeTelegramToken,
  approvePairingCode as approvePairingCodeClient,
  parseToolText,
} from "@clawe/shared/squadhub";
import type { SquadhubConnection } from "@clawe/shared/squadhub";
import { getConnection } from "./connection";

export async function checkSquadhubHealth() {
  return checkHealth(getConnection());
}

export async function getSquadhubConfig() {
  return getConfig(getConnection());
}

export async function validateTelegramToken(botToken: string) {
  return probeTelegramToken(botToken);
}

export async function saveTelegramBotToken(botToken: string) {
  const probeResult = await probeTelegramToken(botToken);
  if (!probeResult.ok) {
    return {
      ok: false as const,
      error: {
        type: "invalid_token",
        message: probeResult.error || "Invalid bot token",
      },
    };
  }
  return saveTelegramBotTokenClient(getConnection(), botToken);
}

export async function approvePairingCode(
  code: string,
  channel: string = "telegram",
) {
  const result = await approvePairingCodeClient(getConnection(), channel, code);

  if (!result.ok) {
    return {
      ok: false as const,
      error: { type: "tool_error", message: result.error.message },
    };
  }

  const data = parseToolText<{
    ok: boolean;
    id?: string;
    approved?: boolean;
    error?: string;
  }>(result);

  if (!data?.ok) {
    return {
      ok: false as const,
      error: {
        type: "not_found",
        message: data?.error || "Invalid or expired pairing code",
      },
    };
  }

  return {
    ok: true as const,
    result: { id: data.id, approved: data.approved },
  };
}

export async function removeTelegramBot() {
  return removeTelegramBotTokenClient(getConnection());
}

/**
 * Patch API keys into squadhub gateway config via patchConfig.
 * Sets keys as env vars in the config — the gateway resolves these
 * as fallback credentials for each provider.
 */
export async function patchApiKeys(
  anthropicApiKey?: string,
  openaiApiKey?: string,
  connection?: SquadhubConnection,
) {
  const env: Record<string, string> = {};

  if (anthropicApiKey) {
    env.ANTHROPIC_API_KEY = anthropicApiKey;
  }
  if (openaiApiKey) {
    env.OPENAI_API_KEY = openaiApiKey;
  }

  if (Object.keys(env).length === 0) return;

  return patchConfig(connection ?? getConnection(), { env });
}
