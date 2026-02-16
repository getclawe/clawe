import { describe, it, expect, beforeEach } from "vitest";
import { loadPlugins, hasPlugin, getPlugin } from "./registry";
import { DevProvisioner } from "./defaults/provisioner";
import { DevLifecycle } from "./defaults/lifecycle";

describe("registry", () => {
  describe("loadPlugins", () => {
    it("falls back to dev defaults when cloud-plugins is not installed", async () => {
      await loadPlugins();
      expect(hasPlugin()).toBe(false);
    });
  });

  describe("getPlugin", () => {
    it("returns dev provisioner by default", () => {
      const provisioner = getPlugin("provisioner");
      expect(provisioner).toBeInstanceOf(DevProvisioner);
    });

    it("returns dev lifecycle by default", () => {
      const lifecycle = getPlugin("lifecycle");
      expect(lifecycle).toBeInstanceOf(DevLifecycle);
    });
  });
});

describe("DevProvisioner", () => {
  let provisioner: DevProvisioner;

  beforeEach(() => {
    provisioner = new DevProvisioner();
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

describe("DevLifecycle", () => {
  let lifecycle: DevLifecycle;

  beforeEach(() => {
    lifecycle = new DevLifecycle();
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
