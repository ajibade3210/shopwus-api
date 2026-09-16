import type { FastifyReply, FastifyRequest } from "fastify";
import { dispatchOrderWithTerminalService } from "../delivery/services/terminal.service";
import { serializeCheckoutSession, serializeOrder } from "./dto/order.dto";
import type {
  CreateManualOrderInput,
  CreateStorefrontOrderInput,
  ListOrdersQuery,
  SyncCheckoutSessionInput,
  UpdateOrderStatusInput,
} from "./schema/order.schema";
import {
  createManualOrderService,
  createStorefrontOrderService,
  getOrderByIdService,
  getOrderSummaryService,
  listOrdersService,
  syncCheckoutSessionService,
  updateOrderStatusService,
} from "./services/order.service";

export async function syncCheckoutSessionHandler(
  request: FastifyRequest<{
    Params: { slug: string };
    Querystring: { sessionId?: string };
    Body: SyncCheckoutSessionInput;
  }>,
  reply: FastifyReply,
) {
  const result = await syncCheckoutSessionService(
    request.params.slug,
    request.body,
    request.query.sessionId,
  );
  return reply.success(
    serializeCheckoutSession(result),
    "Checkout session synced",
  );
}

export async function createStorefrontOrderHandler(
  request: FastifyRequest<{
    Params: { slug: string };
    Body: CreateStorefrontOrderInput;
  }>,
  reply: FastifyReply,
) {
  const result = await createStorefrontOrderService(
    request.params.slug,
    request.body,
  );
  return reply.success(
    serializeOrder(result),
    "Order placed successfully",
    201,
  );
}

export async function createManualOrderHandler(
  request: FastifyRequest<{
    Body: CreateManualOrderInput;
  }>,
  reply: FastifyReply,
) {
  const result = await createManualOrderService(
    request.businessId,
    request.body,
  );
  return reply.success(
    serializeOrder(result),
    "Order created successfully",
    201,
  );
}

export async function listOrdersHandler(
  request: FastifyRequest<{ Querystring: ListOrdersQuery }>,
  reply: FastifyReply,
) {
  const result = await listOrdersService(request.businessId, request.query);
  return reply.success(
    {
      items: result.isAbandonedTab
        ? result.items.map((s) =>
            serializeCheckoutSession(
              s as Parameters<typeof serializeCheckoutSession>[0],
            ),
          )
        : result.items.map((o) =>
            serializeOrder(o as Parameters<typeof serializeOrder>[0]),
          ),
      isAbandonedTab: result.isAbandonedTab,
      meta: result.meta,
    },
    "Orders retrieved",
  );
}

export async function getOrderSummaryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await getOrderSummaryService(request.businessId);
  return reply.success(result, "Order summary retrieved");
}

export async function getOrderHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const result = await getOrderByIdService(
    request.params.id,
    request.businessId,
  );
  return reply.success(serializeOrder(result), "Order details retrieved");
}

export async function updateOrderStatusHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateOrderStatusInput;
  }>,
  reply: FastifyReply,
) {
  const result = await updateOrderStatusService(
    request.params.id,
    request.businessId,
    request.body,
  );
  return reply.success(serializeOrder(result), "Order status updated");
}

export async function dispatchOrderHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const result = await dispatchOrderWithTerminalService(
    request.params.id,
    request.businessId,
  );
  return reply.success(
    serializeOrder(result),
    "Order dispatched with Terminal Africa courier successfully",
  );
}
