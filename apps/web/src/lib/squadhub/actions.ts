"use server";

import {
  checkHealth,
  getConfig,
  saveTelegramBotToken as saveTelegramBotTokenClient,
  removeTelegramBotToken as removeTelegramBotTokenClient,
  probeTelegramToken,
  approveChannelPairingCode,
} from "@clawe/shared/squadhub";
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
  return approveChannelPairingCode(getConnection(), channel, code);
}

export async function removeTelegramBot() {
  return removeTelegramBotTokenClient(getConnection());
}
