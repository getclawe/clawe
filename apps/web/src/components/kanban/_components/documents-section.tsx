"use client";

import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import type { Id } from "@clawe/backend/dataModel";
import type { DocumentWithCreator } from "@clawe/backend/types";
import { FileText, Download, Eye } from "lucide-react";
import { Button } from "@clawe/ui/components/button";

export type DocumentsSectionProps = {
  taskId: string;
  onViewDocument: (doc: DocumentWithCreator) => void;
};

export const DocumentsSection = ({
  taskId,
  onViewDocument,
}: DocumentsSectionProps) => {
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
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="truncate text-sm">{doc.title}</span>
            </div>
            <div className="flex shrink-0 gap-1">
              {doc.fileUrl && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onViewDocument(doc)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
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
