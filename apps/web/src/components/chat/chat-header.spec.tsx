import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatHeader } from "./chat-header";

describe("ChatHeader", () => {
  it("renders title", () => {
    render(<ChatHeader />);
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("shows generating indicator when streaming", () => {
    render(<ChatHeader isStreaming />);
    expect(screen.getByText("Generating...")).toBeInTheDocument();
  });

  it("shows close button in panel mode", () => {
    const onClose = vi.fn();
    render(<ChatHeader mode="panel" onClose={onClose} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("hides close button in full mode", () => {
    const onClose = vi.fn();
    render(<ChatHeader mode="full" onClose={onClose} />);

    const buttons = screen.queryAllByRole("button");
    expect(buttons).toHaveLength(0);
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<ChatHeader mode="panel" onClose={onClose} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onClose).toHaveBeenCalled();
  });
});
