import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { mutation } from "../client.js";
import { api } from "@clawe/backend";

export type BusinessSetOptions = {
  name?: string;
  description?: string;
  favicon?: string;
  metadata?: string; // JSON string
  removeBootstrap?: boolean;
};

/**
 * Set or update the business context.
 * Only Clawe should use this during onboarding.
 */
export async function businessSet(
  url: string,
  options: BusinessSetOptions,
): Promise<void> {
  // Parse metadata if provided as JSON string
  let metadata: Record<string, unknown> | undefined;
  if (options.metadata) {
    try {
      metadata = JSON.parse(options.metadata);
    } catch {
      console.error("Error: Invalid JSON for --metadata");
      process.exit(1);
    }
  }

  // Save to Convex
  const id = await mutation(api.businessContext.save, {
    url,
    name: options.name,
    description: options.description,
    favicon: options.favicon,
    metadata: metadata as
      | {
          title?: string;
          ogImage?: string;
          industry?: string;
          keywords?: string[];
          targetAudience?: string;
          tone?: string;
        }
      | undefined,
  });

  console.log(`Business context saved (id: ${id})`);

  // Remove BOOTSTRAP.md if requested
  if (options.removeBootstrap) {
    const squadhubStateDir =
      process.env.SQUADHUB_STATE_DIR || path.join(os.homedir(), ".squadhub");
    const bootstrapPath = path.join(
      squadhubStateDir,
      "workspaces",
      "clawe",
      "BOOTSTRAP.md",
    );

    try {
      await fs.unlink(bootstrapPath);
      console.log("BOOTSTRAP.md removed.");
    } catch (error) {
      // File might not exist, which is fine
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`Warning: Could not remove BOOTSTRAP.md: ${error}`);
      }
    }
  }
}
