import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatScrollButton } from "./chat-scroll-button";

describe("ChatScrollButton", () => {
  it("renders scroll to bottom text", () => {
    render(<ChatScrollButton onClick={vi.fn()} />);
    expect(screen.getByText("Scroll to bottom")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<ChatScrollButton onClick={onClick} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalled();
  });

  it("shows unread count when provided", () => {
    render(<ChatScrollButton onClick={vi.fn()} unreadCount={5} />);
    expect(screen.getByText("5 new")).toBeInTheDocument();
  });

  it("shows scroll text when unread count is 0", () => {
    render(<ChatScrollButton onClick={vi.fn()} unreadCount={0} />);
    expect(screen.getByText("Scroll to bottom")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ChatScrollButton onClick={vi.fn()} className="custom-class" />,
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
