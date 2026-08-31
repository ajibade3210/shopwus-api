import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate, requireBusiness } from "../../middlewares/auth";
import * as invoiceController from "./invoice.controller";
import * as invoiceSchema from "./schema/invoice.schema";

export async function invoiceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireBusiness);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // List, Summary & Export
  typedApp.get("/summary", invoiceController.getInvoiceSummaryHandler);

  typedApp.get(
    "/",
    {
      schema: invoiceSchema.listInvoicesRouteSchema,
    },
    invoiceController.listInvoicesHandler,
  );

  typedApp.get(
    "/export",
    {
      schema: invoiceSchema.exportInvoicesRouteSchema,
    },
    invoiceController.exportInvoicesHandler,
  );

  // Create
  typedApp.post(
    "/",
    {
      schema: invoiceSchema.createInvoiceRouteSchema,
    },
    invoiceController.createInvoiceHandler,
  );

  // Single Invoice CRUD
  typedApp.get(
    "/:id",
    {
      schema: invoiceSchema.getInvoiceRouteSchema,
    },
    invoiceController.getInvoiceHandler,
  );

  typedApp.put(
    "/:id",
    {
      schema: invoiceSchema.updateInvoiceRouteSchema,
    },
    invoiceController.updateInvoiceHandler,
  );

  typedApp.patch(
    "/:id/status",
    {
      schema: invoiceSchema.updateInvoiceStatusRouteSchema,
    },
    invoiceController.updateInvoiceStatusHandler,
  );

  typedApp.delete(
    "/:id",
    {
      schema: invoiceSchema.deleteInvoiceRouteSchema,
    },
    invoiceController.deleteInvoiceHandler,
  );

  // Dispatch & Resend
  typedApp.post(
    "/:id/send",
    {
      schema: invoiceSchema.sendInvoiceRouteSchema,
    },
    invoiceController.sendInvoiceHandler,
  );

  typedApp.post(
    "/:id/resend",
    {
      schema: invoiceSchema.sendInvoiceRouteSchema,
    },
    invoiceController.resendInvoiceHandler,
  );

  // Stream / Download PDF (Authenticated tenant access)
  typedApp.get(
    "/:id/pdf",
    {
      schema: invoiceSchema.getInvoiceRouteSchema,
    },
    invoiceController.getInvoicePdfHandler,
  );

  // Trigger background PDF re-render
  typedApp.post(
    "/:id/pdf/regenerate",
    {
      schema: invoiceSchema.getInvoiceRouteSchema,
    },
    invoiceController.triggerInvoicePdfRegenerationHandler,
  );
}
