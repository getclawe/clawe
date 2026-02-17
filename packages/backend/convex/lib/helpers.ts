import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export async function getAgentBySessionKey(
  ctx: { db: QueryCtx["db"] },
  tenantId: Id<"tenants">,
  sessionKey: string,
): Promise<Doc<"agents"> | null> {
  return await ctx.db
    .query("agents")
    .withIndex("by_tenant_sessionKey", (q) =>
      q.eq("tenantId", tenantId).eq("sessionKey", sessionKey),
    )
    .first();
}
