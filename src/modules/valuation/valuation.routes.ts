import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "../../middlewares/auth";
import { rateLimit } from "../../utils";
import * as valuationSchema from "./schema/valuation.schema";
import * as valuationController from "./valuation.controller";

export async function valuationRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Public unauthenticated appraisal calculator
  typedApp.post(
    "/calculate-public",
    {
      schema: valuationSchema.publicValuationRouteSchema,
      ...rateLimit(60, "15 minutes"),
    },
    valuationController.calculatePublicValuationHandler,
  );

  // Authenticated internal studio valuation
  typedApp.post(
    "/calculate-advanced",
    {
      schema: valuationSchema.advancedValuationRouteSchema,
      preHandler: [authenticate],
    },
    valuationController.calculateAdvancedValuationHandler,
  );
}
