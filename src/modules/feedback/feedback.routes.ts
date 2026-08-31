import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { optionalAuthenticate } from "../../middlewares/auth";
import { rateLimit } from "../../utils";
import * as feedbackController from "./feedback.controller";
import * as feedbackSchema from "./schema/feedback.schema";

export async function feedbackRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    "/",
    {
      schema: feedbackSchema.submitFeedbackRouteSchema,
      preHandler: [optionalAuthenticate],
      ...rateLimit(30, "15 minutes"),
    },
    feedbackController.submitFeedbackHandler,
  );

  typedApp.get(
    "/",
    {
      schema: feedbackSchema.getFeedbackListRouteSchema,
    },
    feedbackController.getFeedbackListHandler,
  );
}
