import { describe, it, expect, vi, beforeEach } from "vitest";
import { feed } from "./feed.js";

vi.mock("../client.js", () => ({
  query: vi.fn(),
}));

import { query } from "../client.js";

describe("feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("displays message when no activity", async () => {
    vi.mocked(query).mockResolvedValue([]);

    await feed({});

    expect(console.log).toHaveBeenCalledWith("No recent activity.");
  });

  it("displays activity feed with agent names", async () => {
    const now = Date.now();
    vi.mocked(query).mockResolvedValue([
      {
        _id: "activity-1",
        type: "task_created",
        message: "Task created: Write tests",
        agent: { name: "Clawe" },
        createdAt: now,
      },
    ]);

    await feed({});

    expect(console.log).toHaveBeenCalledWith("📜 Activity Feed:\n");
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Clawe: Task created: Write tests"),
    );
  });

  it("shows System for activities without agent", async () => {
    vi.mocked(query).mockResolvedValue([
      {
        _id: "activity-2",
        type: "system",
        message: "System initialized",
        agent: null,
        createdAt: Date.now(),
      },
    ]);

    await feed({});

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("System: System initialized"),
    );
  });

  it("uses default limit of 20", async () => {
    vi.mocked(query).mockResolvedValue([]);

    await feed({});

    expect(query).toHaveBeenCalledWith(expect.anything(), { limit: 20 });
  });

  it("uses custom limit when provided", async () => {
    vi.mocked(query).mockResolvedValue([]);

    await feed({ limit: 50 });

    expect(query).toHaveBeenCalledWith(expect.anything(), { limit: 50 });
  });
});
