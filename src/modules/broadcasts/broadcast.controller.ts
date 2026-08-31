import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError } from "../../lib/errors";
import type { SendBroadcastInput } from "./schema/broadcast.schema";
import {
  getBroadcastHistoryService,
  sendBroadcastService,
} from "./services/broadcast.service";

export async function sendBroadcastHandler(
  request: FastifyRequest<{ Body: SendBroadcastInput }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await sendBroadcastService(businessId, request.body);
  return reply.success(
    result,
    "Broadcast campaign dispatched successfully",
    201,
  );
}

export async function getBroadcastHistoryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await getBroadcastHistoryService(businessId);
  return reply.success(result, "Broadcast campaign history retrieved");
}
