import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskStatus } from "./task-status.js";

vi.mock("../client.js", () => ({
  mutation: vi.fn(),
}));

import { mutation } from "../client.js";

describe("taskStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("updates task status", async () => {
    vi.mocked(mutation).mockResolvedValue(undefined);

    await taskStatus("task-123", "in_progress", {});

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-123",
      status: "in_progress",
      bySessionKey: undefined,
    });
    expect(console.log).toHaveBeenCalledWith(
      "✅ Task status updated to: in_progress",
    );
  });

  it("updates task status with agent attribution", async () => {
    vi.mocked(mutation).mockResolvedValue(undefined);

    await taskStatus("task-456", "done", { by: "agent:main:main" });

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-456",
      status: "done",
      bySessionKey: "agent:main:main",
    });
  });
});
