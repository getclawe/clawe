import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chat } from "./chat";

// Mock the hooks
vi.mock("@/hooks/use-chat", () => ({
  useChat: () => ({
    messages: [],
    input: "",
    setInput: vi.fn(),
    status: "idle",
    error: null,
    sendMessage: vi.fn(),
    loadHistory: vi.fn(),
    abort: vi.fn(),
    clearMessages: vi.fn(),
    isLoading: false,
    isStreaming: false,
  }),
}));

vi.mock("@/hooks/use-auto-scroll", () => ({
  useAutoScroll: () => ({
    scrollRef: { current: null },
    isAtBottom: true,
    scrollToBottom: vi.fn(),
    showScrollButton: false,
  }),
}));

describe("Chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders chat header", () => {
    render(<Chat sessionKey="test-session" />);
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("renders empty state when no messages", () => {
    render(<Chat sessionKey="test-session" />);
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
  });

  it("renders input area", () => {
    render(<Chat sessionKey="test-session" />);
    expect(
      screen.getByPlaceholderText("Send a message..."),
    ).toBeInTheDocument();
  });

  it("applies panel mode styles", () => {
    const { container } = render(
      <Chat sessionKey="test-session" mode="panel" />,
    );
    expect(container.firstChild).toHaveClass("border-l");
  });

  it("applies full mode styles", () => {
    const { container } = render(
      <Chat sessionKey="test-session" mode="full" />,
    );
    expect(container.firstChild).toHaveClass("max-w-5xl");
  });
});
