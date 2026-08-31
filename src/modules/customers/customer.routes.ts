import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "../../middlewares/auth";
import * as customerController from "./customer.controller";
import * as customerSchema from "./schema/customer.schema";

export async function customerRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // List & Export
  typedApp.get(
    "/",
    {
      schema: customerSchema.listCustomersRouteSchema,
      preHandler: [authenticate],
    },
    customerController.listCustomersHandler,
  );

  typedApp.get(
    "/export",
    {
      schema: customerSchema.exportCustomersRouteSchema,
      preHandler: [authenticate],
    },
    customerController.exportCustomersHandler,
  );

  // Bulk Import
  typedApp.post(
    "/import",
    {
      schema: customerSchema.importCustomersRouteSchema,
      preHandler: [authenticate],
    },
    customerController.importCustomersHandler,
  );

  // Create Customer
  typedApp.post(
    "/",
    {
      schema: customerSchema.createCustomerRouteSchema,
      preHandler: [authenticate],
    },
    customerController.createCustomerHandler,
  );

  // Single Customer CRUD
  typedApp.get(
    "/:id",
    {
      schema: customerSchema.getCustomerRouteSchema,
      preHandler: [authenticate],
    },
    customerController.getCustomerHandler,
  );

  typedApp.put(
    "/:id",
    {
      schema: customerSchema.updateCustomerRouteSchema,
      preHandler: [authenticate],
    },
    customerController.updateCustomerHandler,
  );

  typedApp.patch(
    "/:id/status",
    {
      schema: customerSchema.toggleCustomerStatusRouteSchema,
      preHandler: [authenticate],
    },
    customerController.toggleCustomerStatusHandler,
  );

  typedApp.delete(
    "/:id",
    {
      schema: customerSchema.deleteCustomerRouteSchema,
      preHandler: [authenticate],
    },
    customerController.deleteCustomerHandler,
  );

  // Customer Services / Project Scopes
  typedApp.post(
    "/:id/services",
    {
      schema: customerSchema.addCustomerServiceRouteSchema,
      preHandler: [authenticate],
    },
    customerController.addCustomerServiceHandler,
  );

  typedApp.patch(
    "/:id/services/:serviceId/status",
    {
      schema: customerSchema.updateCustomerServiceStatusRouteSchema,
      preHandler: [authenticate],
    },
    customerController.updateCustomerServiceStatusHandler,
  );

  typedApp.patch(
    "/:id/services/:serviceId",
    {
      schema: customerSchema.updateCustomerServiceStatusRouteSchema,
      preHandler: [authenticate],
    },
    customerController.updateCustomerServiceStatusHandler,
  );

  typedApp.delete(
    "/:id/services/:serviceId",
    {
      schema: customerSchema.deleteCustomerServiceRouteSchema,
      preHandler: [authenticate],
    },
    customerController.deleteCustomerServiceHandler,
  );

  // Customer Activity Timeline
  typedApp.get(
    "/:id/activities",
    {
      schema: customerSchema.getCustomerActivitiesRouteSchema,
      preHandler: [authenticate],
    },
    customerController.getCustomerActivitiesHandler,
  );

  typedApp.post(
    "/:id/activities",
    {
      schema: customerSchema.addCustomerActivityRouteSchema,
      preHandler: [authenticate],
    },
    customerController.addCustomerActivityHandler,
  );

  // Quick One-Click Customer Invoice Dispatch
  const { quickCustomerInvoiceRouteSchema } = await import(
    "../invoices/schema/invoice.schema"
  );
  const { sendQuickCustomerInvoiceHandler } = await import(
    "../invoices/invoice.controller"
  );

  typedApp.post(
    "/:customerId/invoices/send",
    {
      schema: quickCustomerInvoiceRouteSchema,
      preHandler: [authenticate],
    },
    sendQuickCustomerInvoiceHandler,
  );
}
