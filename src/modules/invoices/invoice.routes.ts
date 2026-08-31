import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "../../middlewares/auth";
import * as invoiceController from "./invoice.controller";
import * as invoiceSchema from "./schema/invoice.schema";

export async function invoiceRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // List, Summary & Export
  typedApp.get(
    "/summary",
    {
      preHandler: [authenticate],
    },
    invoiceController.getInvoiceSummaryHandler,
  );

  typedApp.get(
    "/",
    {
      schema: invoiceSchema.listInvoicesRouteSchema,
      preHandler: [authenticate],
    },
    invoiceController.listInvoicesHandler,
  );

  typedApp.get(
    "/export",
    {
      schema: invoiceSchema.exportInvoicesRouteSchema,
      preHandler: [authenticate],
    },
    invoiceController.exportInvoicesHandler,
  );

  // Create
  typedApp.post(
    "/",
    {
      schema: invoiceSchema.createInvoiceRouteSchema,
      preHandler: [authenticate],
    },
    invoiceController.createInvoiceHandler,
  );

  // Single Invoice CRUD
  typedApp.get(
    "/:id",
    {
      schema: invoiceSchema.getInvoiceRouteSchema,
      preHandler: [authenticate],
    },
    invoiceController.getInvoiceHandler,
  );

  typedApp.put(
    "/:id",
    {
      schema: invoiceSchema.updateInvoiceRouteSchema,
      preHandler: [authenticate],
    },
    invoiceController.updateInvoiceHandler,
  );

  typedApp.patch(
    "/:id/status",
    {
      schema: invoiceSchema.updateInvoiceStatusRouteSchema,
      preHandler: [authenticate],
    },
    invoiceController.updateInvoiceStatusHandler,
  );

  typedApp.delete(
    "/:id",
    {
      schema: invoiceSchema.deleteInvoiceRouteSchema,
      preHandler: [authenticate],
    },
    invoiceController.deleteInvoiceHandler,
  );

  // Dispatch & Resend
  typedApp.post(
    "/:id/send",
    {
      schema: invoiceSchema.sendInvoiceRouteSchema,
      preHandler: [authenticate],
    },
    invoiceController.sendInvoiceHandler,
  );

  typedApp.post(
    "/:id/resend",
    {
      schema: invoiceSchema.sendInvoiceRouteSchema,
      preHandler: [authenticate],
    },
    invoiceController.resendInvoiceHandler,
  );

  // Stream / Download PDF (Authenticated tenant access)
  typedApp.get(
    "/:id/pdf",
    {
      schema: invoiceSchema.getInvoiceRouteSchema,
      preHandler: [authenticate],
    },
    invoiceController.getInvoicePdfHandler,
  );

  // Trigger background PDF re-render
  typedApp.post(
    "/:id/pdf/regenerate",
    {
      schema: invoiceSchema.getInvoiceRouteSchema,
      preHandler: [authenticate],
    },
    invoiceController.triggerInvoicePdfRegenerationHandler,
  );
}
