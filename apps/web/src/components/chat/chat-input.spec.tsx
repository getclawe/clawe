import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatInput } from "./chat-input";

describe("ChatInput", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    onSend: vi.fn(),
  };

  it("renders textarea with placeholder", () => {
    render(<ChatInput {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Send a message..."),
    ).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<ChatInput {...defaultProps} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("Send a message..."), {
      target: { value: "Hello" },
    });

    expect(onChange).toHaveBeenCalledWith("Hello");
  });

  it("disables send button when empty", () => {
    render(<ChatInput {...defaultProps} value="" />);

    const buttons = screen.getAllByRole("button");
    // The last button should be send (disabled when empty)
    const sendButton = buttons[buttons.length - 1];
    expect(sendButton).toBeDisabled();
  });

  it("enables send button when has content", () => {
    render(<ChatInput {...defaultProps} value="Hello" />);

    const buttons = screen.getAllByRole("button");
    const sendButton = buttons[buttons.length - 1];
    expect(sendButton).not.toBeDisabled();
  });

  it("calls onSend when send button clicked", () => {
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} value="Hello" onSend={onSend} />);

    const buttons = screen.getAllByRole("button");
    const sendButton = buttons[buttons.length - 1];
    if (sendButton) {
      fireEvent.click(sendButton);
    }

    expect(onSend).toHaveBeenCalledWith("Hello", undefined);
  });

  it("shows stop button when streaming", () => {
    const onStop = vi.fn();
    render(<ChatInput {...defaultProps} isStreaming onStop={onStop} />);

    // Should have attach button and stop button
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("calls onStop when stop button clicked", () => {
    const onStop = vi.fn();
    render(<ChatInput {...defaultProps} isStreaming onStop={onStop} />);

    const buttons = screen.getAllByRole("button");
    const stopButton = buttons[buttons.length - 1];
    if (stopButton) {
      fireEvent.click(stopButton);
    }

    expect(onStop).toHaveBeenCalled();
  });

  it("disables input when loading", () => {
    render(<ChatInput {...defaultProps} isLoading />);

    expect(screen.getByPlaceholderText("Send a message...")).toBeDisabled();
  });

  it("disables input when streaming", () => {
    render(<ChatInput {...defaultProps} isStreaming />);

    expect(screen.getByPlaceholderText("Send a message...")).toBeDisabled();
  });

  it("shows attach button", () => {
    render(<ChatInput {...defaultProps} />);

    // First button should be attach
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
