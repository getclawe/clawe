import type { TObject } from "@sinclair/typebox";

/**
 * Minimal type definitions for the OpenClaw plugin API.
 * Only the surface we actually use — avoids importing from openclaw.
 */

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  details?: Record<string, unknown>;
};

export type AgentTool = {
  name: string;
  description: string;
  parameters: TObject;
  execute: (
    toolCallId: string,
    params: Record<string, unknown>,
  ) => Promise<ToolResult>;
};

export type OpenClawPluginApi = {
  id: string;
  name: string;
  config: Record<string, unknown>;
  pluginConfig?: Record<string, unknown>;
  registerTool: (
    tool: AgentTool,
    opts?: { name?: string; optional?: boolean },
  ) => void;
};
