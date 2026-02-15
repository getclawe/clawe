"use client";

import { useState } from "react";
import { useMutation as useConvexMutation } from "convex/react";
import { toast } from "@clawe/ui/components/sonner";
import { api } from "@clawe/backend";
import { Button } from "@clawe/ui/components/button";
import { Spinner } from "@clawe/ui/components/spinner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@clawe/ui/components/alert-dialog";
import { removeTelegramBot } from "@/lib/squadhub/actions";

export interface TelegramRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botUsername?: string;
}

export const TelegramRemoveDialog = ({
  open,
  onOpenChange,
  botUsername,
}: TelegramRemoveDialogProps) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const disconnectChannel = useConvexMutation(api.channels.disconnect);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      // Remove token from squadhub config
      const result = await removeTelegramBot();
      if (!result.ok) {
        throw new Error("Failed to remove bot token");
      }

      // Update Convex status
      await disconnectChannel({ type: "telegram" });

      toast.success("Telegram integration removed");
      onOpenChange(false);
    } catch {
      toast.error("Failed to remove Telegram integration");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Telegram Integration?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your bot token
            {botUsername && (
              <>
                {" "}
                for <span className="font-medium">@{botUsername}</span>
              </>
            )}
            . You&apos;ll need to set it up again from scratch.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isRemoving}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <>
                <Spinner />
                Removing...
              </>
            ) : (
              "Remove"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
