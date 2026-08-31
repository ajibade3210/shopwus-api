import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  AdvancedValuationInputs,
  PublicValuationInputs,
} from "./schema/valuation.schema";
import {
  calculateAdvancedStudioValuationService,
  calculatePublicValuationService,
} from "./services/valuation.service";

export async function calculatePublicValuationHandler(
  request: FastifyRequest<{ Body: PublicValuationInputs }>,
  reply: FastifyReply,
) {
  const result = await calculatePublicValuationService(request.body);
  return reply.success(result, "Valuation calculated successfully");
}

export async function calculateAdvancedValuationHandler(
  request: FastifyRequest<{ Body?: AdvancedValuationInputs }>,
  reply: FastifyReply,
) {
  const result = await calculateAdvancedStudioValuationService(
    request.businessId,
    request.body,
  );
  return reply.success(result, "Studio valuation computed successfully");
}
