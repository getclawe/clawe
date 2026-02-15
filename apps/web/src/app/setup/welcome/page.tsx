"use client";

import { useRouter } from "next/navigation";
import { Button } from "@clawe/ui/components/button";
import { Progress } from "@clawe/ui/components/progress";
import { Globe, MessageCircle, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@clawe/ui/components/tooltip";
import { useSquadhubStatus } from "@/hooks/use-squadhub-status";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 1;

export default function WelcomePage() {
  const router = useRouter();
  const { status, isLoading } = useSquadhubStatus();

  const isOffline = !isLoading && status === "down";

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
          Let&apos;s set up your AI team in a few quick steps.
        </p>

        {/* What you'll need */}
        <div className="space-y-4">
          <p className="text-sm font-medium">You&apos;ll need:</p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
                <Globe className="text-muted-foreground h-4 w-4" />
              </div>
              <span className="text-muted-foreground text-sm">
                Your website URL so we can understand your business
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

        {/* Offline warning */}
        {isOffline && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Squadhub service is offline
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  The squadhub service needs to be running before you can
                  continue. Start it with:
                </p>
                <pre className="rounded-md bg-red-100 px-3 py-2 text-xs text-red-900 dark:bg-red-950/50 dark:text-red-300">
                  sudo docker compose up -d squadhub
                </pre>
                <p className="text-xs text-red-600 dark:text-red-500">
                  This status will update automatically once the service is
                  detected.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA - full width on mobile, right-aligned on larger screens */}
      <div className="flex justify-center pt-6 sm:justify-end sm:pt-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={isOffline ? "cursor-not-allowed" : ""}>
              <Button
                variant="brand"
                className="w-full sm:w-auto"
                disabled={isOffline}
                onClick={() => router.push("/setup/business")}
              >
                Get Started
              </Button>
            </span>
          </TooltipTrigger>
          {isOffline && (
            <TooltipContent>
              <p>Start squadhub to continue</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );
}
