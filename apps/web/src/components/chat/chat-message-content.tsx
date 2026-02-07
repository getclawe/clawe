"use client";

import { cn } from "@clawe/ui/lib/utils";
import { ChatToolEvent } from "./chat-tool-event";
import type { MessageContent, ToolUseContent } from "./types";

export type ChatMessageContentProps = {
  content: MessageContent[];
  className?: string;
};

export const ChatMessageContent = ({
  content,
  className,
}: ChatMessageContentProps) => {
  if (!content || content.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {content.map((block, index) => (
        <ContentBlock key={index} block={block} />
      ))}
    </div>
  );
};

type ContentBlockProps = {
  block: MessageContent;
};

const ContentBlock = ({ block }: ContentBlockProps) => {
  switch (block.type) {
    case "text":
      return <TextBlock text={block.text} />;

    case "image": {
      // Pass the whole block since OpenClaw may use different structures
      const imgBlock = block as {
        source?: unknown;
        media_type?: string;
        data?: string;
        url?: string;
      };
      return (
        <ImageBlock
          {...imgBlock}
          source={imgBlock.source as ImageBlockProps["source"]}
        />
      );
    }

    case "tool_use":
      return <ChatToolEvent tool={block as ToolUseContent} />;

    case "tool_result":
      return (
        <ToolResultBlock content={block.content} isError={block.is_error} />
      );

    case "thinking":
      return <ThinkingBlock text={block.thinking} />;

    default:
      return null;
  }
};

const TextBlock = ({ text }: { text: string }) => {
  // Preserve whitespace and line breaks
  return (
    <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
      {text}
    </div>
  );
};

type ImageBlockProps = {
  source?: {
    type?: "base64" | "url";
    media_type?: string;
    data?: string;
    url?: string;
  };
  // OpenClaw may use different field names
  media_type?: string;
  data?: string;
  url?: string;
};

const ImageBlock = (props: ImageBlockProps) => {
  // Handle different image formats from OpenClaw
  const { source } = props;

  let src: string | undefined;

  if (source) {
    // Standard format with source object
    if (source.type === "base64" && source.data) {
      src = `data:${source.media_type || "image/jpeg"};base64,${source.data}`;
    } else if (source.url) {
      src = source.url;
    } else if (source.data) {
      // Has data but no type specified, assume base64
      src = `data:${source.media_type || "image/jpeg"};base64,${source.data}`;
    }
  } else if (props.data) {
    // Direct data field (alternative format)
    src = `data:${props.media_type || "image/jpeg"};base64,${props.data}`;
  } else if (props.url) {
    // Direct url field
    src = props.url;
  }

  if (!src) {
    return null;
  }

  return (
    <div className="bg-background/10 overflow-hidden rounded-lg p-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Attached image"
        className="max-h-80 max-w-full rounded-md object-contain"
      />
    </div>
  );
};

type ToolResultBlockProps = {
  content: string | MessageContent[];
  isError?: boolean;
};

const ToolResultBlock = ({ content, isError }: ToolResultBlockProps) => {
  const text = typeof content === "string" ? content : JSON.stringify(content);

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 font-mono text-xs",
        isError
          ? "border-destructive/50 bg-destructive/10 text-destructive"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      <pre className="overflow-x-auto whitespace-pre-wrap">{text}</pre>
    </div>
  );
};

const ThinkingBlock = ({ text }: { text: string }) => {
  return (
    <div className="border-border bg-muted/30 text-muted-foreground rounded-md border px-3 py-2 text-xs italic">
      <span className="font-medium">Thinking: </span>
      {text}
    </div>
  );
};
