import { type Business, Prisma } from "@prisma/client";
import dotenv from "dotenv";
import { basePrisma as prisma } from "../../src/lib/prisma";

dotenv.config();

export async function seedProductsForEmail(targetEmail: string) {
  console.info(`\n👜 Seeding Designer Bag Catalog for: ${targetEmail}`);

  // 1. Lookup user by email
  const user = await prisma.user.findUnique({
    where: { email: targetEmail.toLowerCase().trim() },
    include: {
      businessUsers: {
        include: { business: true },
      },
    },
  });

  if (!user) {
    throw new Error(
      `❌ User with email "${targetEmail}" not found in database. Please register/create the user first.`,
    );
  }

  let business: Business | null = user.businessUsers[0]?.business ?? null;

  if (!business) {
    // If user has no business linked, check if a business exists with this email or create one
    business = await prisma.business.findFirst({
      where: { email: targetEmail },
    });

    if (!business) {
      console.info("Creating default luxury boutique business for user...");
      business = await prisma.business.create({
        data: {
          slug: `maison-${user.firstName.toLowerCase()}-${Date.now().toString().slice(-4)}`,
          name: `${user.firstName}'s Leather Atelier`,
          tagline: "Bespoke Handcrafted Leather Goods & Designer Bags",
          businessType: "sales",
          currency: "NGN",
          email: targetEmail,
          isPublished: true,
        },
      });

      await prisma.businessUser.create({
        data: {
          businessId: business.id,
          userId: user.id,
          role: "OWNER",
        },
      });
    }
  }

  console.info(
    `💼 Target Business: "${business.name}" (ID: ${business.id}, Slug: ${business.slug})`,
  );

  // 2. Seed Categories
  const catTotes = await prisma.category.upsert({
    where: {
      businessId_slug: { businessId: business.id, slug: "luxury-totes" },
    },
    update: {
      name: "Luxury Totes & Day Bags",
      imageUrl:
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80",
    },
    create: {
      businessId: business.id,
      name: "Luxury Totes & Day Bags",
      slug: "luxury-totes",
      description:
        "Structured work and weekend totes built from full-grain calfskin.",
      imageUrl:
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80",
    },
  });

  const catShoulder = await prisma.category.upsert({
    where: {
      businessId_slug: { businessId: business.id, slug: "shoulder-crossbody" },
    },
    update: {
      name: "Shoulder & Crossbody Bags",
      imageUrl:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
    },
    create: {
      businessId: business.id,
      name: "Shoulder & Crossbody Bags",
      slug: "shoulder-crossbody",
      description:
        "Timeless silhouettes designed for seamless day-to-evening transitions.",
      imageUrl:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
    },
  });

  const catLimited = await prisma.category.upsert({
    where: {
      businessId_slug: { businessId: business.id, slug: "limited-editions" },
    },
    update: {
      name: "Artisanal & Limited Editions",
      imageUrl:
        "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
    },
    create: {
      businessId: business.id,
      name: "Artisanal & Limited Editions",
      slug: "limited-editions",
      description:
        "Numbered collector pieces hand-woven and crafted in limited series.",
      imageUrl:
        "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
    },
  });

  // ---------------------------------------------------------------------------
  // 3. SEED 4 DESIGNER BAG PRODUCTS
  // ---------------------------------------------------------------------------

  // Product 1: MULTI-SKU VARIANT PRODUCT (Satchel with 6 variants)
  const variantOptions = [
    { name: "Color", values: ["Onyx Black", "Cognac Tan", "Emerald Forest"] },
    { name: "Size", values: ["Medium (28cm)", "Grand (35cm)"] },
  ];

  const variantList = [
    {
      title: "Onyx Black / Medium (28cm)",
      sku: "SAT-ONX-MED",
      price: new Prisma.Decimal(185000),
      compareAtPrice: new Prisma.Decimal(210000),
      inventoryCount: 8,
      options: { Color: "Onyx Black", Size: "Medium (28cm)" },
      imageUrl:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Onyx Black / Grand (35cm)",
      sku: "SAT-ONX-GRD",
      price: new Prisma.Decimal(225000),
      compareAtPrice: new Prisma.Decimal(250000),
      inventoryCount: 5,
      options: { Color: "Onyx Black", Size: "Grand (35cm)" },
      imageUrl:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Cognac Tan / Medium (28cm)",
      sku: "SAT-COG-MED",
      price: new Prisma.Decimal(185000),
      compareAtPrice: new Prisma.Decimal(210000),
      inventoryCount: 6,
      options: { Color: "Cognac Tan", Size: "Medium (28cm)" },
      imageUrl:
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Cognac Tan / Grand (35cm)",
      sku: "SAT-COG-GRD",
      price: new Prisma.Decimal(225000),
      compareAtPrice: new Prisma.Decimal(250000),
      inventoryCount: 4,
      options: { Color: "Cognac Tan", Size: "Grand (35cm)" },
      imageUrl:
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Emerald Forest / Medium (28cm)",
      sku: "SAT-EMR-MED",
      price: new Prisma.Decimal(195000),
      compareAtPrice: new Prisma.Decimal(220000),
      inventoryCount: 3,
      options: { Color: "Emerald Forest", Size: "Medium (28cm)" },
      imageUrl:
        "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Emerald Forest / Grand (35cm)",
      sku: "SAT-EMR-GRD",
      price: new Prisma.Decimal(235000),
      compareAtPrice: new Prisma.Decimal(260000),
      inventoryCount: 2,
      options: { Color: "Emerald Forest", Size: "Grand (35cm)" },
      imageUrl:
        "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const totalVariantStock = variantList.reduce(
    (sum, v) => sum + v.inventoryCount,
    0,
  );

  // Upsert Product 1
  const existingProd1 = await prisma.product.findUnique({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "the-saffiano-heritage-satchel",
      },
    },
    include: { variants: true },
  });

  if (existingProd1) {
    await prisma.productVariant.deleteMany({
      where: { productId: existingProd1.id },
    });
    await prisma.product.update({
      where: { id: existingProd1.id },
      data: {
        name: "The Saffiano Heritage Satchel",
        categoryId: catShoulder.id,
        description:
          "Crafted from premium Italian Saffiano calfskin with polished 24k gold-plated hardware. Features an accordion interior, detachable crossbody strap, and hand-burnished edges.",
        sku: "SAT-HRTG-01",
        price: new Prisma.Decimal(185000),
        compareAtPrice: new Prisma.Decimal(210000),
        hasVariants: true,
        options: variantOptions,
        inventoryCount: totalVariantStock,
        trackInventory: true,
        isFeatured: true,
        images: [
          "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
        ],
        variants: {
          create: variantList,
        },
      },
    });
  } else {
    await prisma.product.create({
      data: {
        businessId: business.id,
        name: "The Saffiano Heritage Satchel",
        slug: "the-saffiano-heritage-satchel",
        categoryId: catShoulder.id,
        description:
          "Crafted from premium Italian Saffiano calfskin with polished 24k gold-plated hardware. Features an accordion interior, detachable crossbody strap, and hand-burnished edges.",
        sku: "SAT-HRTG-01",
        price: new Prisma.Decimal(185000),
        compareAtPrice: new Prisma.Decimal(210000),
        hasVariants: true,
        options: variantOptions,
        inventoryCount: totalVariantStock,
        trackInventory: true,
        isFeatured: true,
        images: [
          "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
        ],
        variants: {
          create: variantList,
        },
      },
    });
  }

  // Product 2: NORMAL PRODUCT (Minimalist Structured Day Tote)
  await prisma.product.upsert({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "minimalist-structured-day-tote",
      },
    },
    update: {
      name: "Minimalist Structured Day Tote",
      categoryId: catTotes.id,
      description:
        "An architecturally refined daily tote tailored for modern work and travel. Comfortably fits a 16-inch laptop, tablet, and essentials with reinforced base studs and magnetic bridge closure.",
      sku: "TOTE-STR-01",
      price: new Prisma.Decimal(125000),
      compareAtPrice: new Prisma.Decimal(145000),
      inventoryCount: 15,
      trackInventory: true,
      hasVariants: false,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
      ],
    },
    create: {
      businessId: business.id,
      name: "Minimalist Structured Day Tote",
      slug: "minimalist-structured-day-tote",
      categoryId: catTotes.id,
      description:
        "An architecturally refined daily tote tailored for modern work and travel. Comfortably fits a 16-inch laptop, tablet, and essentials with reinforced base studs and magnetic bridge closure.",
      sku: "TOTE-STR-01",
      price: new Prisma.Decimal(125000),
      compareAtPrice: new Prisma.Decimal(145000),
      inventoryCount: 15,
      trackInventory: true,
      hasVariants: false,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
      ],
    },
  });

  // Product 3: NORMAL PRODUCT (Croc-Embossed Baguette Shoulder Bag)
  await prisma.product.upsert({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "croc-embossed-baguette-shoulder-bag",
      },
    },
    update: {
      name: "Croc-Embossed Baguette Shoulder Bag",
      categoryId: catShoulder.id,
      description:
        "Nineties archival silhouette rendered in high-gloss embossed leather. Sculpted to sit snugly under the arm with custom geometric buckle hardware and internal zip pocket.",
      sku: "BAG-CROC-01",
      price: new Prisma.Decimal(85000),
      compareAtPrice: new Prisma.Decimal(105000),
      inventoryCount: 12,
      trackInventory: true,
      hasVariants: false,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=800&q=80",
      ],
    },
    create: {
      businessId: business.id,
      name: "Croc-Embossed Baguette Shoulder Bag",
      slug: "croc-embossed-baguette-shoulder-bag",
      categoryId: catShoulder.id,
      description:
        "Nineties archival silhouette rendered in high-gloss embossed leather. Sculpted to sit snugly under the arm with custom geometric buckle hardware and internal zip pocket.",
      sku: "BAG-CROC-01",
      price: new Prisma.Decimal(85000),
      compareAtPrice: new Prisma.Decimal(105000),
      inventoryCount: 12,
      trackInventory: true,
      hasVariants: false,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=800&q=80",
      ],
    },
  });

  // Product 4: UNIQUE HIGH-END ARTISANAL PIECE (Numbered Limited Series)
  await prisma.product.upsert({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "limited-edition-sculptural-bucket-bag",
      },
    },
    update: {
      name: "Limited Edition Hand-Woven Sculptural Bucket Bag (Numbered Series)",
      categoryId: catLimited.id,
      description:
        "Piece No. 07 of an exclusive 20-piece atelier capsule. Individually hand-woven by master leather artisans over 48 hours. Features a solid turned ebony wood top handle, brushed brass hardware, and silk-lined interior with an engraved brass certificate plate.",
      sku: "CAPSULE-WVN-07",
      price: new Prisma.Decimal(380000),
      compareAtPrice: null,
      inventoryCount: 4,
      lowStockThreshold: 2,
      trackInventory: true,
      hasVariants: false,
      isFeatured: true,
      images: [
        "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
      ],
    },
    create: {
      businessId: business.id,
      name: "Limited Edition Hand-Woven Sculptural Bucket Bag (Numbered Series)",
      slug: "limited-edition-sculptural-bucket-bag",
      categoryId: catLimited.id,
      description:
        "Piece No. 07 of an exclusive 20-piece atelier capsule. Individually hand-woven by master leather artisans over 48 hours. Features a solid turned ebony wood top handle, brushed brass hardware, and silk-lined interior with an engraved brass certificate plate.",
      sku: "CAPSULE-WVN-07",
      price: new Prisma.Decimal(380000),
      compareAtPrice: null,
      inventoryCount: 4,
      lowStockThreshold: 2,
      trackInventory: true,
      hasVariants: false,
      isFeatured: true,
      images: [
        "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
      ],
    },
  });

  console.info(
    `✅ Successfully seeded 4 designer bag products for "${business.name}"!\n`,
  );
  console.info("📦 Seeded Products Summary:");
  console.info(
    "  1. The Saffiano Heritage Satchel (Multi-SKU: 6 Variants, ₦185k - ₦235k)",
  );
  console.info("  2. Minimalist Structured Day Tote (Standard: ₦125k)");
  console.info(
    "  3. Croc-Embossed Baguette Shoulder Bag (Standard: ₦85k, Sale)",
  );
  console.info(
    "  4. Limited Edition Hand-Woven Sculptural Bucket Bag (Unique/Capsule: ₦380k)",
  );
}

// CLI Execution Support: npx ts-node prisma/seeds/seedProducts.ts user@example.com
async function run() {
  const targetEmail =
    process.argv[2] || process.env.EMAIL || "elena@atelierforma.design";
  try {
    await seedProductsForEmail(targetEmail);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Seeder Error:", msg);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run();
}
