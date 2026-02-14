"use server";

import {
  checkHealth,
  getConfig,
  saveTelegramBotToken as saveTelegramBotTokenClient,
  removeTelegramBotToken as removeTelegramBotTokenClient,
  probeTelegramToken,
} from "@clawe/shared/agency";
import { approveChannelPairingCode } from "@clawe/shared/agency";

export async function checkAgencyHealth() {
  return checkHealth();
}

export async function getAgencyConfig() {
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

export async function removeTelegramBot() {
  return removeTelegramBotTokenClient();
}
