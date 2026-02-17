"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import { Button } from "@clawe/ui/components/button";
import { Progress } from "@clawe/ui/components/progress";
import { Chat } from "@/components/chat";
import { useAuth } from "@/providers/auth-provider";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 2;

// Session key for Clawe agent
const CLAWE_SESSION_KEY = "agent:main:main";

export default function BusinessPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Real-time subscription - auto-updates when CLI saves
  const businessContext = useQuery(
    api.businessContext.get,
    isAuthenticated ? {} : "skip",
  );
  const canContinue = businessContext !== null && businessContext !== undefined;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Progress indicator */}
      <div className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
        <Progress
          value={(CURRENT_STEP / TOTAL_STEPS) * 100}
          className="h-1 w-full max-w-sm"
          indicatorClassName="bg-brand"
        />
      </div>

      {/* Chat area - takes remaining space */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <Chat
          sessionKey={CLAWE_SESSION_KEY}
          mode="full"
          hideHeader
          autoSendMessage="Hey!"
        />
      </div>

      {/* Continue button - enabled when business context is saved */}
      <div className="shrink-0 border-t px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl justify-end">
          <Button
            variant="brand"
            disabled={!canContinue}
            onClick={() => router.push("/setup/telegram")}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
