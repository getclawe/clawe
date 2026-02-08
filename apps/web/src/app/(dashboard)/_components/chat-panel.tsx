"use client";

import { cn } from "@clawe/ui/lib/utils";
import { Chat } from "@/components/chat";
import { useChatPanel } from "@/providers/chat-panel-provider";

const CLAWE_SESSION_KEY = "agent:main:main";

export const ChatPanel = () => {
  const { isOpen, close } = useChatPanel();

  return (
    <div
      className={cn(
        "bg-sidebar hidden h-full shrink-0 overflow-hidden py-2 transition-all duration-200 ease-out md:block",
        isOpen ? "ml-1 w-96 pr-2 opacity-100" : "w-0 opacity-0",
      )}
    >
      {isOpen && (
        <div className="bg-background flex h-full flex-col overflow-hidden rounded-xl border">
          <Chat
            sessionKey={CLAWE_SESSION_KEY}
            mode="panel"
            onClose={close}
            className="h-full border-l-0"
          />
        </div>
      )}
    </div>
  );
};
