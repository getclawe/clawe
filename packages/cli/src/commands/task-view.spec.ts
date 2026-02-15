import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskView } from "./task-view.js";

vi.mock("../client.js", () => ({
  query: vi.fn(),
}));

import { query } from "../client.js";

describe("taskView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("displays task not found error", async () => {
    vi.mocked(query).mockResolvedValue(null);
    const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });

    await expect(taskView("nonexistent-id")).rejects.toThrow("process.exit(1)");

    expect(console.error).toHaveBeenCalledWith(
      "Task not found: nonexistent-id",
    );
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  it("displays basic task info", async () => {
    vi.mocked(query).mockResolvedValue({
      _id: "task-123",
      title: "Write documentation",
      status: "in_progress",
      priority: "high",
    });

    await taskView("task-123");

    expect(console.log).toHaveBeenCalledWith("📋 Task: Write documentation");
    expect(console.log).toHaveBeenCalledWith("   ID: task-123");
    expect(console.log).toHaveBeenCalledWith("   Status: in_progress");
    expect(console.log).toHaveBeenCalledWith("   Priority: high");
  });

  it("displays description when present", async () => {
    vi.mocked(query).mockResolvedValue({
      _id: "task-456",
      title: "Task with desc",
      status: "assigned",
      description: "This is a detailed description",
    });

    await taskView("task-456");

    expect(console.log).toHaveBeenCalledWith("📝 Description:");
    expect(console.log).toHaveBeenCalledWith("This is a detailed description");
  });

  it("displays subtasks with progress", async () => {
    vi.mocked(query).mockResolvedValue({
      _id: "task-789",
      title: "Task with subtasks",
      status: "in_progress",
      subtasks: [
        { title: "First step", done: true },
        {
          title: "Second step",
          done: false,
          assignee: { name: "Inky", emoji: "✍️" },
        },
      ],
    });

    await taskView("task-789");

    expect(console.log).toHaveBeenCalledWith("📋 Subtasks (1/2):");
    expect(console.log).toHaveBeenCalledWith("   0. ✅ First step");
    expect(console.log).toHaveBeenCalledWith("   1. ⬜ Second step → ✍️ Inky");
  });

  it("displays deliverables", async () => {
    vi.mocked(query).mockResolvedValue({
      _id: "task-del",
      title: "Task with deliverables",
      status: "done",
      deliverables: [{ title: "Logo design", path: "/designs/logo.png" }],
    });

    await taskView("task-del");

    expect(console.log).toHaveBeenCalledWith("📦 Deliverables (1):");
    expect(console.log).toHaveBeenCalledWith(
      "   - Logo design: /designs/logo.png",
    );
  });

  it("displays comments", async () => {
    const now = Date.now();
    vi.mocked(query).mockResolvedValue({
      _id: "task-comments",
      title: "Task with comments",
      status: "review",
      messages: [
        {
          author: { name: "Clawe" },
          content: "Great progress!",
          createdAt: now,
        },
      ],
    });

    await taskView("task-comments");

    expect(console.log).toHaveBeenCalledWith("💬 Comments (1):");
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Clawe: Great progress!"),
    );
  });
});
