import { describe, it, expect, vi, beforeEach } from "vitest";
import { tasks } from "./tasks.js";

vi.mock("../client.js", () => ({
  query: vi.fn(),
}));

import { query } from "../client.js";

describe("tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("displays message when no tasks", async () => {
    vi.mocked(query).mockResolvedValue([]);

    await tasks("agent:main:main");

    expect(console.log).toHaveBeenCalledWith("No active tasks.");
  });

  it("lists active tasks with details", async () => {
    vi.mocked(query).mockResolvedValue([
      {
        _id: "task-1",
        title: "Write tests",
        status: "in_progress",
        priority: "high",
        subtasks: [
          { title: "Unit tests", done: true },
          { title: "Integration tests", done: false },
        ],
      },
    ]);

    await tasks("agent:main:main");

    expect(console.log).toHaveBeenCalledWith("📋 1 active task(s):\n");
    expect(console.log).toHaveBeenCalledWith("[high] Write tests");
    expect(console.log).toHaveBeenCalledWith("   ID: task-1");
    expect(console.log).toHaveBeenCalledWith("   Status: in_progress");
    expect(console.log).toHaveBeenCalledWith("   Subtasks: 1/2");
  });

  it("handles tasks without priority", async () => {
    vi.mocked(query).mockResolvedValue([
      {
        _id: "task-2",
        title: "Simple task",
        status: "assigned",
      },
    ]);

    await tasks("agent:main:main");

    expect(console.log).toHaveBeenCalledWith(" Simple task");
  });
});
