import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate, requireBusiness } from "../../middlewares/auth";
import * as broadcastController from "./broadcast.controller";
import * as broadcastSchema from "./schema/broadcast.schema";

export async function broadcastRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireBusiness);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    "/send",
    {
      schema: broadcastSchema.sendBroadcastRouteSchema,
    },
    broadcastController.sendBroadcastHandler,
  );

  typedApp.get(
    "/history",
    {
      schema: broadcastSchema.getBroadcastHistoryRouteSchema,
    },
    broadcastController.getBroadcastHistoryHandler,
  );
}
