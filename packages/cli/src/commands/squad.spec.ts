import { describe, it, expect, vi, beforeEach } from "vitest";
import { squad } from "./squad.js";

vi.mock("../client.js", () => ({
  client: {
    query: vi.fn(),
  },
}));

import { client } from "../client.js";

describe("squad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("displays squad status header", async () => {
    vi.mocked(client.query).mockResolvedValue([]);

    await squad();

    expect(console.log).toHaveBeenCalledWith("🤖 Squad Status:\n");
  });

  it("displays agent details with active status", async () => {
    vi.mocked(client.query).mockResolvedValue([
      {
        _id: "agent-1",
        name: "Clawe",
        emoji: "🦞",
        role: "Squad Lead",
        status: "active",
        sessionKey: "agent:main:main",
        currentTask: { title: "Coordinate tasks" },
        lastHeartbeat: Date.now(),
      },
    ]);

    await squad();

    expect(console.log).toHaveBeenCalledWith("🦞 Clawe (Squad Lead)");
    expect(console.log).toHaveBeenCalledWith("   Status: 🟢 active");
    expect(console.log).toHaveBeenCalledWith("   Session: agent:main:main");
    expect(console.log).toHaveBeenCalledWith("   Working on: Coordinate tasks");
  });

  it("displays idle status icon", async () => {
    vi.mocked(client.query).mockResolvedValue([
      {
        _id: "agent-2",
        name: "Inky",
        role: "Writer",
        status: "idle",
        sessionKey: "agent:inky:main",
      },
    ]);

    await squad();

    expect(console.log).toHaveBeenCalledWith("   Status: ⚪ idle");
  });

  it("displays blocked status icon", async () => {
    vi.mocked(client.query).mockResolvedValue([
      {
        _id: "agent-3",
        name: "Pixel",
        role: "Designer",
        status: "blocked",
        sessionKey: "agent:pixel:main",
      },
    ]);

    await squad();

    expect(console.log).toHaveBeenCalledWith("   Status: 🔴 blocked");
  });
});
