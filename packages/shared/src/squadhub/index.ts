// Client
export {
  checkHealth,
  saveTelegramBotToken,
  removeTelegramBotToken,
  probeTelegramToken,
  getConfig,
  patchConfig,
  listSessions,
  sendMessage,
  sessionsSend,
  cronList,
  cronAdd,
} from "./client";
export type {
  SquadhubConnection,
  CronJob,
  CronListResult,
  CronAddJob,
  CronSchedule,
  CronSessionTarget,
  CronWakeMode,
  CronDeliveryMode,
  CronDelivery,
  CronPayload,
  CronJobState,
} from "./client";

// Gateway Client
export { GatewayClient, createGatewayClient } from "./gateway-client";
export type { GatewayClientOptions } from "./gateway-client";
export { getSharedClient } from "./shared-client";

// Pairing
export {
  listChannelPairingRequests,
  approveChannelPairingCode,
} from "./pairing";

// Types
export type {
  AgentToolResult,
  ToolResult,
  DirectResult,
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
