#!/usr/bin/env node

/**
 * Auto-approve device pairing requests.
 *
 * Two modes:
 * 1. SYNC (pre-start): Reads identity/device.json and writes paired.json
 *    before the gateway starts. This ensures the local CLI is pre-paired.
 * 2. BACKGROUND (--watch): Polls pending.json every 60s and moves entries
 *    to paired.json. Runs alongside the gateway for new connections.
 *
 * Usage:
 *   node pair-device.js          # Sync mode (run before gateway)
 *   node pair-device.js --watch  # Background loop (run after gateway)
 */

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const stateDir = process.env.OPENCLAW_STATE_DIR || "/data/config";
const identityFile = path.join(stateDir, "identity", "device.json");
const devicesDir = path.join(stateDir, "devices");
const pendingFile = path.join(devicesDir, "pending.json");
const pairedFile = path.join(devicesDir, "paired.json");

const INTERVAL_MS = 60_000;

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function createPairedEntry(deviceId, publicKey, meta) {
  const now = Date.now();
  return {
    deviceId,
    publicKey,
    displayName: meta.clientId || "agent",
    platform: meta.platform || "linux",
    clientId: meta.clientId || "cli",
    clientMode: meta.clientMode || "cli",
    role: meta.role || "operator",
    roles: meta.roles || ["operator"],
    scopes: meta.scopes || [
      "operator.admin",
      "operator.approvals",
      "operator.pairing",
    ],
    tokens: {
      operator: {
        token: crypto.randomBytes(16).toString("hex"),
        role: "operator",
        scopes: meta.scopes || [
          "operator.admin",
          "operator.approvals",
          "operator.pairing",
        ],
        createdAtMs: now,
        lastUsedAtMs: now,
      },
    },
    createdAtMs: meta.ts || now,
    approvedAtMs: now,
  };
}

/**
 * Sync mode: pre-pair the local device from identity file.
 * Runs before the gateway starts so it reads paired.json on boot.
 */
function pairFromIdentity() {
  if (!fs.existsSync(identityFile)) {
    console.log("[pair-device] No identity file, skipping pre-pair.");
    return;
  }

  const identity = JSON.parse(fs.readFileSync(identityFile, "utf8"));

  // Extract Ed25519 public key from SPKI PEM
  const spki = crypto
    .createPublicKey(identity.publicKeyPem)
    .export({ type: "spki", format: "der" });
  const publicKey = spki.subarray(12).toString("base64url");

  const paired = readJson(pairedFile);

  // Already paired — skip
  if (paired[identity.deviceId]) {
    console.log(
      `[pair-device] Device ${identity.deviceId.substring(0, 12)}... already paired.`,
    );
    return;
  }

  paired[identity.deviceId] = createPairedEntry(identity.deviceId, publicKey, {
    clientId: "gateway-client",
    clientMode: "backend",
  });

  writeJson(pairedFile, paired);
  console.log(
    `[pair-device] ✓ Pre-paired device ${identity.deviceId.substring(0, 12)}...`,
  );
}

/**
 * Watch mode: approve any pending requests by moving them to paired.json.
 */
function approvePending() {
  const pending = readJson(pendingFile);
  const entries = Object.entries(pending);

  if (entries.length === 0) return;

  console.log(
    `[pair-device] Found ${entries.length} pending request(s), approving...`,
  );

  const paired = readJson(pairedFile);
  let approved = 0;

  for (const [requestId, entry] of entries) {
    if (!entry.deviceId || !entry.publicKey) continue;

    paired[entry.deviceId] = createPairedEntry(
      entry.deviceId,
      entry.publicKey,
      entry,
    );

    delete pending[requestId];
    approved++;

    console.log(
      `[pair-device] ✓ Approved ${entry.deviceId.substring(0, 12)}...`,
    );
  }

  if (approved > 0) {
    writeJson(pairedFile, paired);
    writeJson(pendingFile, pending);
  }
}

// --- Main ---

const watchMode = process.argv.includes("--watch");

if (!watchMode) {
  // Sync mode: pre-pair from identity, approve any stale pending
  pairFromIdentity();
  approvePending();
} else {
  // Watch mode: poll pending.json every 60s
  const { execSync } = require("child_process");

  // Wait for gateway health
  const waitForGateway = (cb) => {
    const check = () => {
      try {
        execSync("wget -q --spider http://localhost:18789/health 2>/dev/null", {
          stdio: "pipe",
        });
        cb();
      } catch {
        setTimeout(check, 2000);
      }
    };
    check();
  };

  waitForGateway(() => {
    console.log(
      "[pair-device] Gateway ready, watching for pending requests (60s)",
    );
    approvePending();
    setInterval(approvePending, INTERVAL_MS);
  });
}
