import { Prisma } from "@prisma/client";
import { getRequestContext } from "../utils/requestContext";

export const TENANT_SCOPED_MODELS = new Set([
  "Customer",
  "CustomerService",
  "CustomerActivity",
  "Lead",
  "Invoice",
  "Expense",
  "BroadcastCampaign",
  "DocumentSequence",
  "Service",
  "SocialChannel",
  "PortfolioProject",
  "Review",
]);

export const tenantExtensionDefinition = {
  name: "tenantExtension",
  query: {
    $allModels: {
      async $allOperations({
        model,
        operation,
        args,
        query,
      }: {
        model?: string;
        operation: string;
        args: unknown;
        query: (args: unknown) => Promise<unknown>;
      }) {
        if (!model || !TENANT_SCOPED_MODELS.has(model)) {
          return query(args);
        }

        const context = getRequestContext();
        const tenantId = context?.businessId;

        // If no active tenant context in request (e.g. system background jobs, seeds, unauthenticated webhooks), proceed normally
        if (!tenantId) {
          return query(args);
        }

        const currentArgs = (args || {}) as Record<string, any>;

        // 1. Read operations: findFirst, findMany, count, aggregate, groupBy
        if (
          operation === "findFirst" ||
          operation === "findFirstOrThrow" ||
          operation === "findMany" ||
          operation === "count" ||
          operation === "aggregate" ||
          operation === "groupBy"
        ) {
          const where = currentArgs.where || {};
          currentArgs.where = { ...where, businessId: tenantId };
          return query(currentArgs);
        }

        // 2. Single-record read operations: findUnique, findUniqueOrThrow
        if (operation === "findUnique" || operation === "findUniqueOrThrow") {
          const where = currentArgs.where || {};
          if (where.id && !where.id_businessId) {
            const { id, ...restWhere } = where;
            currentArgs.where = {
              ...restWhere,
              id_businessId: { id, businessId: tenantId },
            };
          } else if (where.id_businessId) {
            currentArgs.where = {
              ...where,
              id_businessId: {
                ...where.id_businessId,
                businessId: tenantId,
              },
            };
          }
          return query(currentArgs);
        }

        // 3. Create operations: create, createMany
        if (operation === "create") {
          if (currentArgs.data) {
            currentArgs.data.businessId = tenantId;
          }
          return query(currentArgs);
        }

        if (operation === "createMany" || operation === "createManyAndReturn") {
          if (Array.isArray(currentArgs.data)) {
            currentArgs.data = currentArgs.data.map(
              (item: Record<string, unknown>) => ({
                ...item,
                businessId: tenantId,
              }),
            );
          } else if (currentArgs.data && typeof currentArgs.data === "object") {
            currentArgs.data.businessId = tenantId;
          }
          return query(currentArgs);
        }

        // 4. Single-record mutation: update, delete
        if (operation === "update" || operation === "delete") {
          const where = currentArgs.where || {};
          if (where.id && !where.id_businessId) {
            const { id, ...restWhere } = where;
            currentArgs.where = {
              ...restWhere,
              id_businessId: { id, businessId: tenantId },
            };
          } else if (where.id_businessId) {
            currentArgs.where = {
              ...where,
              id_businessId: {
                ...where.id_businessId,
                businessId: tenantId,
              },
            };
          }
          return query(currentArgs);
        }

        // 5. Single-record upsert
        if (operation === "upsert") {
          const where = currentArgs.where || {};
          if (where.id && !where.id_businessId) {
            const { id, ...restWhere } = where;
            currentArgs.where = {
              ...restWhere,
              id_businessId: { id, businessId: tenantId },
            };
          } else if (where.id_businessId) {
            currentArgs.where = {
              ...where,
              id_businessId: {
                ...where.id_businessId,
                businessId: tenantId,
              },
            };
          }
          if (currentArgs.create && !("businessId" in currentArgs.create)) {
            currentArgs.create.businessId = tenantId;
          }
          return query(currentArgs);
        }

        // 6. Bulk mutations: updateMany, deleteMany
        if (operation === "updateMany" || operation === "deleteMany") {
          const where = currentArgs.where || {};
          currentArgs.where = { ...where, businessId: tenantId };
          return query(currentArgs);
        }

        return query(args);
      },
    },
  },
};

export const tenantExtension = Prisma.defineExtension(
  tenantExtensionDefinition,
);
