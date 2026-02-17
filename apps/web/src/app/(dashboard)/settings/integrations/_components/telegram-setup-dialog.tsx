"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { toast } from "@clawe/ui/components/sonner";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { api } from "@clawe/backend";
import { Button } from "@clawe/ui/components/button";
import { Input } from "@clawe/ui/components/input";
import { Label } from "@clawe/ui/components/label";
import { Spinner } from "@clawe/ui/components/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@clawe/ui/components/dialog";
import { useSquadhubStatus } from "@/hooks/use-squadhub-status";
import {
  validateTelegramToken,
  saveTelegramBotToken,
  approvePairingCode,
} from "@/lib/squadhub/actions";

type Step = "token" | "pairing" | "success";

export interface TelegramSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TelegramSetupDialog = ({
  open,
  onOpenChange,
}: TelegramSetupDialogProps) => {
  const { status, isLoading: isSquadhubLoading } = useSquadhubStatus();
  const isOffline = !isSquadhubLoading && status === "down";

  const [step, setStep] = useState<Step>("token");
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState("");
  const [copied, setCopied] = useState(false);

  const upsertChannel = useConvexMutation(api.channels.upsert);

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setStep("token");
      setBotToken("");
      setBotUsername(null);
      setPairingCode("");
    }, 200);
  };

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
      toast.success("Telegram connected successfully");
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

  const handleCopyUsername = async () => {
    if (botUsername) {
      await navigator.clipboard.writeText(`@${botUsername}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Success step
  if (step === "success") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Telegram Connected</DialogTitle>
            <DialogDescription>
              Your bot <span className="font-medium">@{botUsername}</span> is
              paired and ready to receive messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Pairing step
  if (step === "pairing") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <Image
              src="/telegram.svg"
              alt="Telegram"
              width={40}
              height={40}
              className="mb-2"
            />
            <DialogTitle>Pair Your Account</DialogTitle>
            <DialogDescription>
              Send a message to your bot on Telegram to receive a pairing code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-muted/50 space-y-3 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                  1
                </span>
                <div>
                  <p className="text-sm font-medium">Open Telegram</p>
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
                  <p className="text-sm font-medium">Send any message</p>
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
                  <p className="text-sm font-medium">Copy the pairing code</p>
                  <p className="text-muted-foreground text-sm">
                    The bot will reply with an 8-character code
                  </p>
                </div>
              </div>
            </div>

            {/* Offline warning */}
            {isOffline && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      Squadhub is offline
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-500">
                      The squadhub service needs to be running to verify
                      pairing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pairing code input */}
            <form onSubmit={handlePairingSubmit} className="space-y-4">
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={pairingMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
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
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Token step (default)
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Telegram</DialogTitle>
          <DialogDescription>
            Create a Telegram bot and connect it to Clawe so your AI agents can
            receive and respond to messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* How to get your bot token */}
          <div>
            <h3 className="mb-3 text-sm font-medium">
              How to get your bot token?
            </h3>
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
            </ol>
          </div>

          {/* Offline warning */}
          {isOffline && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Squadhub is offline
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500">
                    The squadhub service needs to be running to connect
                    Telegram.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Token input */}
          <form onSubmit={handleTokenSubmit} className="space-y-4">
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

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={tokenMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
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
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
