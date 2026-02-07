import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskComment } from "./task-comment.js";

vi.mock("../client.js", () => ({
  client: {
    mutation: vi.fn(),
  },
}));

import { client } from "../client.js";

describe("taskComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("adds a comment to a task", async () => {
    vi.mocked(client.mutation).mockResolvedValue("message-id");

    await taskComment("task-123", "Looking good!", {});

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-123",
      content: "Looking good!",
      bySessionKey: undefined,
    });
    expect(console.log).toHaveBeenCalledWith("✅ Comment added");
  });

  it("adds a comment with agent attribution", async () => {
    vi.mocked(client.mutation).mockResolvedValue("message-id");

    await taskComment("task-456", "I'll review this", {
      by: "agent:main:main",
    });

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-456",
      content: "I'll review this",
      bySessionKey: "agent:main:main",
    });
  });
});
