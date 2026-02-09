# Document Viewing Feature - Implementation Plan

## Overview

Enable users to view and download deliverable files created by agents, directly from the kanban board. Files will be stored in Convex file storage and served via CDN-backed URLs.

## Architecture

```
Agent creates file → CLI uploads to Convex → Document record updated with fileId
                                                    ↓
User clicks task → Modal shows documents → Click "View" → File served from Convex CDN
```

---

## Phase 1: Schema & Backend

### Step 1.1: Update Documents Schema

**File:** `packages/backend/convex/schema.ts`

Add `fileId` field to documents table:

```typescript
documents: defineTable({
  title: v.string(),
  content: v.optional(v.string()),
  path: v.optional(v.string()),
  fileId: v.optional(v.id("_storage")), // NEW: Convex storage ID
  type: v.union(
    v.literal("deliverable"),
    v.literal("research"),
    v.literal("reference"),
    v.literal("note"),
  ),
  taskId: v.optional(v.id("tasks")),
  createdBy: v.id("agents"),
  createdAt: v.number(),
  updatedAt: v.number(),
});
```

### Step 1.2: Create Upload Action

**File:** `packages/backend/convex/documents.ts`

Add action to generate upload URL:

```typescript
import { action } from "./_generated/server";

export const generateUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
```

### Step 1.3: Create File URL Query

**File:** `packages/backend/convex/documents.ts`

Add query to get file URL:

```typescript
export const getFileUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.fileId);
  },
});
```

### Step 1.4: Update registerDeliverable Mutation

**File:** `packages/backend/convex/documents.ts`

Modify to accept optional `fileId`:

```typescript
export const registerDeliverable = mutation({
  args: {
    title: v.string(),
    path: v.string(),
    fileId: v.optional(v.id("_storage")), // NEW
    taskId: v.id("tasks"),
    createdBySessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    // ... existing logic
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      path: args.path,
      fileId: args.fileId, // NEW
      type: "deliverable",
      taskId: args.taskId,
      createdBy: agent._id,
      createdAt: now,
      updatedAt: now,
    });
    // ... rest
  },
});
```

### Step 1.5: Update getForTask Query

**File:** `packages/backend/convex/documents.ts`

Include file URLs in response:

```typescript
export const getForTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    return Promise.all(
      documents.map(async (doc) => {
        const creator = await ctx.db.get(doc.createdBy);
        // Get file URL if fileId exists
        const fileUrl = doc.fileId
          ? await ctx.storage.getUrl(doc.fileId)
          : null;

        return {
          ...doc,
          fileUrl, // NEW: Include download URL
          creator: creator
            ? { _id: creator._id, name: creator.name, emoji: creator.emoji }
            : null,
        };
      }),
    );
  },
});
```

---

## Phase 2: CLI Updates

### Step 2.1: Update Client for File Upload

**File:** `packages/cli/src/client.ts`

Add helper for file upload:

```typescript
import { ConvexHttpClient } from "convex/browser";
import { api } from "@clawe/backend";

// ... existing client export

export async function uploadFile(filePath: string): Promise<string> {
  const fs = await import("fs/promises");

  // Read file
  const fileBuffer = await fs.readFile(filePath);
  const fileName = filePath.split("/").pop() || "file";

  // Get upload URL from Convex
  const uploadUrl = await client.action(api.documents.generateUploadUrl, {});

  // Upload file
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: fileBuffer,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const { storageId } = await response.json();
  return storageId;
}
```

### Step 2.2: Update Deliver Command

**File:** `packages/cli/src/commands/deliver.ts`

Modify to upload file before registering:

```typescript
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
    console.error(`Error: File not found: ${path}`);
    process.exit(1);
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
```

### Step 2.3: Rebuild CLI

```bash
cd packages/cli
pnpm build
```

---

## Phase 3: Frontend - Types & Data

### Step 3.1: Update Kanban Types

**File:** `apps/web/src/components/kanban/types.ts`

Add document types:

```typescript
export type KanbanDocument = {
  id: string;
  title: string;
  type: "deliverable" | "research" | "reference" | "note";
  path?: string;
  fileUrl?: string | null;
  createdBy?: string;
  createdAt: number;
};

export type KanbanTask = {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  assignee?: string;
  subtasks: KanbanTask[];
  documentCount?: number; // NEW: For badge on card
};
```

### Step 3.2: Update Board Page Task Mapping

**File:** `apps/web/src/app/(dashboard)/board/page.tsx`

Include document count in task mapping:

```typescript
// Update ConvexTask type to include document count if available
type ConvexTask = {
  _id: string;
  title: string;
  description?: string;
  priority?: string;
  assignees?: { _id: string; name: string; emoji?: string }[];
  subtasks?: { title: string; description?: string; done: boolean }[];
  // Note: document count will be added via separate query or enrichment
};

function mapTask(task: ConvexTask, documentCount?: number): KanbanTask {
  // ... existing mapping
  return {
    id: task._id,
    title: task.title,
    description: task.description,
    priority: mapPriority(task.priority),
    assignee: task.assignees?.[0]
      ? `${task.assignees[0].emoji || ""} ${task.assignees[0].name}`.trim()
      : undefined,
    subtasks,
    documentCount, // NEW
  };
}
```

---

## Phase 4: Frontend - Components

### Step 4.1: Create DocumentsSection Component

**File:** `apps/web/src/components/kanban/_components/documents-section.tsx`

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import type { Id } from "@clawe/backend/dataModel";
import { FileText, Download, Eye } from "lucide-react";
import { Button } from "@clawe/ui/components/button";

type DocumentsSectionProps = {
  taskId: string;
  onViewDocument: (doc: Document) => void;
};

type Document = {
  _id: string;
  title: string;
  type: string;
  path?: string;
  fileUrl?: string | null;
  creator?: { name: string; emoji?: string } | null;
  createdAt: number;
};

export const DocumentsSection = ({ taskId, onViewDocument }: DocumentsSectionProps) => {
  const documents = useQuery(api.documents.getForTask, {
    taskId: taskId as Id<"tasks">,
  });

  // Filter to only show deliverables
  const deliverables = documents?.filter((d) => d.type === "deliverable") ?? [];

  if (deliverables.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="text-muted-foreground mb-2 text-sm font-medium">
        Documents ({deliverables.length})
      </h4>
      <ul className="space-y-2">
        {deliverables.map((doc) => (
          <li
            key={doc._id}
            className="flex items-center justify-between rounded-md border p-2"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{doc.title}</span>
            </div>
            <div className="flex gap-1">
              {doc.fileUrl && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDocument(doc)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={doc.fileUrl} download={doc.title}>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### Step 4.2: Create DocumentViewerModal Component

**File:** `apps/web/src/components/kanban/_components/document-viewer-modal.tsx`

```typescript
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@clawe/ui/components/dialog";
import { Button } from "@clawe/ui/components/button";
import { Download } from "lucide-react";
import { ScrollArea } from "@clawe/ui/components/scroll-area";

type Document = {
  _id: string;
  title: string;
  fileUrl?: string | null;
  content?: string;
};

type DocumentViewerModalProps = {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const DocumentViewerModal = ({
  document,
  open,
  onOpenChange,
}: DocumentViewerModalProps) => {
  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{document.title}</span>
            {document.fileUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={document.fileUrl} download={document.title}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {document.fileUrl ? (
            <iframe
              src={document.fileUrl}
              className="w-full h-[500px] border rounded"
              title={document.title}
            />
          ) : document.content ? (
            <pre className="whitespace-pre-wrap text-sm p-4 bg-muted rounded">
              {document.content}
            </pre>
          ) : (
            <p className="text-muted-foreground">No preview available</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
```

### Step 4.3: Update TaskDetailModal

**File:** `apps/web/src/components/kanban/task-detail-modal.tsx`

Add documents section:

```typescript
"use client";

import { useState } from "react";
// ... existing imports
import { DocumentsSection } from "./_components/documents-section";
import { DocumentViewerModal } from "./_components/document-viewer-modal";

// ... existing code

export const TaskDetailModal = ({
  task,
  open,
  onOpenChange,
}: TaskDetailModalProps) => {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  if (!task) return null;

  // ... existing code

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          {/* ... existing content */}

          <div className="space-y-4">
            {/* ... existing sections (priority, description, subtasks) */}

            {/* Documents section - NEW */}
            <DocumentsSection
              taskId={task.id}
              onViewDocument={setSelectedDocument}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Document viewer modal - NEW */}
      <DocumentViewerModal
        document={selectedDocument}
        open={selectedDocument !== null}
        onOpenChange={(open) => !open && setSelectedDocument(null)}
      />
    </>
  );
};
```

### Step 4.4: Add Document Badge to KanbanCard

**File:** `apps/web/src/components/kanban/kanban-card.tsx`

Add badge showing document count:

```typescript
import { FileText } from "lucide-react";

// In the component, add after subtask toggle:
{task.documentCount && task.documentCount > 0 && (
  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
    <FileText className="h-3 w-3" />
    <span>{task.documentCount} document{task.documentCount !== 1 && "s"}</span>
  </div>
)}
```

---

## Phase 5: Document Count Query

### Step 5.1: Add Document Count to Tasks List

**File:** `packages/backend/convex/tasks.ts`

Update `list` query to include document counts:

```typescript
export const list = query({
  args: {
    /* existing args */
  },
  handler: async (ctx, args) => {
    // ... existing task fetching logic

    return Promise.all(
      tasks.map(async (task) => {
        // ... existing assignee enrichment

        // Get document count for this task (only deliverables)
        const documents = await ctx.db
          .query("documents")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();

        const deliverableCount = documents.filter(
          (d) => d.type === "deliverable",
        ).length;

        return {
          ...task,
          assignees: validAssignees.map((a) => ({
            _id: a._id,
            name: a.name,
            emoji: a.emoji,
          })),
          documentCount: deliverableCount, // NEW
        };
      }),
    );
  },
});
```

---

## Phase 6: Testing & Verification

### Step 6.1: Test CLI Upload

```bash
# Build CLI
cd packages/cli && pnpm build

# Test locally (requires CONVEX_URL)
export CONVEX_URL="https://your-project.convex.cloud"

# Create a test file
echo "Test content" > /tmp/test.md

# Upload via CLI
node dist/clawe.js deliver <taskId> /tmp/test.md "Test Document" --by agent:main:main
```

### Step 6.2: Verify in Convex Dashboard

1. Open Convex dashboard
2. Check `documents` table for new record with `fileId`
3. Check `_storage` table for uploaded file

### Step 6.3: Test Frontend

1. Open kanban board
2. Find task with documents
3. Click task to open modal
4. Verify documents section appears
5. Click "View" to open document viewer
6. Click "Download" to download file

---

## File Summary

### New Files

- `apps/web/src/components/kanban/_components/documents-section.tsx`
- `apps/web/src/components/kanban/_components/document-viewer-modal.tsx`

### Modified Files

- `packages/backend/convex/schema.ts` - Add fileId field
- `packages/backend/convex/documents.ts` - Add generateUploadUrl, getFileUrl, update registerDeliverable
- `packages/backend/convex/tasks.ts` - Add documentCount to list query
- `packages/cli/src/client.ts` - Add uploadFile helper
- `packages/cli/src/commands/deliver.ts` - Upload file before registering
- `apps/web/src/components/kanban/types.ts` - Add KanbanDocument, documentCount
- `apps/web/src/components/kanban/kanban-card.tsx` - Add document badge
- `apps/web/src/components/kanban/task-detail-modal.tsx` - Add documents section

---

## Notes

- **Large files**: Convex upload URL approach supports files up to plan limits (varies by tier)
- **File types**: All file types supported; browser handles preview via iframe
- **Security**: Files served via Convex CDN with signed URLs
- **Rebuild Docker**: After CLI changes, rebuild OpenClaw container to deploy new CLI
