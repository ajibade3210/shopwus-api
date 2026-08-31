import type { FastifyReply, FastifyRequest } from "fastify";
import type { SendBroadcastInput } from "./schema/broadcast.schema";
import {
  getBroadcastHistoryService,
  sendBroadcastService,
} from "./services/broadcast.service";

export async function sendBroadcastHandler(
  request: FastifyRequest<{ Body: SendBroadcastInput }>,
  reply: FastifyReply,
) {
  const result = await sendBroadcastService(request.businessId, request.body);
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
  const result = await getBroadcastHistoryService(request.businessId);
  return reply.success(result, "Broadcast campaign history retrieved");
}
