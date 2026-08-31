import type { LeadStatus } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  ConvertLeadInput,
  CreateLeadInput,
  LeadIdParams,
  ListLeadsQuery,
  PublicInquiryInput,
  UpdateLeadStatusInput,
} from "./schema/lead.schema";
import {
  convertLeadToCustomerService,
  createLeadAdminService,
  deleteLeadService,
  exportLeadsCsvService,
  getLeadByIdService,
  getLeadSummaryService,
  listLeadsService,
  submitPublicInquiryService,
  updateLeadStatusService,
} from "./services/lead.service";

export async function submitPublicInquiryHandler(
  request: FastifyRequest<{
    Params: { slug: string };
    Body: PublicInquiryInput;
  }>,
  reply: FastifyReply,
) {
  const { slug } = request.params;
  const result = await submitPublicInquiryService(slug, request.body);
  return reply.success(result, "Inquiry submitted successfully", 201);
}

export async function getLeadSummaryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await getLeadSummaryService(request.businessId);
  return reply.success(result, "Lead summary retrieved");
}

export async function listLeadsHandler(
  request: FastifyRequest<{ Querystring: ListLeadsQuery }>,
  reply: FastifyReply,
) {
  const result = await listLeadsService(request.businessId, request.query);
  return reply.success(result, "Leads retrieved");
}

export async function getLeadHandler(
  request: FastifyRequest<{ Params: LeadIdParams }>,
  reply: FastifyReply,
) {
  const result = await getLeadByIdService(
    request.params.id,
    request.businessId,
  );
  return reply.success(result, "Lead retrieved");
}

export async function createLeadHandler(
  request: FastifyRequest<{ Body: CreateLeadInput }>,
  reply: FastifyReply,
) {
  const result = await createLeadAdminService(request.businessId, request.body);
  return reply.success(result, "Lead created successfully", 201);
}

export async function updateLeadStatusHandler(
  request: FastifyRequest<{
    Params: LeadIdParams;
    Body: UpdateLeadStatusInput;
  }>,
  reply: FastifyReply,
) {
  const result = await updateLeadStatusService(
    request.params.id,
    request.businessId,
    request.body.status,
  );
  return reply.success(result, "Lead status updated");
}

export async function convertLeadHandler(
  request: FastifyRequest<{
    Params: LeadIdParams;
    Body: ConvertLeadInput;
  }>,
  reply: FastifyReply,
) {
  const result = await convertLeadToCustomerService(
    request.params.id,
    request.businessId,
    request.body,
  );
  return reply.success(result, "Lead converted to customer successfully");
}

export async function exportLeadsHandler(
  request: FastifyRequest<{ Querystring: { q?: string; status?: LeadStatus } }>,
  reply: FastifyReply,
) {
  const csv = await exportLeadsCsvService(request.businessId, request.query);

  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header(
    "Content-Disposition",
    `attachment; filename="leads-${new Date().toISOString().split("T")[0]}.csv"`,
  );
  return reply.send(csv);
}

export async function deleteLeadHandler(
  request: FastifyRequest<{ Params: LeadIdParams }>,
  reply: FastifyReply,
) {
  const result = await deleteLeadService(request.params.id, request.businessId);
  return reply.success(result, "Lead deleted successfully");
}
