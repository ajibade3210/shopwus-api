import type { FastifyReply, FastifyRequest } from "fastify";
import { serializeDeliveryZone } from "./dto/delivery.dto";
import type {
  DeliveryZoneInput,
  UpdateDeliverySettingsInput,
  UpdateDeliveryZoneInput,
} from "./schema/delivery.schema";
import {
  createDeliveryZoneService,
  deleteDeliveryZoneService,
  getDeliverySettingsService,
  getStorefrontDeliveryConfigService,
  listDeliveryZonesService,
  updateDeliverySettingsService,
  updateDeliveryZoneService,
} from "./services/delivery.service";

// ---------------------------------------------------------------------------
// VENDOR DELIVERY ZONES
// ---------------------------------------------------------------------------

export async function listDeliveryZonesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await listDeliveryZonesService(request.businessId);
  return reply.success(
    result.map(serializeDeliveryZone),
    "Delivery zones retrieved",
  );
}

export async function createDeliveryZoneHandler(
  request: FastifyRequest<{ Body: DeliveryZoneInput }>,
  reply: FastifyReply,
) {
  const result = await createDeliveryZoneService(
    request.businessId,
    request.body,
  );
  return reply.success(
    serializeDeliveryZone(result),
    "Delivery zone created",
    201,
  );
}

export async function updateDeliveryZoneHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateDeliveryZoneInput;
  }>,
  reply: FastifyReply,
) {
  const result = await updateDeliveryZoneService(
    request.params.id,
    request.businessId,
    request.body,
  );
  return reply.success(serializeDeliveryZone(result), "Delivery zone updated");
}

export async function deleteDeliveryZoneHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await deleteDeliveryZoneService(request.params.id, request.businessId);
  return reply.success(null, "Delivery zone deleted");
}

// ---------------------------------------------------------------------------
// VENDOR DELIVERY SETTINGS
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// PUBLIC STOREFRONT DELIVERY
// ---------------------------------------------------------------------------

export async function getStorefrontDeliveryConfigHandler(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply,
) {
  const result = await getStorefrontDeliveryConfigService(request.params.slug);
  return reply.success(result, "Storefront delivery config retrieved");
}
