import { describe, it, expect, vi, beforeEach } from "vitest";
import { deliver, deliverables } from "./deliver.js";
import * as fs from "fs";

vi.mock("../client.js", () => ({
  mutation: vi.fn(),
  query: vi.fn(),
  uploadFile: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

import { mutation, query, uploadFile } from "../client.js";

describe("deliver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("registers a deliverable", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(uploadFile).mockResolvedValue("file-id");
    vi.mocked(mutation).mockResolvedValue("doc-id");

    await deliver("task-123", "/output/report.pdf", "Final Report", {
      by: "agent:inky:main",
    });

    expect(fs.existsSync).toHaveBeenCalledWith("/output/report.pdf");
    expect(uploadFile).toHaveBeenCalledWith("/output/report.pdf");
    expect(mutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        taskId: "task-123",
        path: "/output/report.pdf",
        title: "Final Report",
        createdBySessionKey: "agent:inky:main",
        fileId: "file-id",
      }),
    );
    expect(console.log).toHaveBeenCalledWith(
      "✅ Deliverable registered: Final Report",
    );
  });
});

describe("deliverables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("shows message when no deliverables", async () => {
    vi.mocked(query).mockResolvedValue([]);

    await deliverables("task-123");

    expect(console.log).toHaveBeenCalledWith("No deliverables registered.");
  });

  it("lists deliverables with details", async () => {
    const now = Date.now();
    vi.mocked(query).mockResolvedValue([
      {
        _id: "doc-1",
        title: "Logo Design",
        path: "/designs/logo.png",
        creator: { name: "Pixel" },
        createdAt: now,
      },
      {
        _id: "doc-2",
        title: "Brand Guidelines",
        path: "/docs/brand.pdf",
        creator: null,
        createdAt: now,
      },
    ]);

    await deliverables("task-456");

    expect(console.log).toHaveBeenCalledWith("📦 2 deliverable(s):\n");
    expect(console.log).toHaveBeenCalledWith("Logo Design");
    expect(console.log).toHaveBeenCalledWith("   Path: /designs/logo.png");
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("By: Pixel at"),
    );
    expect(console.log).toHaveBeenCalledWith("Brand Guidelines");
    expect(console.log).toHaveBeenCalledWith("   Path: /docs/brand.pdf");
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("By: Unknown at"),
    );
  });
});
