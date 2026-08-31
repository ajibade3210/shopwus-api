import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate, requireBusiness } from "../../middlewares/auth";
import * as customerController from "./customer.controller";
import * as customerSchema from "./schema/customer.schema";

export async function customerRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireBusiness);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // List, Summary & Export
  typedApp.get(
    "/summary",
    customerController.getCustomerSummaryHandler,
  );

  typedApp.get(
    "/",
    {
      schema: customerSchema.listCustomersRouteSchema,
    },
    customerController.listCustomersHandler,
  );

  typedApp.get(
    "/export",
    {
      schema: customerSchema.exportCustomersRouteSchema,
    },
    customerController.exportCustomersHandler,
  );

  // Bulk Import
  typedApp.post(
    "/import",
    {
      schema: customerSchema.importCustomersRouteSchema,
    },
    customerController.importCustomersHandler,
  );

  // Create Customer
  typedApp.post(
    "/",
    {
      schema: customerSchema.createCustomerRouteSchema,
    },
    customerController.createCustomerHandler,
  );

  // Single Customer CRUD
  typedApp.get(
    "/:id",
    {
      schema: customerSchema.getCustomerRouteSchema,
    },
    customerController.getCustomerHandler,
  );

  typedApp.put(
    "/:id",
    {
      schema: customerSchema.updateCustomerRouteSchema,
    },
    customerController.updateCustomerHandler,
  );

  typedApp.patch(
    "/:id/status",
    {
      schema: customerSchema.toggleCustomerStatusRouteSchema,
    },
    customerController.toggleCustomerStatusHandler,
  );

  typedApp.delete(
    "/:id",
    {
      schema: customerSchema.deleteCustomerRouteSchema,
    },
    customerController.deleteCustomerHandler,
  );

  // Customer Services / Project Scopes
  typedApp.post(
    "/:id/services",
    {
      schema: customerSchema.addCustomerServiceRouteSchema,
    },
    customerController.addCustomerServiceHandler,
  );

  typedApp.patch(
    "/:id/services/:serviceId/status",
    {
      schema: customerSchema.updateCustomerServiceStatusRouteSchema,
    },
    customerController.updateCustomerServiceStatusHandler,
  );

  typedApp.patch(
    "/:id/services/:serviceId",
    {
      schema: customerSchema.updateCustomerServiceStatusRouteSchema,
    },
    customerController.updateCustomerServiceStatusHandler,
  );

  typedApp.delete(
    "/:id/services/:serviceId",
    {
      schema: customerSchema.deleteCustomerServiceRouteSchema,
    },
    customerController.deleteCustomerServiceHandler,
  );

  // Customer Activity Timeline
  typedApp.get(
    "/:id/activities",
    {
      schema: customerSchema.getCustomerActivitiesRouteSchema,
    },
    customerController.getCustomerActivitiesHandler,
  );

  typedApp.post(
    "/:id/activities",
    {
      schema: customerSchema.addCustomerActivityRouteSchema,
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
    },
    sendQuickCustomerInvoiceHandler,
  );
}
