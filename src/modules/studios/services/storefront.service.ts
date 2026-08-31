import { NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { cacheStore } from "../../../utils";
import type {
  OrganizationPreviewDto,
  StudioStorefrontResponseDto,
} from "../dto/studio.dto";

const DEFAULT_COLORS = {
  primary: "#000000",
  secondary: "#0058BE",
  button: "#000000",
  pageBackground: "#faf8f5",
  cardBackground: "#faf6f0",
  text: "#191C1D",
};

export async function getStorefrontBySlug(
  slug: string,
): Promise<StudioStorefrontResponseDto> {
  const normalizedSlug = slug.toLowerCase().trim();
  const cacheKey = `storefront:${normalizedSlug}`;

  const cached = cacheStore.get<StudioStorefrontResponseDto>(cacheKey);
  if (cached) {
    return cached;
  }

  const business = await prisma.business.findUnique({
    where: { slug: normalizedSlug },
    include: {
      services: {
        orderBy: { createdAt: "asc" },
      },
      portfolioProjects: {
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      },
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: "desc" },
      },
      socialChannels: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!business) {
    throw new NotFoundError(`Studio '${slug}' not found`);
  }

  const colors =
    business.colors && typeof business.colors === "object"
      ? (business.colors as unknown as typeof DEFAULT_COLORS)
      : DEFAULT_COLORS;

  const result: StudioStorefrontResponseDto = {
    id: business.id,
    slug: business.slug,
    businessName: business.name,
    tagline: business.tagline,
    description: business.description,
    location: business.location,
    website: business.website,
    email: business.email,
    phone: business.phone,
    whatsAppNumber: business.whatsAppNumber,
    logoUrl: business.logoUrl,
    businessType: business.businessType,
    currency: business.currency,
    colors,
    buttonRadius: business.buttonRadius,
    operatingHours: business.operatingHours,
    timeFrom: business.timeFrom,
    timeTo: business.timeTo,
    byAppointmentOnly: business.byAppointmentOnly,
    isPublished: business.isPublished,
    services: business.services.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      price: s.price ? Number(s.price) : null,
      isFeatured: s.isFeatured,
    })),
    portfolio: business.portfolioProjects.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      location: p.location,
      description: p.description,
      image: p.image,
      order: p.order,
      isCover: p.isCover,
      gallery: p.gallery,
      stats: p.stats,
      client: p.client,
      year: p.year,
    })),
    reviews: business.reviews.map((r) => ({
      id: r.id,
      author: r.author,
      role: r.role,
      eventType: r.eventType,
      rating: r.rating,
      comment: r.comment,
      date:
        r.date ||
        r.createdAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      avatar: r.avatar,
    })),
    socialChannels: business.socialChannels.map((c) => ({
      id: c.id,
      type: c.type,
      connected: c.connected,
      label: c.label,
      handle: c.handle,
      url: c.url,
      description: c.description,
      lastSynced: c.lastSynced ? c.lastSynced.toISOString() : null,
    })),
    updatedAt: business.updatedAt.toISOString(),
  };

  // Cache storefront for 5 minutes
  cacheStore.set(cacheKey, result, 300_000);

  return result;
}

export function invalidateStorefrontCache(slug: string): void {
  cacheStore.delete(`storefront:${slug.toLowerCase().trim()}`);
}

export async function getFeaturedStudiosService(): Promise<OrganizationPreviewDto[]> {
  const businesses = await prisma.business.findMany({
    where: { isPublished: true },
    take: 12,
    orderBy: { updatedAt: "desc" },
  });

  return businesses.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    eyebrow: b.location
      ? `${b.tagline ? `${b.tagline.split("·")[0]?.trim() || b.name} · ` : ""}${b.location}`
      : "Luxury Studio",
    tagline: b.tagline || b.description || "Bespoke digital atelier & luxury studio showcase.",
    logoUrl:
      b.logoUrl ||
      "https://cdn.accessa.ng/test/accessa/louis-dike-ayskyj/images/c95e52aa48bf676ed0d53f36bb957b81.png",
    badge: b.businessType === "STUDIO" ? "Bespoke Experiences" : "Haute Couture",
  }));
}


