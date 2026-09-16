import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { authenticate, requireBusiness } from "../../middlewares/auth";
import { rateLimit } from "../../utils";
import * as orderController from "./order.controller";
import * as orderSchema from "./schema/order.schema";

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    "/storefront/:slug/checkout/session",
    {
      schema: {
        params: z.object({ slug: z.string().min(1) }),
        querystring: z.object({ sessionId: z.string().optional() }),
        body: orderSchema.syncCheckoutSessionSchema,
      },
      ...rateLimit(60, "1 minute"),
    },
    orderController.syncCheckoutSessionHandler,
  );

  typedApp.post(
    "/storefront/:slug/checkout/order",
    {
      schema: {
        params: z.object({ slug: z.string().min(1) }),
        body: orderSchema.createStorefrontOrderSchema,
      },
      ...rateLimit(30, "1 minute"),
    },
    orderController.createStorefrontOrderHandler,
  );

  typedApp.post(
    "/manual",
    {
      schema: {
        body: orderSchema.createManualOrderSchema,
      },
      preHandler: [authenticate, requireBusiness],
    },
    orderController.createManualOrderHandler,
  );

  typedApp.get(
    "/summary",
    {
      preHandler: [authenticate, requireBusiness],
    },
    orderController.getOrderSummaryHandler,
  );

  typedApp.get(
    "/",
    {
      schema: { querystring: orderSchema.listOrdersQuerySchema },
      preHandler: [authenticate, requireBusiness],
    },
    orderController.listOrdersHandler,
  );

  typedApp.get(
    "/:id",
    {
      schema: { params: orderSchema.orderIdParamsSchema },
      preHandler: [authenticate, requireBusiness],
    },
    orderController.getOrderHandler,
  );

  typedApp.patch(
    "/:id/status",
    {
      schema: {
        params: orderSchema.orderIdParamsSchema,
        body: orderSchema.updateOrderStatusSchema,
      },
      preHandler: [authenticate, requireBusiness],
    },
    orderController.updateOrderStatusHandler,
  );

  typedApp.post(
    "/:id/dispatch",
    {
      schema: {
        params: orderSchema.orderIdParamsSchema,
      },
      preHandler: [authenticate, requireBusiness],
    },
    orderController.dispatchOrderHandler,
  );
}
