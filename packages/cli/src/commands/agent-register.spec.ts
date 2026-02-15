import { describe, it, expect, vi, beforeEach } from "vitest";
import { agentRegister } from "./agent-register.js";

vi.mock("../client.js", () => ({
  mutation: vi.fn(),
}));

import { mutation } from "../client.js";

describe("agentRegister", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("registers an agent with basic info", async () => {
    vi.mocked(mutation).mockResolvedValue("agent-123");

    await agentRegister("Scout", "SEO Analyst", "agent:scout:main", {});

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      name: "Scout",
      role: "SEO Analyst",
      sessionKey: "agent:scout:main",
      emoji: undefined,
    });
    expect(console.log).toHaveBeenCalledWith(
      "✅ Agent registered: Scout (agent-123)",
    );
  });

  it("registers an agent with emoji", async () => {
    vi.mocked(mutation).mockResolvedValue("agent-456");

    await agentRegister("Pixel", "Designer", "agent:pixel:main", {
      emoji: "🎨",
    });

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      name: "Pixel",
      role: "Designer",
      sessionKey: "agent:pixel:main",
      emoji: "🎨",
    });
    expect(console.log).toHaveBeenCalledWith(
      "✅ Agent registered: Pixel (agent-456)",
    );
  });

  it("handles upsert (update existing agent)", async () => {
    vi.mocked(mutation).mockResolvedValue("existing-agent-id");

    await agentRegister("Clawe", "Squad Lead", "agent:main:main", {
      emoji: "🦞",
    });

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      name: "Clawe",
      role: "Squad Lead",
      sessionKey: "agent:main:main",
      emoji: "🦞",
    });
  });
});
