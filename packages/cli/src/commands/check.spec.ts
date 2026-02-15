import { describe, it, expect, vi, beforeEach } from "vitest";
import { check } from "./check.js";

vi.mock("../client.js", () => ({
  mutation: vi.fn(),
  query: vi.fn(),
}));

import { mutation, query } from "../client.js";

describe("check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("outputs HEARTBEAT_OK when no notifications", async () => {
    vi.mocked(mutation).mockResolvedValue("agent-id");
    vi.mocked(query).mockResolvedValue([]);

    await check("agent:main:main");

    expect(mutation).toHaveBeenCalled();
    expect(query).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("HEARTBEAT_OK");
  });

  it("displays notifications when present", async () => {
    vi.mocked(mutation).mockResolvedValue("agent-id");
    vi.mocked(query).mockResolvedValue([
      {
        _id: "notif-1",
        type: "task_assigned",
        content: "You have a new task",
        sourceAgent: { name: "Clawe" },
        task: { title: "Test Task", status: "assigned" },
      },
    ]);

    await check("agent:main:main");

    expect(console.log).toHaveBeenCalledWith("📬 1 notification(s):\n");
    expect(console.log).toHaveBeenCalledWith(
      "[task_assigned] from Clawe: You have a new task",
    );
  });

  it("marks notifications as delivered", async () => {
    vi.mocked(mutation).mockResolvedValue("agent-id");
    vi.mocked(query).mockResolvedValue([
      {
        _id: "notif-1",
        type: "custom",
        content: "Hello",
        sourceAgent: null,
        task: null,
      },
    ]);

    await check("agent:main:main");

    expect(mutation).toHaveBeenCalledTimes(2);
  });
});
