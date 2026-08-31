import type { InvoiceStatus } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError } from "../../lib/errors";
import type {
  CreateInvoiceInput,
  InvoiceIdParams,
  ListInvoicesQuery,
  QuickCustomerInvoiceBody,
  QuickCustomerInvoiceParams,
  UpdateInvoiceInput,
  UpdateInvoiceStatusInput,
} from "./schema/invoice.schema";
import {
  createInvoiceService,
  deleteInvoiceService,
  exportInvoicesCsvService,
  getInvoiceByIdService,
  getInvoiceSummaryService,
  listInvoicesService,
  updateInvoiceService,
  updateInvoiceStatusService,
} from "./services/invoice.service";
import {
  resendInvoiceService,
  sendInvoiceService,
  sendQuickCustomerInvoiceService,
} from "./services/invoice-dispatch.service";
import {
  getInvoicePdfDownloadService,
  triggerInvoicePdfRegenerationService,
} from "./services/invoice-pdf.service";

export async function getInvoiceSummaryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await getInvoiceSummaryService(businessId);
  return reply.success(result, "Invoice summary retrieved");
}

export async function listInvoicesHandler(
  request: FastifyRequest<{ Querystring: ListInvoicesQuery }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await listInvoicesService(businessId, request.query);
  return reply.success(result, "Invoices retrieved");
}

export async function getInvoiceHandler(
  request: FastifyRequest<{ Params: InvoiceIdParams }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await getInvoiceByIdService(request.params.id, businessId);
  return reply.success(result, "Invoice retrieved");
}

export async function createInvoiceHandler(
  request: FastifyRequest<{ Body: CreateInvoiceInput }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await createInvoiceService(businessId, request.body);
  return reply.success(result, "Invoice created successfully", 201);
}

export async function updateInvoiceHandler(
  request: FastifyRequest<{
    Params: InvoiceIdParams;
    Body: UpdateInvoiceInput;
  }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await updateInvoiceService(
    request.params.id,
    businessId,
    request.body,
  );
  return reply.success(result, "Invoice updated successfully");
}

export async function updateInvoiceStatusHandler(
  request: FastifyRequest<{
    Params: InvoiceIdParams;
    Body: UpdateInvoiceStatusInput;
  }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await updateInvoiceStatusService(
    request.params.id,
    businessId,
    request.body.status,
  );
  return reply.success(result, "Invoice status updated");
}

export async function deleteInvoiceHandler(
  request: FastifyRequest<{ Params: InvoiceIdParams }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await deleteInvoiceService(request.params.id, businessId);
  return reply.success(result, "Invoice deleted successfully");
}

export async function sendInvoiceHandler(
  request: FastifyRequest<{ Params: InvoiceIdParams }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await sendInvoiceService(request.params.id, businessId);
  return reply.success(result, "Invoice dispatched to client successfully");
}

export async function resendInvoiceHandler(
  request: FastifyRequest<{ Params: InvoiceIdParams }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await resendInvoiceService(request.params.id, businessId);
  return reply.success(result, "Invoice resent to client successfully");
}

export async function getInvoicePdfHandler(
  request: FastifyRequest<{ Params: InvoiceIdParams }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await getInvoicePdfDownloadService(
    request.params.id,
    businessId,
  );

  if (!result.ready || !result.downloadUrl) {
    return reply.status(202).send({
      success: true,
      statusCode: 202,
      data: {
        status: "pending",
        message:
          "Invoice PDF is being generated in background. Please retry shortly.",
        filename: result.filename,
        invoiceNumber: result.invoiceNumber,
      },
    });
  }

  // If client accepts JSON or requests direct URL metadata
  if (request.headers.accept?.includes("application/json")) {
    return reply.success(
      {
        status: "ready",
        downloadUrl: result.downloadUrl,
        pdfUrl: result.pdfUrl,
        filename: result.filename,
        invoiceNumber: result.invoiceNumber,
      },
      "Invoice PDF URL retrieved",
    );
  }

  // Otherwise redirect directly to the signed R2 download link
  return reply.redirect(result.downloadUrl, 302);
}

export async function triggerInvoicePdfRegenerationHandler(
  request: FastifyRequest<{ Params: InvoiceIdParams }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await triggerInvoicePdfRegenerationService(
    request.params.id,
    businessId,
  );
  return reply.success(result, result.message, 202);
}

export async function exportInvoicesHandler(
  request: FastifyRequest<{
    Querystring: { q?: string; status?: InvoiceStatus; customerId?: string };
  }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const csv = await exportInvoicesCsvService(businessId, request.query);

  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header(
    "Content-Disposition",
    `attachment; filename="invoices-${new Date().toISOString().split("T")[0]}.csv"`,
  );
  return reply.send(csv);
}

export async function sendQuickCustomerInvoiceHandler(
  request: FastifyRequest<{
    Params: QuickCustomerInvoiceParams;
    Body?: QuickCustomerInvoiceBody;
  }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await sendQuickCustomerInvoiceService(
    request.params.customerId,
    businessId,
    request.body,
  );
  return reply.success(
    result,
    "Invoice created & dispatched successfully",
    201,
  );
}
