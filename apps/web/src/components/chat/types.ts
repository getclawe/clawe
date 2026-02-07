// Client-side Chat Types

export type ChatStatus = "idle" | "loading" | "streaming" | "error";

export type MessageRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: MessageContent[];
  timestamp: number;
  isStreaming?: boolean;
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
    type: "base64" | "url";
    media_type?: string;
    data?: string;
    url?: string;
  };
};

export type ToolUseContent = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
  status?: "running" | "completed" | "error";
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

export type ChatAttachment = {
  id: string;
  file: File;
  dataUrl: string;
  mimeType: string;
  name: string;
};

export type ChatConfig = {
  sessionKey: string;
};

// SSE Event types from API
export type SSEDeltaEvent = {
  runId: string;
  message: ChatMessage;
  seq: number;
};

export type SSEFinalEvent = {
  runId: string;
  message: ChatMessage;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  stopReason?: string;
};

export type SSEErrorEvent = {
  runId?: string;
  message: string;
};

export type SSEAbortedEvent = {
  runId: string;
};

export type SSEConnectedEvent = {
  sessionKey: string;
};

export type StreamEvent =
  | { type: "connected"; data: SSEConnectedEvent }
  | { type: "delta"; data: SSEDeltaEvent }
  | { type: "final"; data: SSEFinalEvent }
  | { type: "error"; data: SSEErrorEvent }
  | { type: "aborted"; data: SSEAbortedEvent };

// useChat hook types
export type UseChatOptions = {
  sessionKey: string;
  onError?: (error: Error) => void;
  onFinish?: (message: ChatMessage) => void;
};

export type UseChatReturn = {
  messages: ChatMessage[];
  input: string;
  setInput: (input: string) => void;
  status: ChatStatus;
  error: Error | null;
  sendMessage: (text: string, attachments?: ChatAttachment[]) => Promise<void>;
  loadHistory: () => Promise<void>;
  abort: () => Promise<void>;
  isLoading: boolean;
  isStreaming: boolean;
};
