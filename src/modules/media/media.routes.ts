import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "../../middlewares/auth";
import { rateLimit } from "../../utils";
import * as mediaController from "./media.controller";
import * as mediaSchema from "./schema/media.schema";

export async function mediaRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();
  typedApp.post(
    "/upload",
    {
      preHandler: [authenticate],
      schema: mediaSchema.uploadMediaRouteSchema,
      ...rateLimit(10, "1 hour"),
    },
    mediaController.uploadMedia,
  );

  typedApp.post(
    "/upload-multi",
    {
      preHandler: [authenticate],
      schema: mediaSchema.uploadMediaRouteSchema,
      ...rateLimit(10, "1 hour"),
    },
    mediaController.uploadMultiMedia,
  );

  typedApp.delete(
    "/delete",
    {
      preHandler: [authenticate],
      schema: mediaSchema.deleteMediaRouteSchema,
      ...rateLimit(10, "1 hour"),
    },
    mediaController.deleteMedia,
  );
}
