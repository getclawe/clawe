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
  listPairingRequests,
  approvePairingCode,
  parseToolText,
} from "./client.js";
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
} from "./client.js";

// Gateway Client
export { GatewayClient, createGatewayClient } from "./gateway-client.js";
export type { GatewayClientOptions } from "./gateway-client.js";
export { getSharedClient } from "./shared-client.js";

// Types
export type {
  AgentToolResult,
  ToolResult,
  ConfigGetResult,
  ConfigPatchResult,
  Session,
  SessionsListResult,
  ChannelStatus,
  GatewayHealthResult,
  TelegramProbeResult,
  PairingRequest,
} from "./types.js";

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
} from "./gateway-types.js";
