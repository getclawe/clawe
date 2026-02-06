"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { Button } from "@clawe/ui/components/button";
import { Input } from "@clawe/ui/components/input";
import { Label } from "@clawe/ui/components/label";
import { Progress } from "@clawe/ui/components/progress";
import { Spinner } from "@clawe/ui/components/spinner";
import { CheckCircle2, MessageCircle, Copy, Check } from "lucide-react";
import { api } from "@clawe/backend";
import {
  validateTelegramToken,
  saveTelegramBotToken,
  approvePairingCode,
} from "@/lib/openclaw/actions";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 2;

type Step = "token" | "pairing" | "success";

export default function TelegramPage() {
  const router = useRouter();
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
        accountId: botUsername ?? undefined,
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
          <div className="mb-8 sm:mb-12">
            <Progress
              value={(CURRENT_STEP / TOTAL_STEPS) * 100}
              className="h-1 w-full max-w-sm"
              indicatorClassName="bg-brand"
            />
          </div>

          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>

          <h1 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Pair Your Account
          </h1>
          <p className="text-muted-foreground mb-8">
            Send a message to your bot on Telegram to receive a pairing code.
          </p>

          {/* Instructions */}
          <div className="bg-muted/50 mb-6 space-y-4 rounded-lg p-4">
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

          {/* Pairing code input */}
          <div className="space-y-6">
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
            disabled={pairingMutation.isPending}
          >
            Skip for now
          </Button>
          <Button
            type="submit"
            variant="brand"
            className="w-full sm:w-auto"
            disabled={pairingCode.length < 8 || pairingMutation.isPending}
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
        </div>
      </form>
    );
  }

  // Token step (default)
  return (
    <form onSubmit={handleTokenSubmit} className="flex flex-1 flex-col">
      <div className="max-w-xl flex-1">
        <div className="mb-8 sm:mb-12">
          <Progress
            value={(CURRENT_STEP / TOTAL_STEPS) * 100}
            className="h-1 w-full max-w-sm"
            indicatorClassName="bg-brand"
          />
        </div>

        <h1 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Connect Telegram
        </h1>
        <p className="text-muted-foreground mb-8">
          Enter your Telegram bot token to start receiving messages.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bot-token">Bot Token</Label>
            <Input
              id="bot-token"
              type="password"
              placeholder="123456789:ABCDefGHijKLmnOPqrSTuvWxyZ"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
            <p className="text-muted-foreground text-sm">
              Get your token from{" "}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                @BotFather
              </a>{" "}
              on Telegram
            </p>
          </div>

          {tokenMutation.error && (
            <p className="text-destructive text-sm">
              {tokenMutation.error.message}
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
          disabled={tokenMutation.isPending}
        >
          Skip for now
        </Button>
        <Button
          type="submit"
          variant="brand"
          className="w-full sm:w-auto"
          disabled={!botToken || tokenMutation.isPending}
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
      </div>
    </form>
  );
}
