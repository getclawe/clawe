import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskAssign } from "./task-assign.js";

vi.mock("../client.js", () => ({
  client: {
    mutation: vi.fn(),
  },
}));

import { client } from "../client.js";

describe("taskAssign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("assigns task to an agent", async () => {
    vi.mocked(client.mutation).mockResolvedValue(undefined);

    await taskAssign("task-123", "agent:inky:main", {});

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-123",
      assigneeSessionKeys: ["agent:inky:main"],
      bySessionKey: undefined,
    });
    expect(console.log).toHaveBeenCalledWith(
      "✅ Task assigned to agent:inky:main",
    );
  });

  it("assigns task with assigner attribution", async () => {
    vi.mocked(client.mutation).mockResolvedValue(undefined);

    await taskAssign("task-456", "agent:pixel:main", { by: "agent:main:main" });

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      taskId: "task-456",
      assigneeSessionKeys: ["agent:pixel:main"],
      bySessionKey: "agent:main:main",
    });
  });
});
