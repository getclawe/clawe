"use server";

import {
  checkHealth,
  getConfig,
  patchConfig,
  saveTelegramBotToken as saveTelegramBotTokenClient,
  probeTelegramToken,
} from "./client";

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
  // First validate the token
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

  // Then save to OpenClaw config
  return saveTelegramBotTokenClient(botToken);
}

export async function saveAnthropicApiKey(apiKey: string) {
  return patchConfig({
    env: {
      ANTHROPIC_API_KEY: apiKey,
    },
  });
}

export async function saveOpenAIApiKey(apiKey: string) {
  return patchConfig({
    env: {
      OPENAI_API_KEY: apiKey,
    },
  });
}
