import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireAdminSecret } from "../../middlewares/admin-auth";
import { authenticate, requireBusiness } from "../../middlewares/auth";
import { rateLimit } from "../../utils";
import * as deliveryController from "./delivery.controller";
import * as deliverySchema from "./schema/delivery.schema";

export async function deliveryRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    "/storefront/:slug",
    {
      schema: {
        params: z.object({ slug: z.string().min(1) }),
      },
      ...rateLimit(120, "1 minute"),
    },
    deliveryController.getStorefrontDeliveryConfigHandler,
  );

  typedApp.post(
    "/storefront/:slug/quotes",
    {
      schema: {
        params: z.object({ slug: z.string().min(1) }),
        body: deliverySchema.getStorefrontDeliveryQuotesSchema,
      },
      ...rateLimit(60, "1 minute"),
    },
    deliveryController.getStorefrontDeliveryQuotesHandler,
  );

  typedApp.get(
    "/settings",
    {
      preHandler: [authenticate, requireBusiness],
    },
    deliveryController.getDeliverySettingsHandler,
  );

  typedApp.put(
    "/settings",
    {
      schema: {
        body: deliverySchema.updateDeliverySettingsSchema,
      },
      preHandler: [authenticate, requireBusiness],
    },
    deliveryController.updateDeliverySettingsHandler,
  );

  typedApp.get(
    "/admin/sweep/status",
    {
      preHandler: [requireAdminSecret],
    },
    deliveryController.getLogisticsSweepStatusHandler,
  );

  typedApp.post(
    "/admin/sweep",
    {
      schema: {
        body: deliverySchema.executeLogisticsSweepSchema,
      },
      preHandler: [requireAdminSecret],
    },
    deliveryController.executeLogisticsSweepHandler,
  );
}

