// AgentToolResult matches squadhub's tool execution result structure
export type AgentToolResult<T = unknown> = {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  details: T;
};

// ToolResult for squadhub tool invocations (result contains content + details)
export type ToolResult<T = unknown> =
  | { ok: true; result: AgentToolResult<T> }
  | { ok: false; error: { type: string; message: string } };

// DirectResult for operations that don't go through squadhub tools
export type DirectResult<T = unknown> =
  | { ok: true; result: T }
  | { ok: false; error: { type: string; message: string } };

export type ConfigGetResult = {
  config: Record<string, unknown>;
  hash: string;
};

export type ConfigPatchResult = {
  success: boolean;
  hash: string;
};

export type Session = {
  key: string;
  label?: string;
  channel?: string;
  lastActivity?: number;
};

export type SessionsListResult = {
  sessions: Session[];
};

export type ChannelStatus = {
  connected: boolean;
  error?: string;
};

export type GatewayHealthResult = {
  /** Config data returned from gateway config.get - indicates gateway is responsive */
  config?: Record<string, unknown>;
  hash?: string;
};

export type TelegramProbeResult = {
  ok: boolean;
  error?: string | null;
  bot?: {
    id?: number | null;
    username?: string | null;
    canJoinGroups?: boolean | null;
    canReadAllGroupMessages?: boolean | null;
  };
};

export type PairingRequest = {
  id: string;
  code: string;
  createdAt: string;
  lastSeenAt: string;
  meta?: Record<string, string>;
};

export type PairingListResult = {
  requests: PairingRequest[];
};

export type PairingApproveResult = {
  id: string;
  approved: boolean;
};
