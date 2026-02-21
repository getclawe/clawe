import { GatewayClient, createGatewayClient } from "./gateway-client.js";
import type { GatewayClientOptions } from "./gateway-client.js";
import type { SquadhubConnection } from "./client.js";

let sharedClient: GatewayClient | null = null;
let connectingPromise: Promise<void> | null = null;

/**
 * Get a shared, long-lived GatewayClient singleton.
 * Reconnects automatically if the connection drops.
 */
export async function getSharedClient(
  connection: SquadhubConnection,
  options?: Partial<Omit<GatewayClientOptions, "url" | "token">>,
): Promise<GatewayClient> {
  if (sharedClient?.isConnected()) {
    return sharedClient;
  }

  // If already reconnecting, wait for it
  if (connectingPromise) {
    await connectingPromise;
    if (sharedClient?.isConnected()) {
      return sharedClient;
    }
  }

  // Create new client
  connectingPromise = (async () => {
    sharedClient?.close();
    sharedClient = createGatewayClient(connection, {
      ...options,
      onClose: (_code, _reason) => {
        // Mark as disconnected; next call will reconnect
        sharedClient = null;
        connectingPromise = null;
        options?.onClose?.(_code, _reason);
      },
      onError: (error) => {
        options?.onError?.(error);
      },
    });
    await sharedClient.connect();
  })();

  try {
    await connectingPromise;
  } catch (err) {
    sharedClient = null;
    connectingPromise = null;
    throw err;
  } finally {
    connectingPromise = null;
  }

  return sharedClient!;
}
