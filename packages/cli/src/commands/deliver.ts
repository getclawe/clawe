import { client, uploadFile } from "../client.js";
import { api } from "@clawe/backend";
import type { Id } from "@clawe/backend/dataModel";
import * as fs from "fs";

interface DeliverOptions {
  by: string;
}

export async function deliver(
  taskId: string,
  path: string,
  title: string,
  options: DeliverOptions,
): Promise<void> {
  // Check if file exists
  if (!fs.existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }

  console.log(`📤 Uploading file: ${path}...`);

  // Upload file to Convex storage
  const fileId = await uploadFile(path);

  console.log(`✅ File uploaded`);

  // Register deliverable with fileId
  await client.mutation(api.documents.registerDeliverable, {
    taskId: taskId as Id<"tasks">,
    path,
    fileId: fileId as Id<"_storage">,
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
    if (doc.fileUrl) {
      console.log(`   URL: ${doc.fileUrl}`);
    }
    console.log(`   By: ${creator} at ${date}`);
    console.log();
  }
}
