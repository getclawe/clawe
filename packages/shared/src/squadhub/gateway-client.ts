import WebSocket from "ws";
import type {
  GatewayResponseFrame,
  GatewayEventFrame,
  ConnectParams,
  HelloOkResponse,
  ChatEvent,
} from "./gateway-types";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export type GatewayClientOptions = {
  url: string;
  token?: string;
  onEvent?: (event: GatewayEventFrame) => void;
  onChatEvent?: (event: ChatEvent) => void;
  onClose?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
};

const PROTOCOL_VERSION = 3;

/**
 * Server-side WebSocket client for squadhub gateway.
 * Used by API routes to communicate with squadhub.
 */
export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private connected = false;
  private connectPromise: Promise<HelloOkResponse> | null = null;
  private requestCounter = 0;
  private options: GatewayClientOptions;

  constructor(options: GatewayClientOptions) {
    this.options = options;
  }

  /**
   * Connect to the gateway and complete the handshake.
   */
  async connect(): Promise<HelloOkResponse> {
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.doConnect();
    return this.connectPromise;
  }

  private async doConnect(): Promise<HelloOkResponse> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.options.url.replace(/^http/, "ws");
      this.ws = new WebSocket(wsUrl);

      let connectSent = false;

      this.ws.on("open", () => {
        // Wait for challenge event
      });

      this.ws.on("message", (data: WebSocket.RawData) => {
        const raw = data.toString();
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return;
        }

        const frame = parsed as { type?: string };

        // Handle challenge event
        if (frame.type === "event") {
          const event = parsed as GatewayEventFrame;

          if (event.event === "connect.challenge") {
            if (!connectSent) {
              connectSent = true;
              this.sendConnectRequest()
                .then((hello) => {
                  this.connected = true;
                  resolve(hello);
                })
                .catch(reject);
            }
            return;
          }

          // Handle chat events
          if (event.event === "chat") {
            const chatEvent = event.payload as ChatEvent;
            this.options.onChatEvent?.(chatEvent);
          }

          this.options.onEvent?.(event);
          return;
        }

        // Handle response frames
        if (frame.type === "res") {
          const response = parsed as GatewayResponseFrame;
          const pending = this.pending.get(response.id);
          if (pending) {
            this.pending.delete(response.id);
            if (response.ok) {
              pending.resolve(response.payload);
            } else {
              pending.reject(
                new Error(response.error?.message ?? "Request failed"),
              );
            }
          }
        }
      });

      this.ws.on("close", (code: number, reason: Buffer) => {
        this.connected = false;
        this.ws = null;
        this.connectPromise = null;
        this.flushPending(new Error(`Connection closed: ${code} ${reason}`));
        this.options.onClose?.(code, reason.toString());
      });

      this.ws.on("error", (error: Error) => {
        this.options.onError?.(error);
        reject(error);
      });

      // Timeout if no challenge received
      setTimeout(() => {
        if (!connectSent) {
          // Some gateways don't send challenge, try connecting directly
          connectSent = true;
          this.sendConnectRequest()
            .then((hello) => {
              this.connected = true;
              resolve(hello);
            })
            .catch(reject);
        }
      }, 1000);
    });
  }

  private async sendConnectRequest(): Promise<HelloOkResponse> {
    const params: ConnectParams = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: "gateway-client",
        version: "1.0.0",
        platform: "node",
        mode: "backend",
      },
      role: "operator",
      scopes: ["operator.read", "operator.write"],
      caps: [],
      auth: this.options.token ? { token: this.options.token } : undefined,
      userAgent: "clawe/1.0.0",
      locale: "en-US",
    };

    const hello = await this.request<HelloOkResponse>("connect", params);
    return hello;
  }

  /**
   * Send a request to the gateway and wait for response.
   */
  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Gateway not connected");
    }

    const id = this.generateId();
    const frame = { type: "req", id, method, params };

    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });

      try {
        const message = JSON.stringify(frame);
        // Check message size (WebSocket typically has 1MB limit)
        const sizeInBytes = Buffer.byteLength(message, "utf8");
        const maxSize = 1024 * 1024; // 1MB
        if (sizeInBytes > maxSize) {
          this.pending.delete(id);
          reject(
            new Error(
              `Message too large (${Math.round(sizeInBytes / 1024)}KB). Please use a smaller image.`,
            ),
          );
          return;
        }
        this.ws!.send(message);
      } catch (err) {
        this.pending.delete(id);
        reject(
          err instanceof Error ? err : new Error("Failed to send message"),
        );
      }
    });
  }

  /**
   * Close the connection.
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.connectPromise = null;
    this.flushPending(new Error("Client closed"));
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  private generateId(): string {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  private flushPending(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}

/**
 * Create a gateway client with explicit connection params.
 */
export function createGatewayClient(
  connection: { squadhubUrl: string; squadhubToken: string },
  options?: Partial<Omit<GatewayClientOptions, "url" | "token">>,
): GatewayClient {
  return new GatewayClient({
    url: connection.squadhubUrl,
    token: connection.squadhubToken,
    ...options,
  });
}
