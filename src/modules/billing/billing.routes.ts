import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate, requireBusiness } from "../../middlewares/auth";
import { rateLimit } from "../../utils";
import * as billingController from "./billing.controller";
import * as billingSchema from "./schema/billing.schema";

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post("/webhook", billingController.paystackWebhookHandler);

  typedApp.post(
    "/storefront/initialize-payment",
    {
      schema: {
        body: billingSchema.initializePaymentSchema,
      },
      ...rateLimit(60, "1 minute"),
    },
    billingController.initializeOrderPaymentHandler,
  );

  typedApp.get(
    "/banks",
    {
      preHandler: [authenticate, requireBusiness],
    },
    billingController.getBanksListHandler,
  );

  typedApp.post(
    "/resolve-account",
    {
      schema: {
        body: billingSchema.resolveAccountSchema,
      },
      preHandler: [authenticate, requireBusiness],
    },
    billingController.resolveAccountHandler,
  );

  typedApp.post(
    "/payout-account",
    {
      schema: {
        body: billingSchema.updatePayoutAccountSchema,
      },
      preHandler: [authenticate, requireBusiness],
    },
    billingController.updatePayoutAccountHandler,
  );

  typedApp.get(
    "/summary",
    {
      preHandler: [authenticate, requireBusiness],
    },
    billingController.getBillingSummaryHandler,
  );
}
