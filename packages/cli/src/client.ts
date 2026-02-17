import { ConvexHttpClient } from "convex/browser";
import type {
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import { api } from "@clawe/backend";
import * as fs from "fs";
import * as path from "path";

const CONVEX_URL = process.env.CONVEX_URL;

/**
 * Machine token read from SQUADHUB_TOKEN env var.
 * Used to identify which tenant this CLI session belongs to.
 * Automatically injected into all Convex calls for tenant scoping.
 */
export const machineToken = process.env.SQUADHUB_TOKEN || "";

/**
 * Inject machineToken into Convex function args for tenant scoping.
 * All tenant-scoped Convex functions accept optional `machineToken`.
 */
function injectToken(args: unknown[]): unknown[] {
  const base =
    args[0] != null && typeof args[0] === "object"
      ? (args[0] as Record<string, unknown>)
      : {};
  return [{ ...base, machineToken }];
}

// Common MIME types by extension
const MIME_TYPES: Record<string, string> = {
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ts": "application/typescript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".zip": "application/zip",
  ".csv": "text/csv",
};

if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL environment variable is required");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

/**
 * Wrapper around ConvexHttpClient.query.
 * Injects machineToken for tenant scoping.
 */
export function query<F extends FunctionReference<"query">>(
  fn: F,
  ...args: OptionalRestArgs<F>
): Promise<FunctionReturnType<F>> {
  return client.query(fn, ...(injectToken(args) as OptionalRestArgs<F>));
}

/**
 * Wrapper around ConvexHttpClient.mutation.
 * Injects machineToken for tenant scoping.
 */
export function mutation<F extends FunctionReference<"mutation">>(
  fn: F,
  ...args: OptionalRestArgs<F>
): Promise<FunctionReturnType<F>> {
  return client.mutation(fn, ...(injectToken(args) as OptionalRestArgs<F>));
}

/**
 * Wrapper around ConvexHttpClient.action.
 * Injects machineToken for tenant scoping.
 */
export function action<F extends FunctionReference<"action">>(
  fn: F,
  ...args: OptionalRestArgs<F>
): Promise<FunctionReturnType<F>> {
  return client.action(fn, ...(injectToken(args) as OptionalRestArgs<F>));
}

/**
 * Upload a file to Convex storage
 * @returns The storage ID of the uploaded file
 */
export async function uploadFile(filePath: string): Promise<string> {
  // Read file
  const fileBuffer = fs.readFileSync(filePath);

  // Get upload URL from Convex
  let uploadUrl = await action(api.documents.generateUploadUrl, {});

  // When running in Docker, rewrite localhost/127.0.0.1 to host.docker.internal
  // so the container can reach the host's Convex dev server
  if (process.env.CONVEX_URL?.includes("host.docker.internal")) {
    uploadUrl = uploadUrl.replace(
      /localhost|127\.0\.0\.1/,
      "host.docker.internal",
    );
  }

  // Detect content type from file extension
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  // Upload file
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: fileBuffer,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const result = (await response.json()) as { storageId: string };
  return result.storageId;
}
