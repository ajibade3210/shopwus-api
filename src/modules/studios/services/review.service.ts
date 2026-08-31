import { NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import type { ReviewItemDto } from "../dto/studio.dto";
import type { SubmitReviewInput } from "../schema/studio.schema";
import { invalidateStorefrontCache } from "./storefront.service";

export async function submitReviewService(
  slug: string,
  data: SubmitReviewInput,
): Promise<ReviewItemDto> {
  const normalizedSlug = slug.toLowerCase().trim();

  const business = await prisma.business.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true, slug: true },
  });

  if (!business) {
    throw new NotFoundError(`Studio '${slug}' not found`);
  }

  const review = await prisma.review.create({
    data: {
      businessId: business.id,
      author: data.author.trim(),
      role: data.role?.trim(),
      eventType: data.eventType?.trim() || "Commission",
      rating: data.rating,
      comment: data.comment.trim(),
      avatar: data.avatar,
      isApproved: true,
    },
  });

  invalidateStorefrontCache(business.slug);

  return {
    id: review.id,
    author: review.author,
    role: review.role,
    eventType: review.eventType,
    rating: review.rating,
    comment: review.comment,
    date:
      review.date ||
      review.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    avatar: review.avatar,
  };
}
