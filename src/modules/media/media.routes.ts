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
      ...rateLimit(120, "1 minute"),
    },
    mediaController.uploadMedia,
  );

  typedApp.post(
    "/upload-multi",
    {
      preHandler: [authenticate],
      schema: mediaSchema.uploadMediaRouteSchema,
      ...rateLimit(120, "1 minute"),
    },
    mediaController.uploadMultiMedia,
  );

  typedApp.post(
    "/presigned-url",
    {
      preHandler: [authenticate],
      schema: mediaSchema.presignedUrlRouteSchema,
      ...rateLimit(120, "1 minute"),
    },
    mediaController.getPresignedUrl,
  );

  typedApp.post(
    "/presigned-urls",
    {
      preHandler: [authenticate],
      schema: mediaSchema.presignedUrlsRouteSchema,
      ...rateLimit(120, "1 minute"),
    },
    mediaController.getPresignedUrls,
  );

  typedApp.delete(
    "/delete",
    {
      preHandler: [authenticate],
      schema: mediaSchema.deleteMediaRouteSchema,
      ...rateLimit(120, "1 minute"),
    },
    mediaController.deleteMedia,
  );
}
