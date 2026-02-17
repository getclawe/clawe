"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@clawe/backend";
import { Button } from "@clawe/ui/components/button";
import { Badge } from "@clawe/ui/components/badge";
import { Skeleton } from "@clawe/ui/components/skeleton";
import { useSquadhubStatus } from "@/hooks/use-squadhub-status";
import { TelegramSetupDialog } from "./telegram-setup-dialog";
import { TelegramDisconnectDialog } from "./telegram-disconnect-dialog";
import { TelegramRemoveDialog } from "./telegram-remove-dialog";

export const TelegramIntegrationCard = () => {
  const channel = useQuery(api.channels.getByType, { type: "telegram" });
  const { status: squadhubStatus, isLoading: isSquadhubLoading } =
    useSquadhubStatus();

  const [setupOpen, setSetupOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const isLoading = channel === undefined;
  const isConnected = channel?.status === "connected";
  const isOffline = !isSquadhubLoading && squadhubStatus === "down";

  if (isLoading) {
    return <TelegramCardSkeleton />;
  }

  return (
    <>
      <div className="flex w-52 flex-col rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <Image
            src="/telegram.svg"
            alt="Telegram"
            width={40}
            height={40}
            className="shrink-0"
          />
          {isConnected ? (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              Connected
            </Badge>
          ) : (
            <Badge variant="outline">Not connected</Badge>
          )}
        </div>

        <h3 className="mb-1 font-medium">Telegram</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {isConnected
            ? `@${channel.metadata?.botUsername ?? "connected"}`
            : "Receive and respond to messages"}
        </p>

        <div className="mt-auto space-y-2">
          {isConnected ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => setDisconnectOpen(true)}
                disabled={isOffline}
              >
                Disconnect
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setRemoveOpen(true)}
                disabled={isOffline}
              >
                Remove
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setSetupOpen(true)}
              disabled={isOffline}
            >
              Connect
            </Button>
          )}
          {isOffline && (
            <p className="text-muted-foreground text-center text-xs">
              Squadhub is offline
            </p>
          )}
        </div>
      </div>

      <TelegramSetupDialog open={setupOpen} onOpenChange={setSetupOpen} />
      <TelegramDisconnectDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        botUsername={channel?.metadata?.botUsername}
      />
      <TelegramRemoveDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        botUsername={channel?.metadata?.botUsername}
      />
    </>
  );
};

const TelegramCardSkeleton = () => {
  return (
    <div className="flex w-52 flex-col rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mb-1 h-5 w-20" />
      <Skeleton className="mb-4 h-4 w-32" />
      <Skeleton className="mt-auto h-8 w-full" />
    </div>
  );
};
