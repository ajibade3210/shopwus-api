import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  CheckSlugQuery,
  GetStorefrontParams,
  SocialChannelParams,
  SubmitReviewInput,
  UpdateStudioProfileInput,
} from "./schema/studio.schema";
import { submitReviewService } from "./services/review.service";
import {
  getFeaturedStudiosService,
  getStorefrontBySlug,
} from "./services/storefront.service";
import {
  checkSlugAvailabilityService,
  getStudioMeService,
  publishStudioMeService,
  setSocialChannelConnectionService,
  updateStudioMeService,
} from "./services/studio-admin.service";

export async function checkSlugHandler(
  request: FastifyRequest<{ Querystring: CheckSlugQuery }>,
  reply: FastifyReply,
) {
  const { slug } = request.query;
  const result = await checkSlugAvailabilityService(
    slug,
    request.user?.businessId,
  );
  return reply.success(result, "Slug availability checked");
}

export async function getFeaturedStudiosHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await getFeaturedStudiosService();
  return reply.success(result, "Featured studios retrieved successfully");
}

export async function getStorefrontHandler(
  request: FastifyRequest<{ Params: GetStorefrontParams }>,
  reply: FastifyReply,
) {
  const { slug } = request.params;
  const storefront = await getStorefrontBySlug(slug);
  return reply.success(storefront, "Studio storefront retrieved");
}

export async function submitReviewHandler(
  request: FastifyRequest<{
    Params: GetStorefrontParams;
    Body: SubmitReviewInput;
  }>,
  reply: FastifyReply,
) {
  const { slug } = request.params;
  const review = await submitReviewService(slug, request.body);
  return reply.success(review, "Review submitted successfully", 201);
}

export async function getStudioMeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.userId;
  const businessId = request.user.businessId;
  const profile = await getStudioMeService(userId, businessId);
  return reply.success(profile, "Studio profile retrieved");
}

export async function updateStudioMeHandler(
  request: FastifyRequest<{ Body: UpdateStudioProfileInput }>,
  reply: FastifyReply,
) {
  const userId = request.user.userId;
  const businessId = request.user.businessId;
  const updated = await updateStudioMeService(userId, request.body, businessId);
  return reply.success(updated, "Studio profile updated successfully");
}

export async function publishStudioMeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.userId;
  const businessId = request.user.businessId;
  const published = await publishStudioMeService(userId, businessId);
  return reply.success(published, "Studio published successfully");
}

export async function connectSocialChannelHandler(
  request: FastifyRequest<{ Params: SocialChannelParams }>,
  reply: FastifyReply,
) {
  const userId = request.user.userId;
  const businessId = request.user.businessId;
  const { channelId } = request.params;
  const result = await setSocialChannelConnectionService(
    userId,
    channelId,
    true,
    businessId,
  );
  return reply.success(result, "Social channel connected");
}

export async function disconnectSocialChannelHandler(
  request: FastifyRequest<{ Params: SocialChannelParams }>,
  reply: FastifyReply,
) {
  const userId = request.user.userId;
  const businessId = request.user.businessId;
  const { channelId } = request.params;
  const result = await setSocialChannelConnectionService(
    userId,
    channelId,
    false,
    businessId,
  );
  return reply.success(result, "Social channel disconnected");
}
