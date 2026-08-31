import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  authenticate,
  optionalAuthenticate,
  requireStudioOwner,
} from "../../middlewares/auth";
import { rateLimit } from "../../utils";
import * as studioSchema from "./schema/studio.schema";
import * as studioController from "./studio.controller";

export async function studioRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Public: Check slug availability
  typedApp.get(
    "/check-slug",
    {
      schema: studioSchema.checkSlugRouteSchema,
      preHandler: [optionalAuthenticate],
      ...rateLimit(60, "1 minute"),
    },
    studioController.checkSlugHandler,
  );

  // Authenticated: Director Studio Profile & Settings
  typedApp.get(
    "/me",
    {
      schema: studioSchema.getStudioMeRouteSchema,
      preHandler: [authenticate, requireStudioOwner],
    },
    studioController.getStudioMeHandler,
  );

  typedApp.put(
    "/me",
    {
      schema: studioSchema.updateStudioMeRouteSchema,
      preHandler: [authenticate, requireStudioOwner],
    },
    studioController.updateStudioMeHandler,
  );

  typedApp.post(
    "/me/publish",
    {
      schema: studioSchema.publishStudioMeRouteSchema,
      preHandler: [authenticate, requireStudioOwner],
    },
    studioController.publishStudioMeHandler,
  );

  typedApp.post(
    "/me/social-channels/:channelId/connect",
    {
      schema: studioSchema.socialChannelActionRouteSchema,
      preHandler: [authenticate, requireStudioOwner],
    },
    studioController.connectSocialChannelHandler,
  );

  typedApp.post(
    "/me/social-channels/:channelId/disconnect",
    {
      schema: studioSchema.socialChannelActionRouteSchema,
      preHandler: [authenticate, requireStudioOwner],
    },
    studioController.disconnectSocialChannelHandler,
  );

  // Public: Featured Studios / Showcase (for landing hero spotlight and marquee)
  typedApp.get(
    "/featured",
    {
      ...rateLimit(120, "1 minute"),
    },
    studioController.getFeaturedStudiosHandler,
  );

  // Public Storefront (after explicit static routes to avoid collision)
  typedApp.get(
    "/:slug",
    {
      schema: studioSchema.getStorefrontRouteSchema,
      ...rateLimit(120, "1 minute"),
    },
    studioController.getStorefrontHandler,
  );

  // Public Review Submission
  typedApp.post(
    "/:slug/reviews",
    {
      schema: studioSchema.submitReviewRouteSchema,
      ...rateLimit(10, "15 minutes"),
    },
    studioController.submitReviewHandler,
  );

  // Public Lead Inquiry from Storefront
  const { publicInquiryRouteSchema } = await import(
    "../leads/schema/lead.schema"
  );
  const { submitPublicInquiryHandler } = await import(
    "../leads/lead.controller"
  );

  typedApp.post(
    "/:slug/inquiries",
    {
      schema: publicInquiryRouteSchema,
      ...rateLimit(20, "15 minutes"),
    },
    submitPublicInquiryHandler,
  );
}
