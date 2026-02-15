import { promises as fs } from "fs";
import path from "path";
import os from "os";
import type {
  PairingRequest,
  PairingListResult,
  PairingApproveResult,
  DirectResult,
} from "./types";
import { getConfig, patchConfig, type SquadhubConnection } from "./client";

const SQUADHUB_STATE_DIR =
  process.env.SQUADHUB_STATE_DIR || path.join(os.homedir(), ".squadhub");
const CREDENTIALS_DIR = path.join(SQUADHUB_STATE_DIR, "credentials");

type PairingStore = {
  version: 1;
  requests: PairingRequest[];
};

const PAIRING_PENDING_TTL_MS = 60 * 60 * 1000; // 1 hour

function resolvePairingPath(channel: string): string {
  // Sanitize channel name for filesystem
  const safe = channel
    .trim()
    .toLowerCase()
    .replace(/[\\/:*?"<>|]/g, "_");
  return path.join(CREDENTIALS_DIR, `${safe}-pairing.json`);
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

function pruneExpiredRequests(reqs: PairingRequest[], nowMs: number) {
  return reqs.filter((req) => !isExpired(req, nowMs));
}

export async function listChannelPairingRequests(
  channel: string,
): Promise<DirectResult<PairingListResult>> {
  try {
    const filePath = resolvePairingPath(channel);
    const store = await readJsonFile<PairingStore>(filePath, {
      version: 1,
      requests: [],
    });

    const nowMs = Date.now();
    const requests = pruneExpiredRequests(store.requests || [], nowMs);

    return { ok: true, result: { requests } };
  } catch (error) {
    return {
      ok: false,
      error: {
        type: "read_error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to read pairing requests",
      },
    };
  }
}

export async function approveChannelPairingCode(
  connection: SquadhubConnection,
  channel: string,
  code: string,
): Promise<DirectResult<PairingApproveResult>> {
  try {
    if (!code) {
      return {
        ok: false,
        error: { type: "invalid_code", message: "Pairing code is required" },
      };
    }

    const normalizedCode = code.trim().toUpperCase();
    const pairingPath = resolvePairingPath(channel);

    // Read current pairing requests (file-based - squadhub writes these)
    const store = await readJsonFile<PairingStore>(pairingPath, {
      version: 1,
      requests: [],
    });

    const nowMs = Date.now();
    const requests = pruneExpiredRequests(store.requests || [], nowMs);

    // Find the request with matching code
    const entry = requests.find((r) => r.code.toUpperCase() === normalizedCode);

    if (!entry) {
      return {
        ok: false,
        error: {
          type: "not_found",
          message: "Invalid or expired pairing code",
        },
      };
    }

    // Get current config to read existing allowFrom list
    const configResult = await getConfig(connection);
    if (!configResult.ok) {
      return {
        ok: false,
        error: {
          type: "config_error",
          message: "Failed to read current config",
        },
      };
    }

    // Extract existing allowFrom list
    const config = configResult.result.details.config as {
      channels?: {
        [key: string]: {
          allowFrom?: string[];
        };
      };
    };
    const existingAllowFrom = config?.channels?.[channel]?.allowFrom ?? [];

    // Add user ID to allowFrom if not already present
    if (!existingAllowFrom.includes(entry.id)) {
      const patchResult = await patchConfig(
        connection,
        {
          channels: {
            [channel]: {
              allowFrom: [...existingAllowFrom, entry.id],
            },
          },
        },
        configResult.result.details.hash,
      );

      if (!patchResult.ok) {
        return {
          ok: false,
          error: {
            type: "config_error",
            message: "Failed to update allowFrom config",
          },
        };
      }
    }

    // Remove from pending requests file
    const remainingRequests = requests.filter((r) => r.id !== entry.id);
    await writeJsonFile(pairingPath, {
      version: 1,
      requests: remainingRequests,
    });

    return { ok: true, result: { id: entry.id, approved: true } };
  } catch (error) {
    return {
      ok: false,
      error: {
        type: "write_error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to approve pairing code",
      },
    };
  }
}
