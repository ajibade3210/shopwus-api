import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "../../middlewares/auth";
import { rateLimit } from "../../utils";
import * as leadController from "./lead.controller";
import * as leadSchema from "./schema/lead.schema";

export async function leadRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Public Lead Capture via Storefront / Studio Slug
  typedApp.post(
    "/inquiry/:slug",
    {
      schema: leadSchema.publicInquiryRouteSchema,
      ...rateLimit(20, "15 minutes"),
    },
    leadController.submitPublicInquiryHandler,
  );

  // Authenticated Lead Pipeline & Management
  typedApp.get(
    "/",
    {
      schema: leadSchema.listLeadsRouteSchema,
      preHandler: [authenticate],
    },
    leadController.listLeadsHandler,
  );

  typedApp.get(
    "/export",
    {
      schema: leadSchema.exportLeadsRouteSchema,
      preHandler: [authenticate],
    },
    leadController.exportLeadsHandler,
  );

  typedApp.get(
    "/:id",
    {
      schema: leadSchema.getLeadRouteSchema,
      preHandler: [authenticate],
    },
    leadController.getLeadHandler,
  );

  typedApp.post(
    "/",
    {
      schema: leadSchema.createLeadRouteSchema,
      preHandler: [authenticate],
    },
    leadController.createLeadHandler,
  );

  typedApp.patch(
    "/:id/status",
    {
      schema: leadSchema.updateLeadStatusRouteSchema,
      preHandler: [authenticate],
    },
    leadController.updateLeadStatusHandler,
  );

  typedApp.post(
    "/:id/convert",
    {
      schema: leadSchema.convertLeadRouteSchema,
      preHandler: [authenticate],
    },
    leadController.convertLeadHandler,
  );

  typedApp.delete(
    "/:id",
    {
      schema: leadSchema.getLeadRouteSchema,
      preHandler: [authenticate],
    },
    leadController.deleteLeadHandler,
  );
}
