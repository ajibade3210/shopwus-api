import type { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

export interface FeaturedStudioSeedData {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  location: string;
  logoUrl: string;
  businessType: "STUDIO" | "VENDOR";
  currency: string;
  ownerEmail: string;
  ownerName: { first: string; last: string };
  category: string;
}

export const FEATURED_STUDIOS_SEED_DATA: FeaturedStudioSeedData[] = [
  {
    slug: "elan-events",
    name: "Élan Events",
    tagline: "Luxury Event Studio · Lagos",
    description: "We design unforgettable weddings, corporate events, and private celebrations with timeless elegance.",
    location: "Victoria Island, Lagos",
    logoUrl: "https://cdn.accessa.ng/test/accessa/louis-dike-ayskyj/images/c95e52aa48bf676ed0d53f36bb957b81.png",
    businessType: "STUDIO",
    currency: "NGN",
    ownerEmail: "director@elan-events.ng",
    ownerName: { first: "Amara", last: "Eze" },
    category: "Luxury Weddings & Galas",
  },
  {
    slug: "maison-bell-events",
    name: "Maison Bell Events",
    tagline: "Haute Couture & Bridal · Paris / London",
    description: "Editorial wedding design and high-society galas across Europe's finest historical landmarks.",
    location: "Paris / London",
    logoUrl: "https://cdn.logosystem.co/logos/the-huntington.webp",
    businessType: "STUDIO",
    currency: "EUR",
    ownerEmail: "claire@maisonbellevents.com",
    ownerName: { first: "Claire", last: "Bell" },
    category: "Haute Couture",
  },
  {
    slug: "lumio-atelier",
    name: "Lumio Atelier",
    tagline: "Spatial Design & Light · Milan",
    description: "Architectural lighting, experiential banquets, and modern spatial art for corporate galas and exhibitions.",
    location: "Milan, Italy",
    logoUrl: "https://cdn.logosystem.co/logos/hatil.webp",
    businessType: "STUDIO",
    currency: "EUR",
    ownerEmail: "matteo@lumioatelier.it",
    ownerName: { first: "Matteo", last: "Rossi" },
    category: "Spatial Architecture",
  },
  {
    slug: "meridian-celebrations",
    name: "Meridian Celebrations",
    tagline: "Destination Galas · Lake Como / Amalfi",
    description: "Multi-day lakeside celebrations and private yacht receptions for discerning global clientele.",
    location: "Lake Como / Amalfi, Italy",
    logoUrl: "https://cdn.logosystem.co/logos/mila.webp",
    businessType: "STUDIO",
    currency: "EUR",
    ownerEmail: "concierge@meridiancelebrations.com",
    ownerName: { first: "Alessia", last: "Moretti" },
    category: "Destination Estate",
  },
  {
    slug: "arcwell-bespoke",
    name: "Arcwell Bespoke",
    tagline: "Private Estate Soirées · New York",
    description: "Discreet milestone celebrations, black-tie dinners, and bespoke artistic productions for private estates.",
    location: "Manhattan, New York",
    logoUrl: "https://cdn.logosystem.co/logos/fourthfloor.webp",
    businessType: "STUDIO",
    currency: "USD",
    ownerEmail: "julian@arcwellbespoke.com",
    ownerName: { first: "Julian", last: "Vance" },
    category: "White-Glove Concierge",
  },
  {
    slug: "solace-studios",
    name: "Solace Studios",
    tagline: "Ultra-Luxury Gala Productions · Dubai",
    description: "Iconic corporate galas and royal wedding productions curated with quiet elegance and cutting-edge stagecraft.",
    location: "Downtown, Dubai",
    logoUrl: "https://cdn.logosystem.co/logos/renforce.webp",
    businessType: "STUDIO",
    currency: "USD",
    ownerEmail: "tariq@solacestudios.ae",
    ownerName: { first: "Tariq", last: "Al-Mansoor" },
    category: "Grand Productions",
  },
];

export async function seedFeaturedStudios(prisma: PrismaClient): Promise<void> {
  console.info("🌟 Seeding Featured Showcase Studios...");

  const defaultPasswordHash = await argon2.hash("Password123!");

  for (const studio of FEATURED_STUDIOS_SEED_DATA) {
    // 1. Create or update the owner user
    const owner = await prisma.user.upsert({
      where: { email: studio.ownerEmail },
      update: {
        firstName: studio.ownerName.first,
        lastName: studio.ownerName.last,
        role: "OWNER",
        isActive: true,
      },
      create: {
        email: studio.ownerEmail,
        passwordHash: defaultPasswordHash,
        firstName: studio.ownerName.first,
        lastName: studio.ownerName.last,
        role: "OWNER",
        isActive: true,
      },
    });

    // 2. Create or update the business record
    const business = await prisma.business.upsert({
      where: { slug: studio.slug },
      update: {
        name: studio.name,
        tagline: studio.tagline,
        description: studio.description,
        location: studio.location,
        logoUrl: studio.logoUrl,
        businessType: studio.businessType,
        currency: studio.currency,
        isPublished: true,
      },
      create: {
        slug: studio.slug,
        name: studio.name,
        tagline: studio.tagline,
        description: studio.description,
        location: studio.location,
        logoUrl: studio.logoUrl,
        businessType: studio.businessType,
        currency: studio.currency,
        isPublished: true,
        colors: {
          primary: "#000000",
          secondary: "#0058BE",
          button: "#000000",
          pageBackground: "#faf8f5",
          cardBackground: "#faf6f0",
          text: "#191C1D",
        },
      },
    });

    // 3. Link User to Business via BusinessUser
    await prisma.businessUser.upsert({
      where: {
        businessId_userId: {
          businessId: business.id,
          userId: owner.id,
        },
      },
      update: {
        role: "OWNER",
      },
      create: {
        businessId: business.id,
        userId: owner.id,
        role: "OWNER",
      },
    });

    // 4. Seed a flagship Service
    await prisma.service.upsert({
      where: {
        id_businessId: {
          id: `svc-${studio.slug}-flagship`,
          businessId: business.id,
        },
      },
      update: {
        name: `${studio.name} Signature Experience`,
        category: studio.category,
        description: studio.description,
        price: 250000,
        isFeatured: true,
      },
      create: {
        id: `svc-${studio.slug}-flagship`,
        businessId: business.id,
        name: `${studio.name} Signature Experience`,
        category: studio.category,
        description: studio.description,
        price: 250000,
        isFeatured: true,
      },
    });
  }

  console.info(`✅ Seeded ${FEATURED_STUDIOS_SEED_DATA.length} featured showcase studios.`);
}
