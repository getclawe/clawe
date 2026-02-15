import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskPlan } from "./task-plan.js";

vi.mock("../client.js", () => ({
  mutation: vi.fn(),
}));

import { mutation } from "../client.js";

describe("taskPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  it("creates a task plan with all fields", async () => {
    vi.mocked(mutation).mockResolvedValue("task-plan-1");

    const plan = JSON.stringify({
      title: "Blog Post: AI Teams",
      description: "Write a 2000-word post",
      priority: "high",
      assignee: "agent:inky:main",
      by: "agent:main:main",
      subtasks: [
        { title: "Research topic", assign: "agent:scout:main" },
        { title: "Write first draft" },
        { title: "Create hero image", assign: "agent:pixel:main" },
      ],
    });

    await taskPlan(plan);

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      title: "Blog Post: AI Teams",
      description: "Write a 2000-word post",
      priority: "high",
      assigneeSessionKey: "agent:inky:main",
      createdBySessionKey: "agent:main:main",
      subtasks: [
        {
          title: "Research topic",
          description: undefined,
          assigneeSessionKey: "agent:scout:main",
        },
        {
          title: "Write first draft",
          description: undefined,
          assigneeSessionKey: undefined,
        },
        {
          title: "Create hero image",
          description: undefined,
          assigneeSessionKey: "agent:pixel:main",
        },
      ],
    });
    expect(console.log).toHaveBeenCalledWith("✅ Task planned: task-plan-1");
  });

  it("creates a minimal task plan", async () => {
    vi.mocked(mutation).mockResolvedValue("task-plan-2");

    const plan = JSON.stringify({
      title: "Quick task",
      description: "Do something simple",
      subtasks: [{ title: "Step one" }],
    });

    await taskPlan(plan);

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      title: "Quick task",
      description: "Do something simple",
      priority: undefined,
      assigneeSessionKey: undefined,
      createdBySessionKey: undefined,
      subtasks: [
        {
          title: "Step one",
          description: undefined,
          assigneeSessionKey: undefined,
        },
      ],
    });
  });

  it("maps subtask descriptions correctly", async () => {
    vi.mocked(mutation).mockResolvedValue("task-plan-3");

    const plan = JSON.stringify({
      title: "Detailed task",
      description: "Task with subtask descriptions",
      subtasks: [
        { title: "Research", description: "Find 3 competitor articles" },
        { title: "Write draft" },
      ],
    });

    await taskPlan(plan);

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      title: "Detailed task",
      description: "Task with subtask descriptions",
      priority: undefined,
      assigneeSessionKey: undefined,
      createdBySessionKey: undefined,
      subtasks: [
        {
          title: "Research",
          description: "Find 3 competitor articles",
          assigneeSessionKey: undefined,
        },
        {
          title: "Write draft",
          description: undefined,
          assigneeSessionKey: undefined,
        },
      ],
    });
  });

  it("exits on invalid JSON", async () => {
    await expect(taskPlan("not-json")).rejects.toThrow("process.exit");

    expect(console.error).toHaveBeenCalledWith(
      "Error: Invalid JSON. Expected a task plan object.",
    );
    expect(mutation).not.toHaveBeenCalled();
  });

  it("exits when title is missing", async () => {
    const plan = JSON.stringify({
      description: "No title here",
      subtasks: [{ title: "Step" }],
    });

    await expect(taskPlan(plan)).rejects.toThrow("process.exit");

    expect(console.error).toHaveBeenCalledWith(
      "Error: Plan must include 'title'",
    );
    expect(mutation).not.toHaveBeenCalled();
  });

  it("exits when description is missing", async () => {
    const plan = JSON.stringify({
      title: "No description",
      subtasks: [{ title: "Step" }],
    });

    await expect(taskPlan(plan)).rejects.toThrow("process.exit");

    expect(console.error).toHaveBeenCalledWith(
      "Error: Plan must include 'description'",
    );
    expect(mutation).not.toHaveBeenCalled();
  });

  it("exits when subtasks are missing", async () => {
    const plan = JSON.stringify({
      title: "No subtasks",
      description: "Missing subtasks array",
    });

    await expect(taskPlan(plan)).rejects.toThrow("process.exit");

    expect(console.error).toHaveBeenCalledWith(
      "Error: Plan must include at least one subtask",
    );
    expect(mutation).not.toHaveBeenCalled();
  });

  it("exits when subtasks array is empty", async () => {
    const plan = JSON.stringify({
      title: "Empty subtasks",
      description: "Has empty subtasks array",
      subtasks: [],
    });

    await expect(taskPlan(plan)).rejects.toThrow("process.exit");

    expect(console.error).toHaveBeenCalledWith(
      "Error: Plan must include at least one subtask",
    );
    expect(mutation).not.toHaveBeenCalled();
  });

  it("handles mutation error", async () => {
    vi.mocked(mutation).mockRejectedValue(new Error("Convex error"));

    const plan = JSON.stringify({
      title: "Failing task",
      description: "This will fail",
      subtasks: [{ title: "Step" }],
    });

    await expect(taskPlan(plan)).rejects.toThrow("process.exit");

    expect(console.error).toHaveBeenCalledWith("Error:", "Convex error");
  });

  it("prints subtask listing on success", async () => {
    vi.mocked(mutation).mockResolvedValue("task-plan-list");

    const plan = JSON.stringify({
      title: "Task with listing",
      description: "Check output",
      subtasks: [
        { title: "Research", assign: "agent:scout:main" },
        { title: "Write draft" },
      ],
    });

    await taskPlan(plan);

    expect(console.log).toHaveBeenCalledWith(
      "  0. Research → agent:scout:main",
    );
    expect(console.log).toHaveBeenCalledWith("  1. Write draft");
    expect(console.log).toHaveBeenCalledWith(
      "Notifications sent to all assigned agents.",
    );
  });
});
