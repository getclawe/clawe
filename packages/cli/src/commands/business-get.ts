import { client } from "../client.js";
import { api } from "@clawe/backend";

/**
 * Get the current business context.
 * Any agent can use this to understand the business they're working for.
 */
export async function businessGet(): Promise<void> {
  const context = await client.query(api.businessContext.get, {});

  if (!context) {
    console.log("Business context not configured.");
    process.exit(1);
  }

  // Output as JSON for easy parsing by agents
  console.log(
    JSON.stringify(
      {
        url: context.url,
        name: context.name,
        description: context.description,
        favicon: context.favicon,
        metadata: context.metadata,
        approved: context.approved,
      },
      null,
      2,
    ),
  );
}
