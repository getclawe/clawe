"use client";

import { useRouter } from "next/navigation";
import { Button } from "@clawe/ui/components/button";
import { Progress } from "@clawe/ui/components/progress";
import { Bot, Key, MessageCircle } from "lucide-react";

const TOTAL_STEPS = 5;
const CURRENT_STEP = 1;

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col">
      {/* Content - constrained width */}
      <div className="max-w-xl flex-1">
        {/* Progress indicator */}
        <div className="mb-8 sm:mb-12">
          <Progress
            value={(CURRENT_STEP / TOTAL_STEPS) * 100}
            className="h-1 w-full max-w-sm"
            indicatorClassName="bg-brand"
          />
        </div>

        {/* Header */}
        <h1 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome to Clawe
        </h1>
        <p className="text-muted-foreground mb-6 sm:mb-8">
          Let&apos;s set up your AI agent in a few simple steps.
        </p>

        {/* What you'll need */}
        <div className="space-y-4">
          <p className="text-sm font-medium">You&apos;ll need:</p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
                <Bot className="text-muted-foreground h-4 w-4" />
              </div>
              <span className="text-muted-foreground text-sm">
                A Convex account for data storage
              </span>
            </li>
            <li className="flex items-center gap-3">
              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
                <Key className="text-muted-foreground h-4 w-4" />
              </div>
              <span className="text-muted-foreground text-sm">
                An Anthropic or OpenAI API key
              </span>
            </li>
            <li className="flex items-center gap-3">
              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
                <MessageCircle className="text-muted-foreground h-4 w-4" />
              </div>
              <span className="text-muted-foreground text-sm">
                A Telegram bot token from @BotFather
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* CTA - full width on mobile, right-aligned on larger screens */}
      <div className="flex justify-center pt-6 sm:justify-end sm:pt-8">
        <Button
          variant="brand"
          className="w-full sm:w-auto"
          onClick={() => router.push("/setup/convex")}
        >
          Get Started
        </Button>
      </div>
    </div>
  );
}
