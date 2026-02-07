import { describe, it, expect, vi, beforeEach } from "vitest";
import { subtaskCheck, subtaskUncheck } from "./subtask-check.js";

vi.mock("../client.js", () => ({
  client: {
    mutation: vi.fn(),
  },
}));

import { client } from "../client.js";

describe("subtaskCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("marks subtask as done", async () => {
    vi.mocked(client.mutation).mockResolvedValue(undefined);

    await subtaskCheck("task-123", "0", {});

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-123",
      subtaskIndex: 0,
      done: true,
      bySessionKey: undefined,
    });
    expect(console.log).toHaveBeenCalledWith("✅ Subtask 0 marked as done");
  });

  it("marks subtask as done with agent attribution", async () => {
    vi.mocked(client.mutation).mockResolvedValue(undefined);

    await subtaskCheck("task-456", "2", { by: "agent:inky:main" });

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-456",
      subtaskIndex: 2,
      done: true,
      bySessionKey: "agent:inky:main",
    });
  });

  it("parses string index correctly", async () => {
    vi.mocked(client.mutation).mockResolvedValue(undefined);

    await subtaskCheck("task-789", "5", {});

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-789",
      subtaskIndex: 5,
      done: true,
      bySessionKey: undefined,
    });
  });
});

describe("subtaskUncheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("marks subtask as not done", async () => {
    vi.mocked(client.mutation).mockResolvedValue(undefined);

    await subtaskUncheck("task-123", "1", {});

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-123",
      subtaskIndex: 1,
      done: false,
      bySessionKey: undefined,
    });
    expect(console.log).toHaveBeenCalledWith("✅ Subtask 1 marked as not done");
  });

  it("marks subtask as not done with agent attribution", async () => {
    vi.mocked(client.mutation).mockResolvedValue(undefined);

    await subtaskUncheck("task-456", "0", { by: "agent:main:main" });

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-456",
      subtaskIndex: 0,
      done: false,
      bySessionKey: "agent:main:main",
    });
  });
});
