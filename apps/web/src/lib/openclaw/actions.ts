"use server";

import {
  checkHealth,
  getConfig,
  saveTelegramBotToken as saveTelegramBotTokenClient,
  probeTelegramToken,
} from "@clawe/shared/openclaw";
import { approveChannelPairingCode } from "@clawe/shared/openclaw";

export async function checkOpenClawHealth() {
  return checkHealth();
}

export async function getOpenClawConfig() {
  return getConfig();
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
  return saveTelegramBotTokenClient(botToken);
}

export async function approvePairingCode(
  code: string,
  channel: string = "telegram",
) {
  return approveChannelPairingCode(channel, code);
}
