// Client
export {
  checkHealth,
  saveTelegramBotToken,
  probeTelegramToken,
  getConfig,
  patchConfig,
  listSessions,
  sendMessage,
  sessionsSend,
  cronList,
  cronAdd,
} from "./client";
export type { CronJob, CronListResult, CronAddJob } from "./client";

// Gateway Client
export { GatewayClient, createGatewayClient } from "./gateway-client";
export type { GatewayClientOptions } from "./gateway-client";

// Pairing
export {
  listChannelPairingRequests,
  approveChannelPairingCode,
} from "./pairing";

// Types
export type {
  ToolResult,
  ConfigGetResult,
  ConfigPatchResult,
  Session,
  SessionsListResult,
  ChannelStatus,
  GatewayHealthResult,
  TelegramProbeResult,
  PairingRequest,
  PairingListResult,
  PairingApproveResult,
} from "./types";

// Gateway Types
export type {
  GatewayRequestFrame,
  GatewayResponseFrame,
  GatewayEventFrame,
  GatewayFrame,
  GatewayError,
  ConnectParams,
  HelloOkResponse,
  ChatSendParams,
  ChatHistoryParams,
  ChatAbortParams,
  ChatAttachment,
  ChatEventState,
  ChatEvent,
  ChatUsage,
  MessageRole,
  ChatMessage,
  MessageContent,
  TextContent,
  ImageContent,
  ToolUseContent,
  ToolResultContent,
  ThinkingContent,
  ChatHistoryResponse,
  SSEEventType,
  SSEEvent,
} from "./gateway-types";
