import type { LeadStatus } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError } from "../../lib/errors";
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

export async function listLeadsHandler(
  request: FastifyRequest<{ Querystring: ListLeadsQuery }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await listLeadsService(businessId, request.query);
  return reply.success(result, "Leads retrieved");
}

export async function getLeadHandler(
  request: FastifyRequest<{ Params: LeadIdParams }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await getLeadByIdService(request.params.id, businessId);
  return reply.success(result, "Lead retrieved");
}

export async function createLeadHandler(
  request: FastifyRequest<{ Body: CreateLeadInput }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await createLeadAdminService(businessId, request.body);
  return reply.success(result, "Lead created successfully", 201);
}

export async function updateLeadStatusHandler(
  request: FastifyRequest<{
    Params: LeadIdParams;
    Body: UpdateLeadStatusInput;
  }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await updateLeadStatusService(
    request.params.id,
    businessId,
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
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await convertLeadToCustomerService(
    request.params.id,
    businessId,
    request.body,
  );
  return reply.success(result, "Lead converted to customer successfully");
}

export async function exportLeadsHandler(
  request: FastifyRequest<{ Querystring: { q?: string; status?: LeadStatus } }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const csv = await exportLeadsCsvService(businessId, request.query);

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
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await deleteLeadService(request.params.id, businessId);
  return reply.success(result, "Lead deleted successfully");
}
