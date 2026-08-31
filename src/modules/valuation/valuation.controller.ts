import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError } from "../../lib/errors";
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
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await calculateAdvancedStudioValuationService(
    businessId,
    request.body,
  );
  return reply.success(result, "Studio valuation computed successfully");
}
