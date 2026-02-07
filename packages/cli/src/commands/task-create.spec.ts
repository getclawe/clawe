import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskCreate } from "./task-create.js";

vi.mock("../client.js", () => ({
  client: {
    mutation: vi.fn(),
  },
}));

import { client } from "../client.js";

describe("taskCreate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("creates a task with title only", async () => {
    vi.mocked(client.mutation).mockResolvedValue("task-123");

    await taskCreate("Write documentation", {});

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      title: "Write documentation",
      assigneeSessionKey: undefined,
      createdBySessionKey: undefined,
      priority: undefined,
    });
    expect(console.log).toHaveBeenCalledWith("✅ Task created: task-123");
  });

  it("creates a task with assignee", async () => {
    vi.mocked(client.mutation).mockResolvedValue("task-456");

    await taskCreate("Design logo", { assign: "agent:pixel:main" });

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      title: "Design logo",
      assigneeSessionKey: "agent:pixel:main",
      createdBySessionKey: undefined,
      priority: undefined,
    });
  });

  it("creates a task with priority and creator", async () => {
    vi.mocked(client.mutation).mockResolvedValue("task-789");

    await taskCreate("Fix critical bug", {
      priority: "urgent",
      by: "agent:main:main",
    });

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      title: "Fix critical bug",
      assigneeSessionKey: undefined,
      createdBySessionKey: "agent:main:main",
      priority: "urgent",
    });
  });

  it("creates a task with all options", async () => {
    vi.mocked(client.mutation).mockResolvedValue("task-full");

    await taskCreate("Full featured task", {
      assign: "agent:inky:main",
      by: "agent:main:main",
      priority: "high",
    });

    expect(client.mutation).toHaveBeenCalledWith(expect.anything(), {
      title: "Full featured task",
      assigneeSessionKey: "agent:inky:main",
      createdBySessionKey: "agent:main:main",
      priority: "high",
    });
  });
});
