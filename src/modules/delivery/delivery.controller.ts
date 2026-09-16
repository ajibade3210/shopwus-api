import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  ExecuteLogisticsSweepInput,
  GetStorefrontDeliveryQuotesInput,
  UpdateDeliverySettingsInput,
} from "./schema/delivery.schema";
import {
  getDeliverySettingsService,
  getStorefrontDeliveryConfigService,
  updateDeliverySettingsService,
} from "./services/delivery.service";
import { getStorefrontDeliveryQuotesService } from "./services/terminal.service";

export async function getDeliverySettingsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await getDeliverySettingsService(request.businessId);
  return reply.success(result, "Delivery settings retrieved");
}

export async function updateDeliverySettingsHandler(
  request: FastifyRequest<{ Body: UpdateDeliverySettingsInput }>,
  reply: FastifyReply,
) {
  const result = await updateDeliverySettingsService(
    request.businessId,
    request.body,
  );
  return reply.success(result, "Delivery settings updated");
}

export async function getStorefrontDeliveryConfigHandler(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply,
) {
  const result = await getStorefrontDeliveryConfigService(request.params.slug);
  return reply.success(result, "Storefront delivery config retrieved");
}

export async function getStorefrontDeliveryQuotesHandler(
  request: FastifyRequest<{
    Params: { slug: string };
    Body: GetStorefrontDeliveryQuotesInput;
  }>,
  reply: FastifyReply,
) {
  const result = await getStorefrontDeliveryQuotesService(
    request.params.slug,
    request.body,
  );
  return reply.success(result, "Delivery quotes retrieved");
}

export async function getLogisticsSweepStatusHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const { getUnsettledLogisticsSummary } = await import(
    "./services/logistics-sweep.service"
  );
  const result = await getUnsettledLogisticsSummary();
  return reply.success(result, "Logistics sweep treasury status retrieved");
}

export async function executeLogisticsSweepHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { executeLogisticsSweep } = await import(
    "./services/logistics-sweep.service"
  );
  const body = request.body as ExecuteLogisticsSweepInput | undefined;
  const forceRecordOnly = Boolean(body?.recordOnly);
  const result = await executeLogisticsSweep("MANUAL", forceRecordOnly);
  return reply.success(result, result.message);
}
