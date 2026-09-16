import type { FastifyReply, FastifyRequest } from "fastify";
import {
  type PaystackWebhookPayload,
  verifyPaystackWebhookSignature,
} from "../../lib/paystack";
import {
  serializeBusinessBilling,
  serializePaymentTransaction,
} from "./dto/billing.dto";
import type {
  InitializePaymentInput,
  ResolveAccountInput,
  UpdatePayoutAccountInput,
} from "./schema/billing.schema";
import {
  getBanksListService,
  getBillingSummaryService,
  initializeOrderPaymentService,
  processPaystackWebhookService,
  resolveAccountService,
  updatePayoutAccountService,
} from "./services/billing.service";

export async function getBanksListHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await getBanksListService();
  return reply.success(result, "Banks list retrieved");
}

export async function resolveAccountHandler(
  request: FastifyRequest<{ Body: ResolveAccountInput }>,
  reply: FastifyReply,
) {
  const result = await resolveAccountService(request.body);
  return reply.success(result, "Account details resolved");
}

export async function updatePayoutAccountHandler(
  request: FastifyRequest<{ Body: UpdatePayoutAccountInput }>,
  reply: FastifyReply,
) {
  const result = await updatePayoutAccountService(
    request.businessId,
    request.body,
  );
  return reply.success(
    serializeBusinessBilling(result),
    "Payout account and subaccount configured",
  );
}

export async function getBillingSummaryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await getBillingSummaryService(request.businessId);
  return reply.success(
    {
      billing: result.billing ? serializeBusinessBilling(result.billing) : null,
      stats: result.stats,
      transactions: result.transactions.map(serializePaymentTransaction),
    },
    "Billing summary retrieved",
  );
}

export async function initializeOrderPaymentHandler(
  request: FastifyRequest<{ Body: InitializePaymentInput }>,
  reply: FastifyReply,
) {
  const result = await initializeOrderPaymentService(
    request.body.orderId,
    request.body.callbackUrl,
  );
  return reply.success(result, "Payment initialized");
}

export async function paystackWebhookHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const signature = request.headers["x-paystack-signature"] as
    | string
    | undefined;
  const rawBody =
    (request as FastifyRequest & { rawBody?: string }).rawBody ||
    JSON.stringify(request.body);

  const isValid = verifyPaystackWebhookSignature(rawBody, signature);
  if (!isValid) {
    return reply.status(400).send({ message: "Invalid signature" });
  }

  processPaystackWebhookService(request.body as PaystackWebhookPayload).catch(
    (err) => {
      request.log.error(err, "Paystack webhook processing error");
    },
  );

  return reply.status(200).send({ status: true });
}
