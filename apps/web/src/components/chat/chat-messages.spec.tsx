import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessages } from "./chat-messages";
import type { ChatMessage } from "./types";

describe("ChatMessages", () => {
  it("renders empty state when no messages", () => {
    render(<ChatMessages messages={[]} />);
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
  });

  it("renders messages", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: [{ type: "text", text: "Hello" }],
        timestamp: Date.now(),
      },
      {
        id: "2",
        role: "assistant",
        content: [{ type: "text", text: "Hi there!" }],
        timestamp: Date.now(),
      },
    ];

    render(<ChatMessages messages={messages} />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there!")).toBeInTheDocument();
  });

  it("shows thinking indicator when loading after user message", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: [{ type: "text", text: "Hello" }],
        timestamp: Date.now(),
      },
    ];

    render(<ChatMessages messages={messages} isLoading isStreaming={false} />);

    // The thinking indicator shows animated dots
    const thinkingDots = document.querySelectorAll(".animate-bounce");
    expect(thinkingDots.length).toBeGreaterThan(0);
  });

  it("shows error message when error provided with messages", () => {
    const error = new Error("Something went wrong");
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: [{ type: "text", text: "Hello" }],
        timestamp: Date.now(),
      },
    ];

    render(<ChatMessages messages={messages} error={error} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
