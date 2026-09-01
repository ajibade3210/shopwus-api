import type { Prisma } from "@prisma/client";
import { isReservedSlug } from "../../../config/constants/reserved-slugs";
import { NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { slugify } from "../../../utils";
import type { UpdateStudioProfileInput } from "../schema/studio.schema";
import {
  getStorefrontBySlug,
  invalidateStorefrontCache,
} from "./storefront.service";

export async function checkSlugAvailabilityService(
  rawSlug: string,
  excludeBusinessId?: string,
): Promise<{ available: boolean; slug: string }> {
  const normalized = slugify(rawSlug);

  if (normalized.length < 3 || isReservedSlug(normalized)) {
    return { available: false, slug: normalized };
  }

  const existing = await prisma.business.findUnique({
    where: { slug: normalized },
    select: { id: true },
  });

  if (!existing || (excludeBusinessId && existing.id === excludeBusinessId)) {
    return { available: true, slug: normalized };
  }

  return { available: false, slug: normalized };
}

async function resolveDirectorBusiness(userId: string, businessId?: string) {
  if (businessId) {
    const businessUser = await prisma.businessUser.findFirst({
      where: { businessId, userId },
      include: { business: true },
    });
    if (businessUser) return businessUser.business;
  }

  const primaryBusinessUser = await prisma.businessUser.findFirst({
    where: { userId },
    include: { business: true },
  });

  if (!primaryBusinessUser) {
    throw new NotFoundError("No studio associated with this director account");
  }

  return primaryBusinessUser.business;
}

export async function getStudioMeService(userId: string, businessId?: string) {
  const business = await resolveDirectorBusiness(userId, businessId);
  return getStorefrontBySlug(business.slug);
}

export async function updateStudioMeService(
  userId: string,
  input: UpdateStudioProfileInput,
  businessId?: string,
) {
  const business = await resolveDirectorBusiness(userId, businessId);

  const dataToUpdate: Prisma.BusinessUpdateInput = {};

  if (input.name !== undefined || input.businessName !== undefined) {
    dataToUpdate.name = (input.name || input.businessName)?.trim();
  }
  if (input.tagline !== undefined) dataToUpdate.tagline = input.tagline?.trim();
  if (input.description !== undefined)
    dataToUpdate.description = input.description?.trim();
  if (input.location !== undefined)
    dataToUpdate.location = input.location?.trim();
  if (input.website !== undefined) dataToUpdate.website = input.website?.trim();
  if (input.email !== undefined || input.emailAddress !== undefined) {
    dataToUpdate.email = (input.email || input.emailAddress)?.trim();
  }
  if (input.phone !== undefined) dataToUpdate.phone = input.phone?.trim();
  if (input.whatsAppNumber !== undefined)
    dataToUpdate.whatsAppNumber = input.whatsAppNumber?.trim();
  if (input.logoUrl !== undefined) dataToUpdate.logoUrl = input.logoUrl?.trim();
  if (input.businessType !== undefined)
    dataToUpdate.businessType = input.businessType?.trim();
  if (input.currency !== undefined)
    dataToUpdate.currency = input.currency?.trim();
  if (input.operatingHours !== undefined)
    dataToUpdate.operatingHours = input.operatingHours?.trim();
  if (input.timeFrom !== undefined)
    dataToUpdate.timeFrom = input.timeFrom?.trim();
  if (input.timeTo !== undefined) dataToUpdate.timeTo = input.timeTo?.trim();
  if (
    input.byAppointmentOnly !== undefined &&
    input.byAppointmentOnly !== null
  ) {
    dataToUpdate.byAppointmentOnly = input.byAppointmentOnly;
  }
  if (input.colors !== undefined && input.colors !== null) {
    dataToUpdate.colors = input.colors;
  }
  if (input.buttonRadius !== undefined)
    dataToUpdate.buttonRadius = input.buttonRadius?.trim();
  if (input.showServices !== undefined && input.showServices !== null) {
    dataToUpdate.showServices = input.showServices;
  }
  if (input.showPortfolio !== undefined && input.showPortfolio !== null) {
    dataToUpdate.showPortfolio = input.showPortfolio;
  }
  if (input.showReviews !== undefined && input.showReviews !== null) {
    dataToUpdate.showReviews = input.showReviews;
  }
  if (input.showFooterCta !== undefined && input.showFooterCta !== null) {
    dataToUpdate.showFooterCta = input.showFooterCta;
  }
  if (input.footerEyebrow !== undefined)
    dataToUpdate.footerEyebrow = input.footerEyebrow?.trim();
  if (input.footerTitle !== undefined)
    dataToUpdate.footerTitle = input.footerTitle?.trim();
  if (input.footerDescription !== undefined)
    dataToUpdate.footerDescription = input.footerDescription?.trim();
  if (input.googleReviewsLink !== undefined)
    dataToUpdate.googleReviewsLink = input.googleReviewsLink?.trim();
  if (
    input.portfolioCategories !== undefined &&
    input.portfolioCategories !== null
  )
    dataToUpdate.portfolioCategories = input.portfolioCategories;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(dataToUpdate).length > 0) {
      await tx.business.update({
        where: { id: business.id },
        data: dataToUpdate,
      });
    }

    // Sync services if provided
    if (input.services) {
      await tx.service.deleteMany({
        where: { businessId: business.id },
      });

      const validServices = input.services
        .filter((s) => s.name && s.name.trim().length > 0)
        .map((s) => ({
          businessId: business.id,
          name: s.name.trim(),
          category: s.category?.trim() || null,
          description: s.description?.trim() || null,
          price: s.price !== undefined && s.price !== null ? s.price : null,
          minPrice:
            s.minPrice !== undefined && s.minPrice !== null ? s.minPrice : null,
          maxPrice:
            s.maxPrice !== undefined && s.maxPrice !== null ? s.maxPrice : null,
          priceType: s.priceType || (s.maxPrice ? "range" : "fixed"),
          isFeatured: s.isFeatured ?? false,
        }));

      if (validServices.length > 0) {
        await tx.service.createMany({
          data: validServices,
        });
      }
    }

    // Sync portfolio if provided
    if (input.portfolio) {
      await tx.portfolioProject.deleteMany({
        where: { businessId: business.id },
      });

      const validProjects = input.portfolio
        .filter((p) => p.title && p.title.trim().length > 0)
        .map((p, idx) => ({
          businessId: business.id,
          title: p.title.trim(),
          category: p.category?.trim() || null,
          location: p.location?.trim() || null,
          description: p.description?.trim() || null,
          image: p.image?.trim() || null,
          order: p.order ?? idx,
          isCover: p.isCover ?? idx === 0,
          gallery: Array.isArray(p.gallery) ? p.gallery : [],
          stats: p.stats?.trim() || null,
          client: p.client?.trim() || null,
          year: p.year?.trim() || null,
        }));

      if (validProjects.length > 0) {
        await tx.portfolioProject.createMany({
          data: validProjects,
        });
      }
    }

    // Sync social channels if provided
    if (input.socialChannels) {
      await tx.socialChannel.deleteMany({
        where: { businessId: business.id },
      });

      const validChannels = input.socialChannels
        .filter((c) => c.type && c.type.trim().length > 0)
        .map((c) => ({
          businessId: business.id,
          type: c.type.trim(),
          connected: c.connected ?? false,
          label: c.label?.trim() || null,
          handle: c.handle?.trim() || null,
          url: c.url?.trim() || null,
          description: c.description?.trim() || null,
        }));

      if (validChannels.length > 0) {
        await tx.socialChannel.createMany({
          data: validChannels,
        });
      }
    }
  });

  invalidateStorefrontCache(business.slug);

  return getStorefrontBySlug(business.slug);
}

export async function publishStudioMeService(
  userId: string,
  businessId?: string,
) {
  const business = await resolveDirectorBusiness(userId, businessId);

  const updated = await prisma.business.update({
    where: { id: business.id },
    data: { isPublished: true },
  });

  invalidateStorefrontCache(business.slug);

  return {
    isPublished: updated.isPublished,
    publishedAt: updated.updatedAt.toISOString(),
  };
}

export async function setSocialChannelConnectionService(
  userId: string,
  channelId: string,
  connected: boolean,
  businessId?: string,
) {
  const business = await resolveDirectorBusiness(userId, businessId);

  const channel = await prisma.socialChannel.findFirst({
    where: { id: channelId, businessId: business.id },
  });

  if (!channel) {
    throw new NotFoundError("Social channel not found");
  }

  const updated = await prisma.socialChannel.update({
    where: { id: channel.id },
    data: {
      connected,
      lastSynced: connected ? new Date() : null,
    },
  });

  invalidateStorefrontCache(business.slug);

  return {
    id: updated.id,
    type: updated.type,
    connected: updated.connected,
    label: updated.label,
    handle: updated.handle,
    url: updated.url,
    lastSynced: updated.lastSynced ? updated.lastSynced.toISOString() : null,
  };
}
