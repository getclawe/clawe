"use client";

import { X } from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import { Button } from "@clawe/ui/components/button";
import type { ChatAttachment } from "./types";

export type ChatAttachmentsProps = {
  attachments: ChatAttachment[];
  onRemove?: (id: string) => void;
  className?: string;
};

export const ChatAttachments = ({
  attachments,
  onRemove,
  className,
}: ChatAttachmentsProps) => {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {attachments.map((attachment) => (
        <AttachmentPreview
          key={attachment.id}
          attachment={attachment}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

type AttachmentPreviewProps = {
  attachment: ChatAttachment;
  onRemove?: (id: string) => void;
};

const AttachmentPreview = ({
  attachment,
  onRemove,
}: AttachmentPreviewProps) => {
  return (
    <div className="group relative">
      <div className="border-border h-16 w-16 overflow-hidden rounded-lg border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.dataUrl}
          alt={attachment.name}
          className="h-full w-full object-cover"
        />
      </div>

      {onRemove && (
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onRemove(attachment.id)}
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
