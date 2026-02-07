import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatToolEvent } from "./chat-tool-event";
import type { ToolUseContent } from "./types";

describe("ChatToolEvent", () => {
  const baseTool: ToolUseContent = {
    type: "tool_use",
    id: "tool-1",
    name: "search",
    input: { query: "test query" },
  };

  it("renders tool name", () => {
    render(<ChatToolEvent tool={baseTool} />);
    expect(screen.getByText("search")).toBeInTheDocument();
  });

  it("expands to show input when clicked", () => {
    render(<ChatToolEvent tool={baseTool} />);

    // Click to expand
    fireEvent.click(screen.getByRole("button"));

    // Should show input section
    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.getByText(/"query": "test query"/)).toBeInTheDocument();
  });

  it("shows completed status icon by default", () => {
    render(<ChatToolEvent tool={{ ...baseTool, status: "completed" }} />);

    // Check icon is present (green check)
    const checkIcon = document.querySelector(".text-green-500");
    expect(checkIcon).toBeInTheDocument();
  });

  it("shows running status icon", () => {
    render(<ChatToolEvent tool={{ ...baseTool, status: "running" }} />);

    // Check for spinning loader
    const loaderIcon = document.querySelector(".animate-spin");
    expect(loaderIcon).toBeInTheDocument();
  });

  it("shows error status icon", () => {
    render(<ChatToolEvent tool={{ ...baseTool, status: "error" }} />);

    // Check for error icon (destructive color)
    const errorIcon = document.querySelector(".text-destructive");
    expect(errorIcon).toBeInTheDocument();
  });

  it("formats string input", () => {
    const tool: ToolUseContent = {
      ...baseTool,
      input: "simple string input",
    };

    render(<ChatToolEvent tool={tool} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("simple string input")).toBeInTheDocument();
  });
});
