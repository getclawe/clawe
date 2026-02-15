"use client";

import { memo } from "react";
import { Bot, User, Info } from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/hooks/use-chat";

/**
 * Context message patterns - messages injected by squadhub for context.
 */
const CONTEXT_MESSAGE_PATTERNS = [
  /^\[Chat messages since your last reply/i,
  /\[Current message - respond to this\]/i,
];

const isContextMessage = (content: string): boolean => {
  return CONTEXT_MESSAGE_PATTERNS.some((pattern) => pattern.test(content));
};

export type ChatMessageProps = {
  message: Message;
  className?: string;
};

export const ChatMessage = memo(function ChatMessage({
  message,
  className,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const isContext = isContextMessage(message.content);

  // Context/System messages - centered, subtle design
  if (isContext) {
    return (
      <div className={cn("flex justify-center px-4 py-2", className)}>
        <div className="border-border/50 bg-muted/30 flex max-w-[90%] min-w-0 items-start gap-2 rounded-lg border border-dashed px-4 py-3">
          <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-muted-foreground mb-1 block text-xs font-medium tracking-wide uppercase">
              Context
            </span>
            <div className="text-muted-foreground prose prose-sm dark:prose-invert max-w-none break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children, ...props }) => (
                    <p className="my-1 text-sm" {...props}>
                      {children}
                    </p>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul className="my-1 list-disc pl-4 text-sm" {...props}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children, ...props }) => (
                    <ol className="my-1 list-decimal pl-4 text-sm" {...props}>
                      {children}
                    </ol>
                  ),
                  li: ({ children, ...props }) => (
                    <li className="my-0.5" {...props}>
                      {children}
                    </li>
                  ),
                  strong: ({ children, ...props }) => (
                    <strong className="font-semibold" {...props}>
                      {children}
                    </strong>
                  ),
                  code: ({ children, className: codeClassName, ...props }) => {
                    const isInline = !codeClassName;
                    return isInline ? (
                      <code
                        className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs break-all dark:bg-white/10"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code className="font-mono text-xs" {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children, ...props }) => (
                    <pre
                      className="my-2 overflow-auto rounded-md bg-black/10 p-2 dark:bg-white/10"
                      {...props}
                    >
                      {children}
                    </pre>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className,
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex max-w-[80%] min-w-0 flex-col gap-1",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "max-w-full min-w-0 rounded-2xl px-4 py-2",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          )}
        >
          {isUser ? (
            <p className="text-sm break-words whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children, ...props }) => (
                    <h1 className="my-3 text-lg font-bold" {...props}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2 className="my-2.5 text-base font-bold" {...props}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3 className="my-2 text-sm font-bold" {...props}>
                      {children}
                    </h3>
                  ),
                  p: ({ children, ...props }) => (
                    <p className="my-1.5 text-sm" {...props}>
                      {children}
                    </p>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul className="my-1.5 list-disc pl-4 text-sm" {...props}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children, ...props }) => (
                    <ol className="my-1.5 list-decimal pl-4 text-sm" {...props}>
                      {children}
                    </ol>
                  ),
                  li: ({ children, ...props }) => (
                    <li className="my-0.5" {...props}>
                      {children}
                    </li>
                  ),
                  strong: ({ children, ...props }) => (
                    <strong className="font-semibold" {...props}>
                      {children}
                    </strong>
                  ),
                  code: ({ children, className, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code
                        className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs dark:bg-white/10"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code className="font-mono text-xs" {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children, ...props }) => (
                    <pre
                      className="my-2 overflow-auto rounded-md bg-black/10 p-2 dark:bg-white/10"
                      {...props}
                    >
                      {children}
                    </pre>
                  ),
                  a: ({ children, ...props }) => (
                    <a
                      className="text-primary underline underline-offset-2"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        {message.createdAt && (
          <span className="text-muted-foreground px-1 text-xs">
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
});

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};
