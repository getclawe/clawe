import { describe, it, expect, vi, beforeEach } from "vitest";
import { notify } from "./notify.js";

vi.mock("../client.js", () => ({
  mutation: vi.fn(),
}));

import { mutation } from "../client.js";

describe("notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("sends notification to target agent", async () => {
    vi.mocked(mutation).mockResolvedValue("notif-id");

    await notify("agent:inky:main", "Please review the draft", {});

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      targetSessionKey: "agent:inky:main",
      sourceSessionKey: undefined,
      type: "custom",
      content: "Please review the draft",
    });
  });

  it("includes source agent when from option provided", async () => {
    vi.mocked(mutation).mockResolvedValue("notif-id");

    await notify("agent:inky:main", "Task completed", {
      from: "agent:main:main",
    });

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      targetSessionKey: "agent:inky:main",
      sourceSessionKey: "agent:main:main",
      type: "custom",
      content: "Task completed",
    });
  });

  it("logs success message", async () => {
    vi.mocked(mutation).mockResolvedValue("notif-id");

    await notify("agent:inky:main", "Hello", {});

    expect(console.log).toHaveBeenCalledWith("✅ Notification sent");
  });
});
