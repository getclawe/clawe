"use client";

import { useRef, useCallback, useEffect } from "react";
import { cn } from "@clawe/ui/lib/utils";

export type ChatInputTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxRows?: number;
};

export const ChatInputTextarea = ({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  className,
  maxRows = 6,
}: ChatInputTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset to single row to get accurate scrollHeight
    textarea.style.height = "auto";

    const style = getComputedStyle(textarea);
    const lineHeight = parseFloat(style.lineHeight);
    const paddingTop = parseFloat(style.paddingTop);
    const paddingBottom = parseFloat(style.paddingBottom);
    const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;

    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [maxRows]);

  // Reset height when value is cleared externally (e.g. after send)
  useEffect(() => {
    if (!value) resize();
  }, [value, resize]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      resize();
    },
    [onChange, resize],
  );

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      className={cn(
        "border-input bg-background w-full resize-none overflow-y-auto rounded-lg border px-3 py-2",
        "placeholder:text-muted-foreground text-sm leading-relaxed",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
};
