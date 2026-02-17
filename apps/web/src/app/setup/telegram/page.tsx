"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { Button } from "@clawe/ui/components/button";
import { Input } from "@clawe/ui/components/input";
import { Label } from "@clawe/ui/components/label";
import { Progress } from "@clawe/ui/components/progress";
import { Spinner } from "@clawe/ui/components/spinner";
import {
  CheckCircle2,
  MessageCircle,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@clawe/ui/components/tooltip";
import { useSquadhubStatus } from "@/hooks/use-squadhub-status";
import { api } from "@clawe/backend";
import {
  validateTelegramToken,
  saveTelegramBotToken,
  approvePairingCode,
} from "@/lib/squadhub/actions";
import { SetupRightPanelContent } from "../_components/setup-right-panel";
import { DemoVideo } from "./_components/demo-video";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 3;

type Step = "token" | "pairing" | "success";

const DemoVideoPanel = () => {
  const [videoReady, setVideoReady] = useState(false);

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden">
      {!videoReady && (
        <div className="bg-muted absolute inset-0 z-20 flex items-center justify-center">
          <Spinner className="text-muted-foreground h-8 w-8" />
        </div>
      )}
      <Image src="/telegram-bg.png" alt="" fill className="object-cover" />
      <div className="relative z-10">
        <DemoVideo onLoaded={() => setVideoReady(true)} />
      </div>
    </div>
  );
};

export default function TelegramPage() {
  const router = useRouter();
  const { status, isLoading } = useSquadhubStatus();
  const isOffline = !isLoading && status === "down";
  const [step, setStep] = useState<Step>("token");
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState("");
  const [copied, setCopied] = useState(false);

  const upsertChannel = useConvexMutation(api.channels.upsert);

  // Token validation mutation
  const tokenMutation = useMutation({
    mutationFn: async (token: string) => {
      const probeResult = await validateTelegramToken(token);
      if (!probeResult.ok) {
        throw new Error(probeResult.error || "Invalid bot token");
      }

      const saveResult = await saveTelegramBotToken(token);
      if (!saveResult.ok) {
        throw new Error(saveResult.error.message);
      }

      return probeResult.bot?.username ?? null;
    },
    onSuccess: (username) => {
      setBotUsername(username);
      setStep("pairing");
    },
  });

  // Pairing code approval mutation
  const pairingMutation = useMutation({
    mutationFn: async (code: string) => {
      const result = await approvePairingCode(code);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.result;
    },
    onSuccess: async () => {
      await upsertChannel({
        type: "telegram",
        status: "connected",
        metadata: { botUsername: botUsername ?? undefined },
      });
      setStep("success");
    },
  });

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    tokenMutation.mutate(botToken);
  };

  const handlePairingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pairingMutation.mutate(pairingCode);
  };

  const handleSkip = () => {
    router.push("/setup/complete");
  };

  const handleContinue = () => {
    router.push("/setup/complete");
  };

  const handleCopyUsername = async () => {
    if (botUsername) {
      await navigator.clipboard.writeText(`@${botUsername}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Success state
  if (step === "success") {
    return (
      <div className="flex flex-1 flex-col">
        <div className="max-w-xl flex-1">
          <div className="mb-8 sm:mb-12">
            <Progress
              value={(CURRENT_STEP / TOTAL_STEPS) * 100}
              className="h-1 w-full max-w-sm"
              indicatorClassName="bg-brand"
            />
          </div>

          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>

          <h1 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Telegram Connected
          </h1>
          <p className="text-muted-foreground">
            Your bot <span className="font-medium">@{botUsername}</span> is
            paired and ready to receive messages.
          </p>
        </div>

        <div className="flex justify-center pt-6 sm:justify-end sm:pt-8">
          <Button
            variant="brand"
            className="w-full sm:w-auto"
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Pairing step
  if (step === "pairing") {
    return (
      <form onSubmit={handlePairingSubmit} className="flex flex-1 flex-col">
        <div className="max-w-xl flex-1">
          <div className="mb-6 sm:mb-8">
            <Progress
              value={(CURRENT_STEP / TOTAL_STEPS) * 100}
              className="h-1 w-full max-w-sm"
              indicatorClassName="bg-brand"
            />
          </div>

          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>

          <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Pair Your Account
          </h1>
          <p className="text-muted-foreground mb-5">
            Send a message to your bot on Telegram to receive a pairing code.
          </p>

          {/* Instructions */}
          <div className="bg-muted/50 mb-5 space-y-3 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                1
              </span>
              <div>
                <p className="font-medium">Open Telegram</p>
                <p className="text-muted-foreground text-sm">
                  Search for your bot{" "}
                  <button
                    type="button"
                    onClick={handleCopyUsername}
                    className="hover:text-foreground inline-flex items-center gap-1 font-medium underline underline-offset-2"
                  >
                    @{botUsername}
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                2
              </span>
              <div>
                <p className="font-medium">Send any message</p>
                <p className="text-muted-foreground text-sm">
                  Type &ldquo;hello&rdquo; or any message to start the pairing
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                3
              </span>
              <div>
                <p className="font-medium">Copy the pairing code</p>
                <p className="text-muted-foreground text-sm">
                  The bot will reply with an 8-character code
                </p>
              </div>
            </div>
          </div>

          {/* Offline warning */}
          {isOffline && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Squadhub is offline
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500">
                    The squadhub service needs to be running to verify pairing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pairing code input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pairing-code">Pairing Code</Label>
              <Input
                id="pairing-code"
                type="text"
                placeholder="ABCD1234"
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="font-mono tracking-widest uppercase"
                disabled={isOffline}
              />
            </div>

            {pairingMutation.error && (
              <p className="text-destructive text-sm">
                {pairingMutation.error.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:justify-end sm:pt-8">
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={handleSkip}
            disabled={isOffline || pairingMutation.isPending}
          >
            Skip for now
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={isOffline ? "cursor-not-allowed" : ""}>
                <Button
                  type="submit"
                  variant="brand"
                  className="w-full sm:w-auto"
                  disabled={
                    isOffline ||
                    pairingCode.length < 8 ||
                    pairingMutation.isPending
                  }
                >
                  {pairingMutation.isPending ? (
                    <>
                      <Spinner />
                      Verifying...
                    </>
                  ) : (
                    "Verify Code"
                  )}
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
      </form>
    );
  }

  // Token step (default)
  return (
    <form onSubmit={handleTokenSubmit} className="flex flex-1 flex-col">
      <SetupRightPanelContent>
        <DemoVideoPanel />
      </SetupRightPanelContent>
      <div className="max-w-xl flex-1">
        <div className="mb-6 sm:mb-8">
          <Progress
            value={(CURRENT_STEP / TOTAL_STEPS) * 100}
            className="h-1 w-full max-w-sm"
            indicatorClassName="bg-brand"
          />
        </div>

        <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Connect Telegram
        </h1>
        <p className="text-muted-foreground mb-5">
          Create a Telegram bot and connect it to Clawe so your AI agents can
          receive and respond to messages.
        </p>

        {/* How to get your bot token */}
        <div className="mb-5">
          <h2 className="mb-3 text-sm font-medium">
            How to get your bot token?
          </h2>
          <ol className="space-y-2">
            <li className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                1
              </span>
              <p className="text-muted-foreground text-sm">
                Open Telegram and go to{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground font-medium underline underline-offset-2"
                >
                  @BotFather
                </a>
                .
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                2
              </span>
              <p className="text-muted-foreground text-sm">
                Start a chat and type{" "}
                <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium">
                  /newbot
                </code>
                .
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                3
              </span>
              <p className="text-muted-foreground text-sm">
                Follow the prompts to name your bot and choose a username.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                4
              </span>
              <p className="text-muted-foreground text-sm">
                BotFather will send you a message with your bot token.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                5
              </span>
              <p className="text-muted-foreground text-sm">
                Copy & Paste the token (it looks like a long string of numbers
                and letters) in the field below and click Connect.
              </p>
            </li>
          </ol>
        </div>

        {/* Offline warning */}
        {isOffline && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Squadhub is offline
                </p>
                <p className="text-xs text-red-600 dark:text-red-500">
                  The squadhub service needs to be running to connect Telegram.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Token input */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-token">Enter bot token</Label>
            <Input
              id="bot-token"
              type="password"
              placeholder="123456789:ABCDefGHijKLmnOPqrSTuvWxyZ"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              disabled={isOffline}
            />
          </div>

          {tokenMutation.error && (
            <p className="text-destructive text-sm">
              {tokenMutation.error.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end sm:pt-6">
        <Button
          type="button"
          variant="ghost"
          className="w-full sm:w-auto"
          onClick={handleSkip}
          disabled={isOffline || tokenMutation.isPending}
        >
          Skip for now
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={isOffline ? "cursor-not-allowed" : ""}>
              <Button
                type="submit"
                variant="brand"
                className="w-full sm:w-auto"
                disabled={isOffline || !botToken || tokenMutation.isPending}
              >
                {tokenMutation.isPending ? (
                  <>
                    <Spinner />
                    Connecting...
                  </>
                ) : (
                  "Connect"
                )}
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
    </form>
  );
}
