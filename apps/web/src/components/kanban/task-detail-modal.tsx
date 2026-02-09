"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@clawe/ui/components/dialog";
import { cn } from "@clawe/ui/lib/utils";
import { Circle } from "lucide-react";
import type { KanbanTask } from "./types";
import type { DocumentWithCreator } from "@clawe/backend/types";
import { DocumentsSection } from "./_components/documents-section";
import { DocumentViewerModal } from "./_components/document-viewer-modal";

const priorityConfig: Record<
  KanbanTask["priority"],
  { label: string; className: string }
> = {
  high: {
    label: "High",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  medium: {
    label: "Medium",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
};

export type TaskDetailModalProps = {
  task: KanbanTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const TaskDetailModal = ({
  task,
  open,
  onOpenChange,
}: TaskDetailModalProps) => {
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentWithCreator | null>(null);

  if (!task) return null;

  const priority = priorityConfig[task.priority];
  const hasSubtasks = task.subtasks.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{task.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Priority badge */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium",
                  priority.className,
                )}
              >
                {priority.label} Priority
              </span>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                  Description
                </h4>
                <p className="text-sm">{task.description}</p>
              </div>
            )}

            {/* Subtasks list */}
            {hasSubtasks && (
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                  Subtasks ({task.subtasks.length})
                </h4>
                <ul className="space-y-2">
                  {task.subtasks.map((subtask) => (
                    <li
                      key={subtask.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Circle className="text-muted-foreground h-4 w-4" />
                      <span>{subtask.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Documents section */}
            <DocumentsSection
              taskId={task.id}
              onViewDocument={setSelectedDocument}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Document viewer modal */}
      <DocumentViewerModal
        document={selectedDocument}
        open={selectedDocument !== null}
        onOpenChange={(isOpen) => !isOpen && setSelectedDocument(null)}
      />
    </>
  );
};
