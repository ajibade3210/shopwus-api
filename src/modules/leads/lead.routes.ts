import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate, requireBusiness } from "../../middlewares/auth";
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
  typedApp.register(async (authApp) => {
    authApp.addHook("preHandler", authenticate);
    authApp.addHook("preHandler", requireBusiness);

    const typedAuthApp = authApp.withTypeProvider<ZodTypeProvider>();

    typedAuthApp.get(
      "/summary",
      leadController.getLeadSummaryHandler,
    );

    typedAuthApp.get(
      "/",
      {
        schema: leadSchema.listLeadsRouteSchema,
      },
      leadController.listLeadsHandler,
    );

    typedAuthApp.get(
      "/export",
      {
        schema: leadSchema.exportLeadsRouteSchema,
      },
      leadController.exportLeadsHandler,
    );

    typedAuthApp.get(
      "/:id",
      {
        schema: leadSchema.getLeadRouteSchema,
      },
      leadController.getLeadHandler,
    );

    typedAuthApp.post(
      "/",
      {
        schema: leadSchema.createLeadRouteSchema,
      },
      leadController.createLeadHandler,
    );

    typedAuthApp.patch(
      "/:id/status",
      {
        schema: leadSchema.updateLeadStatusRouteSchema,
      },
      leadController.updateLeadStatusHandler,
    );

    typedAuthApp.post(
      "/:id/convert",
      {
        schema: leadSchema.convertLeadRouteSchema,
      },
      leadController.convertLeadHandler,
    );

    typedAuthApp.delete(
      "/:id",
      {
        schema: leadSchema.getLeadRouteSchema,
      },
      leadController.deleteLeadHandler,
    );
  });
}
