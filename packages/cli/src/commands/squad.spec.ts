import { describe, it, expect, vi, beforeEach } from "vitest";
import { squad } from "./squad.js";

vi.mock("../client.js", () => ({
  query: vi.fn(),
}));

import { query } from "../client.js";

describe("squad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("displays squad status header", async () => {
    vi.mocked(query).mockResolvedValue([]);

    await squad();

    expect(console.log).toHaveBeenCalledWith("🤖 Squad Status:\n");
  });

  it("displays agent details with online status", async () => {
    vi.mocked(query).mockResolvedValue([
      {
        _id: "agent-1",
        name: "Clawe",
        emoji: "🦞",
        role: "Squad Lead",
        status: "online",
        sessionKey: "agent:main:main",
        currentTask: { title: "Coordinate tasks" },
        lastHeartbeat: Date.now(),
      },
    ]);

    await squad();

    expect(console.log).toHaveBeenCalledWith("🦞 Clawe (Squad Lead)");
    expect(console.log).toHaveBeenCalledWith("   Status: 🟢 online");
    expect(console.log).toHaveBeenCalledWith("   Session: agent:main:main");
    expect(console.log).toHaveBeenCalledWith("   Working on: Coordinate tasks");
  });

  it("displays offline status when no heartbeat", async () => {
    vi.mocked(query).mockResolvedValue([
      {
        _id: "agent-2",
        name: "Inky",
        role: "Writer",
        status: "offline",
        sessionKey: "agent:inky:main",
      },
    ]);

    await squad();

    expect(console.log).toHaveBeenCalledWith("   Status: 🔴 offline");
  });

  it("displays offline status when heartbeat is stale", async () => {
    vi.mocked(query).mockResolvedValue([
      {
        _id: "agent-3",
        name: "Pixel",
        role: "Designer",
        status: "online",
        sessionKey: "agent:pixel:main",
        lastHeartbeat: Date.now() - 25 * 60 * 1000, // 25 min ago (stale)
      },
    ]);

    await squad();

    expect(console.log).toHaveBeenCalledWith("   Status: 🔴 offline");
  });
});
