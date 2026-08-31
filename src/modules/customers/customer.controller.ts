import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError } from "../../lib/errors";
import type {
  AddCustomerActivityInput,
  AddCustomerServiceInput,
  CreateCustomerInput,
  CustomerIdParams,
  CustomerServiceParams,
  ImportCustomersInput,
  ListCustomersQuery,
  ToggleCustomerStatusInput,
  UpdateCustomerInput,
  UpdateCustomerServiceStatusInput,
} from "./schema/customer.schema";
import {
  createCustomerService,
  deleteCustomerService,
  getCustomerByIdService,
  listCustomersService,
  toggleCustomerStatusService,
  updateCustomerService,
} from "./services/customer.service";
import {
  addCustomerActivityService,
  getCustomerActivitiesService,
} from "./services/customer-activity.service";
import {
  exportCustomersCsvService,
  importCustomersService,
} from "./services/customer-bulk.service";
import {
  addCustomerServiceService,
  deleteCustomerServiceService,
  updateCustomerServiceStatusService,
} from "./services/customer-service.service";

export async function listCustomersHandler(
  request: FastifyRequest<{ Querystring: ListCustomersQuery }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await listCustomersService(businessId, request.query);
  return reply.success(result, "Customers retrieved");
}

export async function getCustomerHandler(
  request: FastifyRequest<{ Params: CustomerIdParams }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await getCustomerByIdService(request.params.id, businessId);
  return reply.success(result, "Customer retrieved");
}

export async function createCustomerHandler(
  request: FastifyRequest<{ Body: CreateCustomerInput }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await createCustomerService(businessId, request.body);
  return reply.success(result, "Customer created successfully", 201);
}

export async function updateCustomerHandler(
  request: FastifyRequest<{
    Params: CustomerIdParams;
    Body: UpdateCustomerInput;
  }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await updateCustomerService(
    request.params.id,
    businessId,
    request.body,
  );
  return reply.success(result, "Customer updated successfully");
}

export async function toggleCustomerStatusHandler(
  request: FastifyRequest<{
    Params: CustomerIdParams;
    Body: ToggleCustomerStatusInput;
  }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await toggleCustomerStatusService(
    request.params.id,
    businessId,
    request.body.isActive,
  );
  return reply.success(result, "Customer status updated");
}

export async function deleteCustomerHandler(
  request: FastifyRequest<{ Params: CustomerIdParams }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await deleteCustomerService(request.params.id, businessId);
  return reply.success(result, "Customer deleted successfully");
}

export async function addCustomerServiceHandler(
  request: FastifyRequest<{
    Params: CustomerIdParams;
    Body: AddCustomerServiceInput;
  }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await addCustomerServiceService(
    request.params.id,
    businessId,
    request.body,
  );
  return reply.success(result, "Service added to customer", 201);
}

export async function updateCustomerServiceStatusHandler(
  request: FastifyRequest<{
    Params: CustomerServiceParams;
    Body: UpdateCustomerServiceStatusInput;
  }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await updateCustomerServiceStatusService(
    request.params.id,
    request.params.serviceId,
    businessId,
    request.body.status,
  );
  return reply.success(result, "Service status updated");
}

export async function deleteCustomerServiceHandler(
  request: FastifyRequest<{ Params: CustomerServiceParams }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await deleteCustomerServiceService(
    request.params.id,
    request.params.serviceId,
    businessId,
  );
  return reply.success(result, "Service deleted from customer");
}

export async function getCustomerActivitiesHandler(
  request: FastifyRequest<{ Params: CustomerIdParams }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await getCustomerActivitiesService(
    request.params.id,
    businessId,
  );
  return reply.success(result, "Customer activities retrieved");
}

export async function addCustomerActivityHandler(
  request: FastifyRequest<{
    Params: CustomerIdParams;
    Body: AddCustomerActivityInput;
  }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await addCustomerActivityService(
    request.params.id,
    businessId,
    request.body,
  );
  return reply.success(result, "Activity logged successfully", 201);
}

export async function importCustomersHandler(
  request: FastifyRequest<{ Body: ImportCustomersInput }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await importCustomersService(businessId, request.body);
  return reply.success(result, "Customers imported successfully");
}

export async function exportCustomersHandler(
  request: FastifyRequest<{ Querystring: { q?: string; isActive?: boolean } }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const csv = await exportCustomersCsvService(businessId, request.query);

  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header(
    "Content-Disposition",
    `attachment; filename="customers-${new Date().toISOString().split("T")[0]}.csv"`,
  );
  return reply.send(csv);
}
