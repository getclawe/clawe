import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { Agent } from "../types";

export async function getAgentBySessionKey(
  ctx: { db: QueryCtx["db"] },
  tenantId: Id<"tenants">,
  sessionKey: string,
): Promise<Agent | null> {
  return await ctx.db
    .query("agents")
    .withIndex("by_tenant_sessionKey", (q) =>
      q.eq("tenantId", tenantId).eq("sessionKey", sessionKey),
    )
    .first();
}
