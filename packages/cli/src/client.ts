import { ConvexHttpClient } from "convex/browser";
import { api } from "@clawe/backend";
import * as fs from "fs";
import * as path from "path";

const CONVEX_URL = process.env.CONVEX_URL;

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

export const client = new ConvexHttpClient(CONVEX_URL);

/**
 * Upload a file to Convex storage
 * @returns The storage ID of the uploaded file
 */
export async function uploadFile(filePath: string): Promise<string> {
  // Read file
  const fileBuffer = fs.readFileSync(filePath);

  // Get upload URL from Convex
  let uploadUrl = await client.action(api.documents.generateUploadUrl, {});

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
