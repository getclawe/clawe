// Gateway WebSocket Protocol Types
// Based on OpenClaw Gateway Protocol v3

// Frame Types
export type GatewayRequestFrame = {
  type: "req";
  id: string;
  method: string;
  params?: unknown;
};

export type GatewayResponseFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: GatewayError;
};

export type GatewayEventFrame = {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: { presence: number; health: number };
};

export type GatewayFrame =
  | GatewayRequestFrame
  | GatewayResponseFrame
  | GatewayEventFrame;

export type GatewayError = {
  code: string;
  message: string;
  details?: unknown;
};

// Connection Types
export type ConnectParams = {
  minProtocol: number;
  maxProtocol: number;
  client: {
    id: string;
    version: string;
    platform: string;
    mode: string;
    instanceId?: string;
  };
  role: string;
  scopes: string[];
  caps: string[];
  auth?: {
    token?: string;
    password?: string;
  };
  userAgent?: string;
  locale?: string;
};

export type HelloOkResponse = {
  type: "hello-ok";
  protocol: number;
  features?: {
    methods?: string[];
    events?: string[];
  };
  snapshot?: unknown;
  auth?: {
    deviceToken?: string;
    role?: string;
    scopes?: string[];
    issuedAtMs?: number;
  };
  policy?: {
    tickIntervalMs?: number;
  };
};

// Chat Types
export type ChatSendParams = {
  sessionKey: string;
  message: string;
  thinking?: string;
  deliver?: boolean;
  attachments?: ChatAttachment[];
  timeoutMs?: number;
  idempotencyKey: string;
};

export type ChatHistoryParams = {
  sessionKey: string;
  limit?: number;
};

export type ChatAbortParams = {
  sessionKey: string;
  runId?: string;
};

export type ChatAttachment = {
  type: "image";
  mimeType: string;
  content: string; // base64
};

// Chat Event Types
export type ChatEventState = "delta" | "final" | "aborted" | "error";

export type ChatEvent = {
  runId: string;
  sessionKey: string;
  seq: number;
  state: ChatEventState;
  message?: ChatMessage;
  errorMessage?: string;
  usage?: ChatUsage;
  stopReason?: string;
};

export type ChatUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
};

// Message Types
export type MessageRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: MessageRole;
  content: MessageContent[];
  timestamp?: number;
};

export type MessageContent =
  | TextContent
  | ImageContent
  | ToolUseContent
  | ToolResultContent
  | ThinkingContent;

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
};

export type ToolUseContent = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};

export type ToolResultContent = {
  type: "tool_result";
  tool_use_id: string;
  content: string | MessageContent[];
  is_error?: boolean;
};

export type ThinkingContent = {
  type: "thinking";
  thinking: string;
};

// History Response
export type ChatHistoryResponse = {
  messages: ChatMessage[];
  thinkingLevel?: string;
};

// SSE Event Types for HTTP Proxy
export type SSEEventType =
  | "connected"
  | "delta"
  | "tool"
  | "lifecycle"
  | "final"
  | "error";

export type SSEEvent = {
  type: SSEEventType;
  data: unknown;
};
