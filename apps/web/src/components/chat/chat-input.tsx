"use client";

import { useState, useCallback } from "react";
import { Send, Square, Paperclip } from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import { Button } from "@clawe/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@clawe/ui/components/tooltip";
import { ChatInputTextarea } from "./chat-input-textarea";
import { ChatAttachments } from "./chat-attachments";
import type { ChatAttachment } from "./types";

const MAX_IMAGE_SIZE = 1024;
const IMAGE_QUALITY = 0.8;

/**
 * Compress an image file to reduce payload size.
 */
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        if (width > height) {
          height = (height / width) * MAX_IMAGE_SIZE;
          width = MAX_IMAGE_SIZE;
        } else {
          width = (width / height) * MAX_IMAGE_SIZE;
          height = MAX_IMAGE_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
    };

    img.onerror = () => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };

    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string, attachments?: ChatAttachment[]) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export const ChatInput = ({
  value,
  onChange,
  onSend,
  onStop,
  isLoading,
  isStreaming,
  disabled,
  placeholder = "Send a message...",
  className,
}: ChatInputProps) => {
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

  const canSend =
    !disabled &&
    !isLoading &&
    !isStreaming &&
    (value.trim() || attachments.length > 0);
  const showStop = isStreaming && onStop;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(value, attachments.length > 0 ? attachments : undefined);
    setAttachments([]);
  }, [canSend, value, attachments, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleAttachmentAdd = useCallback(async (files: FileList) => {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );

    const processed = await Promise.all(
      imageFiles.map(async (file) => ({
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        dataUrl: await compressImage(file),
        mimeType: "image/jpeg",
        name: file.name,
      })),
    );

    setAttachments((prev) => [...prev, ...processed]);
  }, []);

  const handleAttachmentRemove = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  }, []);

  const handleFileSelect = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        handleAttachmentAdd(files);
      }
    };
    input.click();
  }, [handleAttachmentAdd]);

  return (
    <div className={cn("bg-background border-t px-4 py-3", className)}>
      {attachments.length > 0 && (
        <ChatAttachments
          attachments={attachments}
          onRemove={handleAttachmentRemove}
          className="mb-3"
        />
      )}

      <div className="flex items-end gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFileSelect}
              disabled={disabled || isLoading || isStreaming}
              className="h-10 w-10 shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Attach image</TooltipContent>
        </Tooltip>

        <ChatInputTextarea
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading || isStreaming}
          className="flex-1"
        />

        {showStop ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                onClick={onStop}
                className="h-10 w-10 shrink-0"
              >
                <Square className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop generating</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!canSend}
                className="h-10 w-10 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send message</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};
