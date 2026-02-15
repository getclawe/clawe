import { describe, it, expect, vi, beforeEach } from "vitest";
import { subtaskAdd } from "./subtask-add.js";

vi.mock("../client.js", () => ({
  mutation: vi.fn(),
}));

import { mutation } from "../client.js";

describe("subtaskAdd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("adds a subtask with title only", async () => {
    vi.mocked(mutation).mockResolvedValue(0);

    await subtaskAdd("task-123", "Write unit tests", {});

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-123",
      title: "Write unit tests",
      description: undefined,
      assigneeSessionKey: undefined,
    });
    expect(console.log).toHaveBeenCalledWith(
      "✅ Added subtask at index 0: Write unit tests",
    );
  });

  it("adds a subtask with description", async () => {
    vi.mocked(mutation).mockResolvedValue(1);

    await subtaskAdd("task-456", "Review code", {
      description: "Check for edge cases",
    });

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-456",
      title: "Review code",
      description: "Check for edge cases",
      assigneeSessionKey: undefined,
    });
  });

  it("adds a subtask with assignee", async () => {
    vi.mocked(mutation).mockResolvedValue(2);

    await subtaskAdd("task-789", "Design mockup", {
      assign: "agent:pixel:main",
    });

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-789",
      title: "Design mockup",
      description: undefined,
      assigneeSessionKey: "agent:pixel:main",
    });
  });

  it("adds a subtask with all options", async () => {
    vi.mocked(mutation).mockResolvedValue(3);

    await subtaskAdd("task-full", "Complete task", {
      description: "Full details here",
      assign: "agent:inky:main",
    });

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-full",
      title: "Complete task",
      description: "Full details here",
      assigneeSessionKey: "agent:inky:main",
    });
    expect(console.log).toHaveBeenCalledWith(
      "✅ Added subtask at index 3: Complete task",
    );
  });
});
