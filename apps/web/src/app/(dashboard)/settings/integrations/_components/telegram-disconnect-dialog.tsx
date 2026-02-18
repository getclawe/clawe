"use client";

import { useState } from "react";
import { useMutation as useConvexMutation } from "convex/react";
import { toast } from "@clawe/ui/components/sonner";
import { api } from "@clawe/backend";
import { Button } from "@clawe/ui/components/button";
import { Spinner } from "@clawe/ui/components/spinner";
import { removeTelegramBot } from "@/lib/squadhub/actions";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@clawe/ui/components/alert-dialog";

export interface TelegramDisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botUsername?: string;
}

export const TelegramDisconnectDialog = ({
  open,
  onOpenChange,
  botUsername,
}: TelegramDisconnectDialogProps) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const disconnectChannel = useConvexMutation(api.channels.disconnect);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      // Remove token from squadhub config
      await removeTelegramBot();

      // Update Convex status
      await disconnectChannel({ type: "telegram" });
      toast.success("Telegram disconnected");
      onOpenChange(false);
    } catch {
      toast.error("Failed to disconnect Telegram");
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect Telegram?</AlertDialogTitle>
          <AlertDialogDescription>
            Your bot{" "}
            {botUsername && <span className="font-medium">@{botUsername}</span>}{" "}
            will stop receiving messages. You can reconnect anytime by adding a
            new bot token.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isDisconnecting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? (
              <>
                <Spinner />
                Disconnecting...
              </>
            ) : (
              "Disconnect"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
