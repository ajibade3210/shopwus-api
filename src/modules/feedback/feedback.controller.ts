import type { FastifyReply, FastifyRequest } from "fastify";
import type { SubmitFeedbackInput } from "./schema/feedback.schema";
import {
  getFeedbackListService,
  submitFeedbackService,
} from "./services/feedback.service";

export async function submitFeedbackHandler(
  request: FastifyRequest<{ Body: SubmitFeedbackInput }>,
  reply: FastifyReply,
) {
  const userId = request.user?.userId;
  const businessId = request.user?.businessId;
  const result = await submitFeedbackService(request.body, userId, businessId);
  return reply.success(result, "Feedback submitted successfully", 201);
}

export async function getFeedbackListHandler(
  request: FastifyRequest<{ Querystring: { category?: string } }>,
  reply: FastifyReply,
) {
  const result = await getFeedbackListService(request.query.category);
  return reply.success(result, "Feedback list retrieved");
}
