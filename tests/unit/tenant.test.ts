import { describe, expect, it } from "@jest/globals";
import { tenantExtensionDefinition } from "../../src/lib/prisma-tenant-extension";
import { requestContext } from "../../src/utils/requestContext";

interface CapturedQueryArgs {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Array<Record<string, unknown>>;
  create?: Record<string, unknown>;
}

describe("Tenant Isolation Prisma Extension Unit Tests", () => {
  it("auto-injects businessId into where clause for findMany when request context is active", async () => {
    let capturedArgs: CapturedQueryArgs = {};
    const mockQuery = async (args: unknown) => {
      capturedArgs = (args || {}) as CapturedQueryArgs;
      return [];
    };

    await requestContext.run({ businessId: "biz_tenant_alpha" }, async () => {
      await tenantExtensionDefinition.query.$allModels.$allOperations({
        model: "Customer",
        operation: "findMany",
        args: { where: { isActive: true } },
        query: mockQuery,
      });
    });

    expect(capturedArgs.where?.businessId).toBe("biz_tenant_alpha");
    expect(capturedArgs.where?.isActive).toBe(true);
  });

  it("rewrites findUnique with id to composite id_businessId", async () => {
    let capturedArgs: CapturedQueryArgs = {};
    const mockQuery = async (args: unknown) => {
      capturedArgs = (args || {}) as CapturedQueryArgs;
      return { id: "cust_123", businessId: "biz_tenant_alpha" };
    };

    await requestContext.run({ businessId: "biz_tenant_alpha" }, async () => {
      await tenantExtensionDefinition.query.$allModels.$allOperations({
        model: "Customer",
        operation: "findUnique",
        args: { where: { id: "cust_123" } },
        query: mockQuery,
      });
    });

    expect(capturedArgs.where?.id).toBeUndefined();
    expect(capturedArgs.where?.id_businessId).toEqual({
      id: "cust_123",
      businessId: "biz_tenant_alpha",
    });
  });

  it("enforces tenant businessId on existing id_businessId for findUnique", async () => {
    let capturedArgs: CapturedQueryArgs = {};
    const mockQuery = async (args: unknown) => {
      capturedArgs = (args || {}) as CapturedQueryArgs;
      return null;
    };

    await requestContext.run({ businessId: "biz_tenant_alpha" }, async () => {
      await tenantExtensionDefinition.query.$allModels.$allOperations({
        model: "Lead",
        operation: "findUnique",
        args: {
          where: {
            id_businessId: { id: "lead_123", businessId: "malicious_biz" },
          },
        },
        query: mockQuery,
      });
    });

    expect(capturedArgs.where?.id_businessId).toEqual({
      id: "lead_123",
      businessId: "biz_tenant_alpha",
    });
  });

  it("rewrites update with id to composite id_businessId", async () => {
    let capturedArgs: CapturedQueryArgs = {};
    const mockQuery = async (args: unknown) => {
      capturedArgs = (args || {}) as CapturedQueryArgs;
      return { id: "inv_123" };
    };

    await requestContext.run({ businessId: "biz_tenant_alpha" }, async () => {
      await tenantExtensionDefinition.query.$allModels.$allOperations({
        model: "Invoice",
        operation: "update",
        args: {
          where: { id: "inv_123" },
          data: { notes: "Updated note" },
        },
        query: mockQuery,
      });
    });

    expect(capturedArgs.where?.id).toBeUndefined();
    expect(capturedArgs.where?.id_businessId).toEqual({
      id: "inv_123",
      businessId: "biz_tenant_alpha",
    });
  });

  it("rewrites delete with id to composite id_businessId", async () => {
    let capturedArgs: CapturedQueryArgs = {};
    const mockQuery = async (args: unknown) => {
      capturedArgs = (args || {}) as CapturedQueryArgs;
      return { id: "exp_123" };
    };

    await requestContext.run({ businessId: "biz_tenant_alpha" }, async () => {
      await tenantExtensionDefinition.query.$allModels.$allOperations({
        model: "Expense",
        operation: "delete",
        args: { where: { id: "exp_123" } },
        query: mockQuery,
      });
    });

    expect(capturedArgs.where?.id).toBeUndefined();
    expect(capturedArgs.where?.id_businessId).toEqual({
      id: "exp_123",
      businessId: "biz_tenant_alpha",
    });
  });

  it("rewrites upsert with composite id_businessId and injects businessId on create", async () => {
    let capturedArgs: CapturedQueryArgs = {};
    const mockQuery = async (args: unknown) => {
      capturedArgs = (args || {}) as CapturedQueryArgs;
      return { id: "service_123" };
    };

    await requestContext.run({ businessId: "biz_tenant_alpha" }, async () => {
      await tenantExtensionDefinition.query.$allModels.$allOperations({
        model: "Service",
        operation: "upsert",
        args: {
          where: { id: "service_123" },
          create: { name: "Branding" },
          update: { name: "Re-branding" },
        },
        query: mockQuery,
      });
    });

    expect(capturedArgs.where?.id_businessId).toEqual({
      id: "service_123",
      businessId: "biz_tenant_alpha",
    });
    expect(capturedArgs.create?.businessId).toBe("biz_tenant_alpha");
  });

  it("auto-injects businessId on create operations when omitted", async () => {
    let capturedArgs: CapturedQueryArgs = {};
    const mockQuery = async (args: unknown) => {
      capturedArgs = (args || {}) as CapturedQueryArgs;
      return { id: "exp_123" };
    };

    await requestContext.run({ businessId: "biz_tenant_gamma" }, async () => {
      await tenantExtensionDefinition.query.$allModels.$allOperations({
        model: "Expense",
        operation: "create",
        args: { data: { description: "Supplies", amount: 25000 } },
        query: mockQuery,
      });
    });

    expect(
      (capturedArgs.data as Record<string, unknown> | undefined)?.businessId,
    ).toBe("biz_tenant_gamma");
  });

  it("auto-injects businessId across createMany entries", async () => {
    let capturedArgs: CapturedQueryArgs = {};
    const mockQuery = async (args: unknown) => {
      capturedArgs = (args || {}) as CapturedQueryArgs;
      return { count: 2 };
    };

    await requestContext.run({ businessId: "biz_tenant_gamma" }, async () => {
      await tenantExtensionDefinition.query.$allModels.$allOperations({
        model: "PortfolioProject",
        operation: "createMany",
        args: {
          data: [
            { title: "Project Alpha" },
            { title: "Project Beta", businessId: "biz_tenant_gamma" },
          ],
        },
        query: mockQuery,
      });
    });

    const dataArray = capturedArgs.data as Array<Record<string, unknown>>;
    expect(dataArray?.[0]?.businessId).toBe("biz_tenant_gamma");
    expect(dataArray?.[1]?.businessId).toBe("biz_tenant_gamma");
  });

  it("ignores non-tenant models", async () => {
    let capturedArgs: CapturedQueryArgs = {};
    const mockQuery = async (args: unknown) => {
      capturedArgs = (args || {}) as CapturedQueryArgs;
      return [];
    };

    await requestContext.run({ businessId: "biz_tenant_gamma" }, async () => {
      await tenantExtensionDefinition.query.$allModels.$allOperations({
        model: "User",
        operation: "findMany",
        args: { where: { email: "test@example.com" } },
        query: mockQuery,
      });
    });

    expect(capturedArgs.where?.businessId).toBeUndefined();
  });
});
