import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { authenticate, requireBusiness } from "../../middlewares/auth";
import { rateLimit } from "../../utils";
import * as deliveryController from "./delivery.controller";
import * as deliverySchema from "./schema/delivery.schema";

export async function deliveryRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // ---------------------------------------------------------------------------
  // PUBLIC STOREFRONT DELIVERY QUERY (Rate limited)
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // AUTHENTICATED VENDOR DELIVERY MANAGEMENT
  // ---------------------------------------------------------------------------
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
    "/zones",
    {
      preHandler: [authenticate, requireBusiness],
    },
    deliveryController.listDeliveryZonesHandler,
  );

  typedApp.post(
    "/zones",
    {
      schema: {
        body: deliverySchema.deliveryZoneSchema,
      },
      preHandler: [authenticate, requireBusiness],
    },
    deliveryController.createDeliveryZoneHandler,
  );

  typedApp.put(
    "/zones/:id",
    {
      schema: {
        params: deliverySchema.deliveryZoneIdParamsSchema,
        body: deliverySchema.updateDeliveryZoneSchema,
      },
      preHandler: [authenticate, requireBusiness],
    },
    deliveryController.updateDeliveryZoneHandler,
  );

  typedApp.delete(
    "/zones/:id",
    {
      schema: {
        params: deliverySchema.deliveryZoneIdParamsSchema,
      },
      preHandler: [authenticate, requireBusiness],
    },
    deliveryController.deleteDeliveryZoneHandler,
  );
}
