import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "./chat-message";
import type { ChatMessage as ChatMessageType } from "./types";

describe("ChatMessage", () => {
  it("renders user message", () => {
    const message: ChatMessageType = {
      id: "1",
      role: "user",
      content: [{ type: "text", text: "Hello" }],
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders assistant message", () => {
    const message: ChatMessageType = {
      id: "2",
      role: "assistant",
      content: [{ type: "text", text: "Hi there!" }],
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText("Hi there!")).toBeInTheDocument();
  });

  it("shows timestamp", () => {
    const timestamp = new Date("2024-01-15T10:30:00").getTime();
    const message: ChatMessageType = {
      id: "1",
      role: "user",
      content: [{ type: "text", text: "Hello" }],
      timestamp,
    };

    render(<ChatMessage message={message} />);

    // Should show formatted time
    expect(screen.getByText(/10:30/)).toBeInTheDocument();
  });

  it("hides timestamp when streaming", () => {
    const message: ChatMessageType = {
      id: "1",
      role: "assistant",
      content: [{ type: "text", text: "Hello" }],
      timestamp: Date.now(),
      isStreaming: true,
    };

    render(<ChatMessage message={message} />);

    // Should not show timestamp while streaming
    const timestamps = screen.queryAllByText(/\d{1,2}:\d{2}/);
    expect(timestamps).toHaveLength(0);
  });

  it("renders content", () => {
    const message: ChatMessageType = {
      id: "1",
      role: "assistant",
      content: [{ type: "text", text: "Hello world" }],
      timestamp: Date.now(),
      isStreaming: true,
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });
});
