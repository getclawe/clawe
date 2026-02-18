import { promises as fs } from "node:fs";
import path from "node:path";
import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi, ToolResult } from "../types";

/**
 * Pairing tool for Clawe.
 *
 * Exposes channel pairing operations (list pending requests, approve by code)
 * as an OpenClaw tool callable via POST /tools/invoke.
 *
 * File layout (relative to $OPENCLAW_STATE_DIR):
 *   credentials/<channel>-pairing.json    — pending pairing requests
 *   credentials/<channel>-allowFrom.json  — approved sender IDs
 */

const PAIRING_PENDING_TTL_MS = 60 * 60 * 1000; // 1 hour

type PairingRequest = {
  id: string;
  code: string;
  createdAt: string;
  lastSeenAt: string;
  meta?: Record<string, string>;
};

type PairingStore = {
  version: 1;
  requests: PairingRequest[];
};

type AllowFromStore = {
  version: 1;
  allowFrom: string[];
};

function resolveStateDir(): string {
  return process.env.OPENCLAW_STATE_DIR || "/data/config";
}

function safeChannelKey(channel: string): string {
  const raw = channel.trim().toLowerCase();
  if (!raw) throw new Error("invalid pairing channel");
  const safe = raw.replace(/[\\/:*?"<>|]/g, "_").replace(/\.\./g, "_");
  if (!safe || safe === "_") throw new Error("invalid pairing channel");
  return safe;
}

function resolvePairingPath(channel: string): string {
  return path.join(
    resolveStateDir(),
    "credentials",
    `${safeChannelKey(channel)}-pairing.json`,
  );
}

function resolveAllowFromPath(channel: string): string {
  return path.join(
    resolveStateDir(),
    "credentials",
    `${safeChannelKey(channel)}-allowFrom.json`,
  );
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
  await fs.chmod(filePath, 0o600);
}

function isExpired(entry: PairingRequest, nowMs: number): boolean {
  const createdAt = Date.parse(entry.createdAt);
  if (!Number.isFinite(createdAt)) return true;
  return nowMs - createdAt > PAIRING_PENDING_TTL_MS;
}

function pruneExpired(reqs: PairingRequest[], nowMs: number): PairingRequest[] {
  return reqs.filter((r) => !isExpired(r, nowMs));
}

function textResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    details:
      typeof data === "object" && data !== null
        ? (data as Record<string, unknown>)
        : {},
  };
}

function errorResult(message: string): ToolResult {
  return {
    content: [
      { type: "text", text: JSON.stringify({ ok: false, error: message }) },
    ],
    details: { ok: false, error: message },
  };
}

async function listAction(channel: string): Promise<ToolResult> {
  const filePath = resolvePairingPath(channel);
  const store = await readJsonFile<PairingStore>(filePath, {
    version: 1,
    requests: [],
  });
  const requests = pruneExpired(store.requests || [], Date.now());
  return textResult({ ok: true, requests });
}

async function approveAction(
  channel: string,
  code: string,
): Promise<ToolResult> {
  if (!code) return errorResult("Pairing code is required");

  const normalizedCode = code.trim().toUpperCase();
  const pairingPath = resolvePairingPath(channel);

  // Read pending requests
  const store = await readJsonFile<PairingStore>(pairingPath, {
    version: 1,
    requests: [],
  });
  const requests = pruneExpired(store.requests || [], Date.now());

  // Find matching request
  const entry = requests.find((r) => r.code.toUpperCase() === normalizedCode);
  if (!entry) return errorResult("Invalid or expired pairing code");

  // Add to allow-from store
  const allowFromPath = resolveAllowFromPath(channel);
  const allowFromStore = await readJsonFile<AllowFromStore>(allowFromPath, {
    version: 1,
    allowFrom: [],
  });
  const existing = allowFromStore.allowFrom || [];
  if (!existing.includes(entry.id)) {
    await writeJsonFile(allowFromPath, {
      version: 1,
      allowFrom: [...existing, entry.id],
    } satisfies AllowFromStore);
  }

  // Remove approved request from pending
  const remaining = requests.filter((r) => r.id !== entry.id);
  await writeJsonFile(pairingPath, {
    version: 1,
    requests: remaining,
  } satisfies PairingStore);

  return textResult({ ok: true, id: entry.id, approved: true });
}

export function registerPairingTool(api: OpenClawPluginApi) {
  api.registerTool({
    name: "clawe_pairing",
    description:
      "Manage channel pairing requests (list pending, approve by code)",
    parameters: Type.Object({
      action: Type.Union([Type.Literal("list"), Type.Literal("approve")], {
        description: 'Action to perform: "list" or "approve"',
      }),
      channel: Type.String({ description: 'Channel name (e.g. "telegram")' }),
      code: Type.Optional(
        Type.String({ description: "Pairing code (required for approve)" }),
      ),
    }),
    async execute(
      _toolCallId: string,
      params: Record<string, unknown>,
    ): Promise<ToolResult> {
      const action = params.action as string;
      const channel = params.channel as string;

      if (!channel) return errorResult("Channel is required");

      if (action === "list") {
        return listAction(channel);
      }

      if (action === "approve") {
        const code = params.code as string | undefined;
        if (!code) return errorResult("Code is required for approve action");
        return approveAction(channel, code);
      }

      return errorResult(`Unknown action: ${action}`);
    },
  });
}
