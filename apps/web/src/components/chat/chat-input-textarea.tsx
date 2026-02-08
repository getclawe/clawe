"use client";

import { useRef, useEffect } from "react";
import { cn } from "@clawe/ui/lib/utils";

export type ChatInputTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minRows?: number;
  maxRows?: number;
};

export const ChatInputTextarea = ({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  className,
  minRows = 1,
  maxRows = 5,
}: ChatInputTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Calculate heights (text-sm with leading-relaxed + py-2 padding)
    const lineHeight = 24;
    const verticalPadding = 16; // py-2 = 8px top + 8px bottom
    const minHeight = lineHeight * minRows + verticalPadding;
    const maxHeight = lineHeight * maxRows + verticalPadding;

    // When empty, use fixed minimum height (avoids scrollHeight issues with placeholder)
    if (!value.trim()) {
      textarea.style.height = `${minHeight}px`;
      return;
    }

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Set the height based on content, clamped between min and max
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, minHeight),
      maxHeight,
    );
    textarea.style.height = `${newHeight}px`;
  }, [value, minRows, maxRows]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      rows={minRows}
      className={cn(
        "border-input bg-background w-full resize-none rounded-lg border px-3 py-2",
        "placeholder:text-muted-foreground text-sm leading-relaxed",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
};
