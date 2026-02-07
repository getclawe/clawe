import { client } from "../client.js";
import { api } from "@clawe/backend";
import type { Id } from "@clawe/backend/dataModel";

interface DeliverOptions {
  by: string;
}

export async function deliver(
  taskId: string,
  path: string,
  title: string,
  options: DeliverOptions,
): Promise<void> {
  await client.mutation(api.documents.registerDeliverable, {
    taskId: taskId as Id<"tasks">,
    path,
    title,
    createdBySessionKey: options.by,
  });

  console.log(`✅ Deliverable registered: ${title}`);
}

export async function deliverables(taskId: string): Promise<void> {
  const docs = await client.query(api.documents.getForTask, {
    taskId: taskId as Id<"tasks">,
  });

  if (docs.length === 0) {
    console.log("No deliverables registered.");
    return;
  }

  console.log(`📦 ${docs.length} deliverable(s):\n`);
  for (const doc of docs) {
    const creator = doc.creator?.name ?? "Unknown";
    const date = new Date(doc.createdAt).toLocaleString();
    console.log(`${doc.title}`);
    console.log(`   Path: ${doc.path}`);
    console.log(`   By: ${creator} at ${date}`);
    console.log();
  }
}
