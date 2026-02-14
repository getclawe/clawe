#!/usr/bin/env node

/**
 * Auto-pair the local CLI device with the gateway.
 *
 * When the Docker container is recreated, the openclaw CLI generates a new
 * keypair (identity/device.json) but the volume still has the old
 * devices/paired.json. The gateway then rejects all connections with
 * "pairing required". This script reads the current device identity and
 * registers it as a paired operator device — the automated equivalent of
 * clicking "approve" in the openclaw Control UI.
 */

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const stateDir = process.env.OPENCLAW_STATE_DIR || "/data/config";
const identityFile = path.join(stateDir, "identity", "device.json");
const devicesDir = path.join(stateDir, "devices");
const pairedFile = path.join(devicesDir, "paired.json");

if (!fs.existsSync(identityFile)) {
  console.log("==> No device identity found, skipping device registration.");
  process.exit(0);
}

const identity = JSON.parse(fs.readFileSync(identityFile, "utf8"));

// Extract the raw Ed25519 public key from the SPKI-encoded PEM (skip 12-byte header)
const spki = crypto
  .createPublicKey(identity.publicKeyPem)
  .export({ type: "spki", format: "der" });
const publicKey = spki.subarray(12).toString("base64url");

const now = Date.now();
const token = crypto.randomBytes(16).toString("hex");

const entry = {
  deviceId: identity.deviceId,
  publicKey,
  displayName: "agent",
  platform: "linux",
  clientId: "gateway-client",
  clientMode: "backend",
  role: "operator",
  roles: ["operator"],
  scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
  tokens: {
    operator: {
      token,
      role: "operator",
      scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
      createdAtMs: now,
      lastUsedAtMs: now,
    },
  },
  createdAtMs: now,
  approvedAtMs: now,
};

fs.mkdirSync(devicesDir, { recursive: true });
fs.writeFileSync(
  pairedFile,
  JSON.stringify({ [identity.deviceId]: entry }, null, 2),
);

console.log(`==> Device ${identity.deviceId.substring(0, 12)}... registered.`);
