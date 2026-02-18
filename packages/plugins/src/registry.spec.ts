import { describe, it, expect, beforeEach } from "vitest";
import { loadPlugins, hasPlugin, getPlugin } from "./registry";
import type { SquadhubProvisioner } from "./interfaces/squadhub-provisioner";
import type { SquadhubLifecycle } from "./interfaces/squadhub-lifecycle";
import { DefaultSquadhubProvisioner } from "./defaults/squadhub-provisioner";
import { DefaultSquadhubLifecycle } from "./defaults/squadhub-lifecycle";

describe("registry", () => {
  describe("loadPlugins", () => {
    it("falls back to dev defaults when cloud-plugins is not installed", async () => {
      await loadPlugins();
      expect(hasPlugin()).toBe(false);
    });
  });

  describe("getPlugin", () => {
    it("returns dev provisioner by default", () => {
      const provisioner = getPlugin("squadhub-provisioner");
      expect(provisioner).toBeInstanceOf(DefaultSquadhubProvisioner);
    });

    it("returns dev lifecycle by default", () => {
      const lifecycle = getPlugin("squadhub-lifecycle");
      expect(lifecycle).toBeInstanceOf(DefaultSquadhubLifecycle);
    });
  });
});

describe("DefaultSquadhubProvisioner", () => {
  let provisioner: SquadhubProvisioner;

  beforeEach(() => {
    provisioner = new DefaultSquadhubProvisioner();
  });

  it("provision returns env-based connection", async () => {
    const result = await provisioner.provision({
      tenantId: "test-tenant",
      accountId: "test-account",
      convexUrl: "https://convex.example.com",
    });

    expect(result).toHaveProperty("squadhubUrl");
    expect(result).toHaveProperty("squadhubToken");
  });

  it("getProvisioningStatus always returns active", async () => {
    const status = await provisioner.getProvisioningStatus("test-tenant");
    expect(status).toEqual({ status: "active" });
  });

  it("deprovision is a no-op", async () => {
    await expect(
      provisioner.deprovision("test-tenant"),
    ).resolves.toBeUndefined();
  });
});

describe("DefaultSquadhubLifecycle", () => {
  let lifecycle: SquadhubLifecycle;

  beforeEach(() => {
    lifecycle = new DefaultSquadhubLifecycle();
  });

  it("restart is a no-op", async () => {
    await expect(lifecycle.restart("test-tenant")).resolves.toBeUndefined();
  });

  it("stop is a no-op", async () => {
    await expect(lifecycle.stop("test-tenant")).resolves.toBeUndefined();
  });

  it("destroy is a no-op", async () => {
    await expect(lifecycle.destroy("test-tenant")).resolves.toBeUndefined();
  });

  it("getStatus returns running and healthy", async () => {
    const status = await lifecycle.getStatus("test-tenant");
    expect(status).toEqual({ running: true, healthy: true });
  });
});
