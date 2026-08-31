import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "../../middlewares/auth";
import * as broadcastController from "./broadcast.controller";
import * as broadcastSchema from "./schema/broadcast.schema";

export async function broadcastRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    "/send",
    {
      schema: broadcastSchema.sendBroadcastRouteSchema,
      preHandler: [authenticate],
    },
    broadcastController.sendBroadcastHandler,
  );

  typedApp.get(
    "/history",
    {
      schema: broadcastSchema.getBroadcastHistoryRouteSchema,
      preHandler: [authenticate],
    },
    broadcastController.getBroadcastHistoryHandler,
  );
}
