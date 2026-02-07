"use client";

import { Bot, Loader2 } from "lucide-react";
import { cn } from "@clawe/ui/lib/utils";

export type ChatThinkingProps = {
  activity?: string;
  className?: string;
};

export const ChatThinking = ({ activity, className }: ChatThinkingProps) => {
  return (
    <div className={cn("flex gap-3", className)}>
      {/* Avatar */}
      <div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <Bot className="h-4 w-4" />
      </div>

      {/* Thinking indicator */}
      <div className="bg-muted flex items-center gap-2 rounded-2xl px-4 py-3">
        {activity ? (
          <>
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            <span className="text-muted-foreground text-sm">{activity}</span>
          </>
        ) : (
          <>
            <ThinkingDot delay={0} />
            <ThinkingDot delay={150} />
            <ThinkingDot delay={300} />
          </>
        )}
      </div>
    </div>
  );
};

type ThinkingDotProps = {
  delay: number;
};

const ThinkingDot = ({ delay }: ThinkingDotProps) => {
  return (
    <span
      className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
};
