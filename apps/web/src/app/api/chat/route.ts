import { NextRequest } from "next/server";
import {
  GatewayClient,
  createGatewayClient,
} from "@/lib/openclaw/gateway-client";
import type {
  ChatEvent,
  ChatSendParams,
  ChatAttachment,
} from "@/lib/openclaw/gateway-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatRequestBody = {
  sessionKey: string;
  message: string;
  attachments?: Array<{
    type: "image";
    mimeType: string;
    content: string;
  }>;
};

/**
 * POST /api/chat
 * Send a chat message and stream the response via SSE.
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = (await request.json()) as ChatRequestBody;
    const { sessionKey, message, attachments } = body;

    if (!sessionKey || typeof sessionKey !== "string") {
      return new Response(JSON.stringify({ error: "sessionKey is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };

        let client: GatewayClient | null = null;

        try {
          // Create gateway client with chat event handler
          client = createGatewayClient({
            onChatEvent: (chatEvent: ChatEvent) => {
              if (chatEvent.sessionKey !== sessionKey) {
                return;
              }

              switch (chatEvent.state) {
                case "delta":
                  sendEvent("delta", {
                    runId: chatEvent.runId,
                    message: chatEvent.message,
                    seq: chatEvent.seq,
                  });
                  break;
                case "final":
                  sendEvent("final", {
                    runId: chatEvent.runId,
                    message: chatEvent.message,
                    usage: chatEvent.usage,
                    stopReason: chatEvent.stopReason,
                  });
                  break;
                case "aborted":
                  sendEvent("aborted", {
                    runId: chatEvent.runId,
                  });
                  break;
                case "error":
                  sendEvent("error", {
                    runId: chatEvent.runId,
                    message: chatEvent.errorMessage,
                  });
                  break;
              }
            },
            onClose: () => {
              controller.close();
            },
            onError: (error) => {
              sendEvent("error", { message: error.message });
              controller.close();
            },
          });

          // Connect to gateway
          await client.connect();
          sendEvent("connected", { sessionKey });

          // Generate idempotency key
          const idempotencyKey = `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`;

          // Prepare attachments
          const apiAttachments: ChatAttachment[] | undefined = attachments?.map(
            (att) => ({
              type: "image" as const,
              mimeType: att.mimeType,
              content: att.content,
            }),
          );

          // Send chat message
          const params: ChatSendParams = {
            sessionKey,
            message,
            deliver: false,
            idempotencyKey,
            attachments: apiAttachments,
          };

          await client.request("chat.send", params);

          // Keep connection open for events
          // The stream will close when final/error/aborted event is received
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          sendEvent("error", { message: errorMessage });
          client?.close();
          controller.close();
        }

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          client?.close();
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
