import { mutation } from "../client.js";
import { api } from "@clawe/backend";

interface NotifyOptions {
  from?: string;
}

export async function notify(
  targetSessionKey: string,
  message: string,
  options: NotifyOptions,
): Promise<void> {
  await mutation(api.notifications.send, {
    targetSessionKey,
    sourceSessionKey: options.from,
    type: "custom",
    content: message,
  });

  console.log("✅ Notification sent");
}
