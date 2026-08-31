import { prisma } from "../../../lib/prisma";
import type { FeedbackRequestDto } from "../dto/feedback.dto";
import type { SubmitFeedbackInput } from "../schema/feedback.schema";

export async function submitFeedbackService(
  data: SubmitFeedbackInput,
  userId?: string,
  businessId?: string,
): Promise<FeedbackRequestDto> {
  const item = await prisma.feedbackRequest.create({
    data: {
      userId: userId || null,
      businessId: businessId || null,
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      status: "OPEN",
    },
  });

  return {
    id: item.id,
    userId: item.userId,
    businessId: item.businessId,
    title: item.title,
    description: item.description,
    category: item.category,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function getFeedbackListService(
  category?: string,
): Promise<FeedbackRequestDto[]> {
  const where: { category?: string } = {};
  if (category) where.category = category;

  const items = await prisma.feedbackRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return items.map((item) => ({
    id: item.id,
    userId: item.userId,
    businessId: item.businessId,
    title: item.title,
    description: item.description,
    category: item.category,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));
}
