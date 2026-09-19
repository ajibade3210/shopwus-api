import {
  type Business,
  DeliveryType,
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import dotenv from "dotenv";
import { basePrisma as prisma } from "../../src/lib/prisma";

dotenv.config();

export async function seedProductsForEmail(targetEmail: string) {
  console.info(
    `\n👜 Seeding Designer Catalog, Variants & Orders for: ${targetEmail}`,
  );

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
  // 3. SEED PRODUCTS WITH EXPANDED VARIANT TYPES
  // Variant Types Introduced:
  //   1. Color
  //   2. Size
  //   3. Hardware Finish (e.g. 24k Polished Gold, Brushed Palladium)
  //   4. Material Finish (e.g. Smooth Italian Calfskin, Pebble Grained Leather)
  //   5. Strap Style (e.g. Gold Curb Chain, Woven Jacquard Strap, Tonal Leather)
  // ---------------------------------------------------------------------------

  // Product 1: The Saffiano Heritage Satchel (Options: Color, Size, Hardware Finish)
  const satchelOptions = [
    { name: "Color", values: ["Onyx Black", "Cognac Tan", "Emerald Forest"] },
    { name: "Size", values: ["Medium (28cm)", "Grand (35cm)"] },
    {
      name: "Hardware Finish",
      values: ["24k Polished Gold", "Brushed Palladium"],
    },
  ];

  const satchelVariants = [
    {
      title: "Onyx Black / Medium (28cm) / 24k Polished Gold",
      sku: "SAT-ONX-MED-GLD",
      price: new Prisma.Decimal(185000),
      compareAtPrice: new Prisma.Decimal(210000),
      inventoryCount: 8,
      options: {
        Color: "Onyx Black",
        Size: "Medium (28cm)",
        "Hardware Finish": "24k Polished Gold",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Onyx Black / Medium (28cm) / Brushed Palladium",
      sku: "SAT-ONX-MED-PAL",
      price: new Prisma.Decimal(185000),
      compareAtPrice: new Prisma.Decimal(210000),
      inventoryCount: 6,
      options: {
        Color: "Onyx Black",
        Size: "Medium (28cm)",
        "Hardware Finish": "Brushed Palladium",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Onyx Black / Grand (35cm) / 24k Polished Gold",
      sku: "SAT-ONX-GRD-GLD",
      price: new Prisma.Decimal(225000),
      compareAtPrice: new Prisma.Decimal(250000),
      inventoryCount: 5,
      options: {
        Color: "Onyx Black",
        Size: "Grand (35cm)",
        "Hardware Finish": "24k Polished Gold",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Cognac Tan / Medium (28cm) / 24k Polished Gold",
      sku: "SAT-COG-MED-GLD",
      price: new Prisma.Decimal(185000),
      compareAtPrice: new Prisma.Decimal(210000),
      inventoryCount: 7,
      options: {
        Color: "Cognac Tan",
        Size: "Medium (28cm)",
        "Hardware Finish": "24k Polished Gold",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Cognac Tan / Grand (35cm) / 24k Polished Gold",
      sku: "SAT-COG-GRD-GLD",
      price: new Prisma.Decimal(225000),
      compareAtPrice: new Prisma.Decimal(250000),
      inventoryCount: 4,
      options: {
        Color: "Cognac Tan",
        Size: "Grand (35cm)",
        "Hardware Finish": "24k Polished Gold",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Emerald Forest / Medium (28cm) / 24k Polished Gold",
      sku: "SAT-EMR-MED-GLD",
      price: new Prisma.Decimal(195000),
      compareAtPrice: new Prisma.Decimal(220000),
      inventoryCount: 3,
      options: {
        Color: "Emerald Forest",
        Size: "Medium (28cm)",
        "Hardware Finish": "24k Polished Gold",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Emerald Forest / Grand (35cm) / Brushed Palladium",
      sku: "SAT-EMR-GRD-PAL",
      price: new Prisma.Decimal(235000),
      compareAtPrice: new Prisma.Decimal(260000),
      inventoryCount: 2,
      options: {
        Color: "Emerald Forest",
        Size: "Grand (35cm)",
        "Hardware Finish": "Brushed Palladium",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const satchelStock = satchelVariants.reduce(
    (sum, v) => sum + v.inventoryCount,
    0,
  );

  const existingProd1 = await prisma.product.findUnique({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "the-saffiano-heritage-satchel",
      },
    },
  });
  if (existingProd1) {
    await prisma.productVariant.deleteMany({
      where: { productId: existingProd1.id },
    });
  }

  const prod1 = await prisma.product.upsert({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "the-saffiano-heritage-satchel",
      },
    },
    update: {
      name: "The Saffiano Heritage Satchel",
      categoryId: catShoulder.id,
      description:
        "Crafted from premium Italian Saffiano calfskin with polished 24k gold-plated or palladium hardware. Features an accordion interior, detachable crossbody strap, and hand-burnished edges.",
      sku: "SAT-HRTG-01",
      price: new Prisma.Decimal(185000),
      compareAtPrice: new Prisma.Decimal(210000),
      hasVariants: true,
      options: satchelOptions,
      inventoryCount: satchelStock,
      trackInventory: true,
      isFeatured: true,
      images: [
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
      ],
      variants: { create: satchelVariants },
    },
    create: {
      businessId: business.id,
      name: "The Saffiano Heritage Satchel",
      slug: "the-saffiano-heritage-satchel",
      categoryId: catShoulder.id,
      description:
        "Crafted from premium Italian Saffiano calfskin with polished 24k gold-plated or palladium hardware. Features an accordion interior, detachable crossbody strap, and hand-burnished edges.",
      sku: "SAT-HRTG-01",
      price: new Prisma.Decimal(185000),
      compareAtPrice: new Prisma.Decimal(210000),
      hasVariants: true,
      options: satchelOptions,
      inventoryCount: satchelStock,
      trackInventory: true,
      isFeatured: true,
      images: [
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
      ],
      variants: { create: satchelVariants },
    },
    include: { variants: true },
  });

  // Product 2: Minimalist Structured Day Tote (Options: Material Finish, Size)
  const toteOptions = [
    {
      name: "Material Finish",
      values: ["Smooth Italian Calfskin", "Pebble Grained Leather"],
    },
    { name: "Size", values: ["Standard (14-inch)", "Executive (16-inch)"] },
  ];

  const toteVariants = [
    {
      title: "Smooth Italian Calfskin / Standard (14-inch)",
      sku: "TOTE-SMO-STD",
      price: new Prisma.Decimal(125000),
      compareAtPrice: new Prisma.Decimal(145000),
      inventoryCount: 10,
      options: {
        "Material Finish": "Smooth Italian Calfskin",
        Size: "Standard (14-inch)",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Smooth Italian Calfskin / Executive (16-inch)",
      sku: "TOTE-SMO-EXE",
      price: new Prisma.Decimal(145000),
      compareAtPrice: new Prisma.Decimal(165000),
      inventoryCount: 6,
      options: {
        "Material Finish": "Smooth Italian Calfskin",
        Size: "Executive (16-inch)",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Pebble Grained Leather / Standard (14-inch)",
      sku: "TOTE-PEB-STD",
      price: new Prisma.Decimal(135000),
      compareAtPrice: new Prisma.Decimal(155000),
      inventoryCount: 8,
      options: {
        "Material Finish": "Pebble Grained Leather",
        Size: "Standard (14-inch)",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Pebble Grained Leather / Executive (16-inch)",
      sku: "TOTE-PEB-EXE",
      price: new Prisma.Decimal(155000),
      compareAtPrice: new Prisma.Decimal(175000),
      inventoryCount: 4,
      options: {
        "Material Finish": "Pebble Grained Leather",
        Size: "Executive (16-inch)",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const toteStock = toteVariants.reduce((sum, v) => sum + v.inventoryCount, 0);

  const existingProd2 = await prisma.product.findUnique({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "minimalist-structured-day-tote",
      },
    },
  });
  if (existingProd2) {
    await prisma.productVariant.deleteMany({
      where: { productId: existingProd2.id },
    });
  }

  const prod2 = await prisma.product.upsert({
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
        "An architecturally refined daily tote tailored for modern work and travel. Fits up to 16-inch laptops with reinforced base studs, magnetic bridge closure, and interior zippered organizer pouch.",
      sku: "TOTE-STR-01",
      price: new Prisma.Decimal(125000),
      compareAtPrice: new Prisma.Decimal(145000),
      inventoryCount: toteStock,
      trackInventory: true,
      hasVariants: true,
      options: toteOptions,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
      ],
      variants: { create: toteVariants },
    },
    create: {
      businessId: business.id,
      name: "Minimalist Structured Day Tote",
      slug: "minimalist-structured-day-tote",
      categoryId: catTotes.id,
      description:
        "An architecturally refined daily tote tailored for modern work and travel. Fits up to 16-inch laptops with reinforced base studs, magnetic bridge closure, and interior zippered organizer pouch.",
      sku: "TOTE-STR-01",
      price: new Prisma.Decimal(125000),
      compareAtPrice: new Prisma.Decimal(145000),
      inventoryCount: toteStock,
      trackInventory: true,
      hasVariants: true,
      options: toteOptions,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
      ],
      variants: { create: toteVariants },
    },
    include: { variants: true },
  });

  // Product 3: Croc-Embossed Baguette Shoulder Bag (Options: Color, Strap Style)
  const baguetteOptions = [
    {
      name: "Color",
      values: ["Bordeaux Gloss", "Espresso Noir", "Alabaster Cream"],
    },
    { name: "Strap Style", values: ["Gold Curb Chain", "Fine Leather Strap"] },
  ];

  const baguetteVariants = [
    {
      title: "Bordeaux Gloss / Gold Curb Chain",
      sku: "BAG-BDX-CHN",
      price: new Prisma.Decimal(85000),
      compareAtPrice: new Prisma.Decimal(105000),
      inventoryCount: 6,
      options: { Color: "Bordeaux Gloss", "Strap Style": "Gold Curb Chain" },
      imageUrl:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Bordeaux Gloss / Fine Leather Strap",
      sku: "BAG-BDX-LEA",
      price: new Prisma.Decimal(85000),
      compareAtPrice: new Prisma.Decimal(105000),
      inventoryCount: 5,
      options: { Color: "Bordeaux Gloss", "Strap Style": "Fine Leather Strap" },
      imageUrl:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Espresso Noir / Gold Curb Chain",
      sku: "BAG-ESP-CHN",
      price: new Prisma.Decimal(85000),
      compareAtPrice: new Prisma.Decimal(105000),
      inventoryCount: 7,
      options: { Color: "Espresso Noir", "Strap Style": "Gold Curb Chain" },
      imageUrl:
        "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Espresso Noir / Fine Leather Strap",
      sku: "BAG-ESP-LEA",
      price: new Prisma.Decimal(85000),
      compareAtPrice: new Prisma.Decimal(105000),
      inventoryCount: 6,
      options: { Color: "Espresso Noir", "Strap Style": "Fine Leather Strap" },
      imageUrl:
        "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Alabaster Cream / Gold Curb Chain",
      sku: "BAG-ALB-CHN",
      price: new Prisma.Decimal(90000),
      compareAtPrice: new Prisma.Decimal(110000),
      inventoryCount: 4,
      options: { Color: "Alabaster Cream", "Strap Style": "Gold Curb Chain" },
      imageUrl:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Alabaster Cream / Fine Leather Strap",
      sku: "BAG-ALB-LEA",
      price: new Prisma.Decimal(90000),
      compareAtPrice: new Prisma.Decimal(110000),
      inventoryCount: 4,
      options: {
        Color: "Alabaster Cream",
        "Strap Style": "Fine Leather Strap",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const baguetteStock = baguetteVariants.reduce(
    (sum, v) => sum + v.inventoryCount,
    0,
  );

  const existingProd3 = await prisma.product.findUnique({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "croc-embossed-baguette-shoulder-bag",
      },
    },
  });
  if (existingProd3) {
    await prisma.productVariant.deleteMany({
      where: { productId: existingProd3.id },
    });
  }

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
        "Nineties archival silhouette rendered in high-gloss embossed leather. Sculpted to sit snugly under the arm with custom geometric buckle hardware, convertible chain or leather strap, and internal zip pocket.",
      sku: "BAG-CROC-01",
      price: new Prisma.Decimal(85000),
      compareAtPrice: new Prisma.Decimal(105000),
      inventoryCount: baguetteStock,
      trackInventory: true,
      hasVariants: true,
      options: baguetteOptions,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=800&q=80",
      ],
      variants: { create: baguetteVariants },
    },
    create: {
      businessId: business.id,
      name: "Croc-Embossed Baguette Shoulder Bag",
      slug: "croc-embossed-baguette-shoulder-bag",
      categoryId: catShoulder.id,
      description:
        "Nineties archival silhouette rendered in high-gloss embossed leather. Sculpted to sit snugly under the arm with custom geometric buckle hardware, convertible chain or leather strap, and internal zip pocket.",
      sku: "BAG-CROC-01",
      price: new Prisma.Decimal(85000),
      compareAtPrice: new Prisma.Decimal(105000),
      inventoryCount: baguetteStock,
      trackInventory: true,
      hasVariants: true,
      options: baguetteOptions,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=800&q=80",
      ],
      variants: { create: baguetteVariants },
    },
    include: { variants: true },
  });

  // Product 4: UNIQUE HIGH-END ARTISANAL PIECE (Numbered Limited Series)
  const prod4 = await prisma.product.upsert({
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

  // Product 5: The Florentine Weekend Duffle (Options: Color, Hardware Finish)
  const duffleOptions = [
    { name: "Color", values: ["Tobacco Tan", "Midnight Black"] },
    {
      name: "Hardware Finish",
      values: ["Antique Brass", "Polished Palladium"],
    },
  ];

  const duffleVariants = [
    {
      title: "Tobacco Tan / Antique Brass",
      sku: "DUF-TOB-BRS",
      price: new Prisma.Decimal(210000),
      compareAtPrice: new Prisma.Decimal(240000),
      inventoryCount: 6,
      options: { Color: "Tobacco Tan", "Hardware Finish": "Antique Brass" },
      imageUrl:
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Tobacco Tan / Polished Palladium",
      sku: "DUF-TOB-PAL",
      price: new Prisma.Decimal(210000),
      compareAtPrice: new Prisma.Decimal(240000),
      inventoryCount: 5,
      options: {
        Color: "Tobacco Tan",
        "Hardware Finish": "Polished Palladium",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Midnight Black / Antique Brass",
      sku: "DUF-MID-BRS",
      price: new Prisma.Decimal(210000),
      compareAtPrice: new Prisma.Decimal(240000),
      inventoryCount: 4,
      options: { Color: "Midnight Black", "Hardware Finish": "Antique Brass" },
      imageUrl:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Midnight Black / Polished Palladium",
      sku: "DUF-MID-PAL",
      price: new Prisma.Decimal(210000),
      compareAtPrice: new Prisma.Decimal(240000),
      inventoryCount: 5,
      options: {
        Color: "Midnight Black",
        "Hardware Finish": "Polished Palladium",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const duffleStock = duffleVariants.reduce(
    (sum, v) => sum + v.inventoryCount,
    0,
  );

  const existingProd5 = await prisma.product.findUnique({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "the-florentine-weekend-duffle",
      },
    },
  });
  if (existingProd5) {
    await prisma.productVariant.deleteMany({
      where: { productId: existingProd5.id },
    });
  }

  await prisma.product.upsert({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "the-florentine-weekend-duffle",
      },
    },
    update: {
      name: "The Florentine Weekend Duffle",
      categoryId: catTotes.id,
      description:
        "Expansive luxury travel duffle cut from vegetable-tanned Tuscan leather. Features solid brass lockable two-way zippers, detachable shoulder strap, passport slip pocket, and brass feet.",
      sku: "DUF-FLOR-01",
      price: new Prisma.Decimal(210000),
      compareAtPrice: new Prisma.Decimal(240000),
      inventoryCount: duffleStock,
      trackInventory: true,
      hasVariants: true,
      options: duffleOptions,
      isFeatured: true,
      images: [
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
      ],
      variants: { create: duffleVariants },
    },
    create: {
      businessId: business.id,
      name: "The Florentine Weekend Duffle",
      slug: "the-florentine-weekend-duffle",
      categoryId: catTotes.id,
      description:
        "Expansive luxury travel duffle cut from vegetable-tanned Tuscan leather. Features solid brass lockable two-way zippers, detachable shoulder strap, passport slip pocket, and brass feet.",
      sku: "DUF-FLOR-01",
      price: new Prisma.Decimal(210000),
      compareAtPrice: new Prisma.Decimal(240000),
      inventoryCount: duffleStock,
      trackInventory: true,
      hasVariants: true,
      options: duffleOptions,
      isFeatured: true,
      images: [
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
      ],
      variants: { create: duffleVariants },
    },
    include: { variants: true },
  });

  // Product 6: The Atelier Courier Saddle Bag (Options: Color, Strap Style)
  const saddleOptions = [
    { name: "Color", values: ["Sienna Rust", "Obsidian Black", "Olive Drab"] },
    {
      name: "Strap Style",
      values: ["Woven Jacquard Strap", "Tonal Saddle Leather"],
    },
  ];

  const saddleVariants = [
    {
      title: "Sienna Rust / Woven Jacquard Strap",
      sku: "SDL-SNA-WVN",
      price: new Prisma.Decimal(115000),
      compareAtPrice: new Prisma.Decimal(135000),
      inventoryCount: 6,
      options: { Color: "Sienna Rust", "Strap Style": "Woven Jacquard Strap" },
      imageUrl:
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Sienna Rust / Tonal Saddle Leather",
      sku: "SDL-SNA-LEA",
      price: new Prisma.Decimal(115000),
      compareAtPrice: new Prisma.Decimal(135000),
      inventoryCount: 5,
      options: { Color: "Sienna Rust", "Strap Style": "Tonal Saddle Leather" },
      imageUrl:
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Obsidian Black / Woven Jacquard Strap",
      sku: "SDL-OBS-WVN",
      price: new Prisma.Decimal(115000),
      compareAtPrice: new Prisma.Decimal(135000),
      inventoryCount: 7,
      options: {
        Color: "Obsidian Black",
        "Strap Style": "Woven Jacquard Strap",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Obsidian Black / Tonal Saddle Leather",
      sku: "SDL-OBS-LEA",
      price: new Prisma.Decimal(115000),
      compareAtPrice: new Prisma.Decimal(135000),
      inventoryCount: 6,
      options: {
        Color: "Obsidian Black",
        "Strap Style": "Tonal Saddle Leather",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Olive Drab / Woven Jacquard Strap",
      sku: "SDL-OLV-WVN",
      price: new Prisma.Decimal(120000),
      compareAtPrice: new Prisma.Decimal(140000),
      inventoryCount: 4,
      options: { Color: "Olive Drab", "Strap Style": "Woven Jacquard Strap" },
      imageUrl:
        "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Olive Drab / Tonal Saddle Leather",
      sku: "SDL-OLV-LEA",
      price: new Prisma.Decimal(120000),
      compareAtPrice: new Prisma.Decimal(140000),
      inventoryCount: 3,
      options: { Color: "Olive Drab", "Strap Style": "Tonal Saddle Leather" },
      imageUrl:
        "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const saddleStock = saddleVariants.reduce(
    (sum, v) => sum + v.inventoryCount,
    0,
  );

  const existingProd6 = await prisma.product.findUnique({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "the-atelier-courier-saddle-bag",
      },
    },
  });
  if (existingProd6) {
    await prisma.productVariant.deleteMany({
      where: { productId: existingProd6.id },
    });
  }

  const prod6 = await prisma.product.upsert({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "the-atelier-courier-saddle-bag",
      },
    },
    update: {
      name: "The Atelier Courier Saddle Bag",
      categoryId: catShoulder.id,
      description:
        "Archival equestrian saddle silhouette with magnetic flap closure, interior slip slots, and dual convertible strap options (custom woven monogram jacquard or tonal saddle leather).",
      sku: "SDL-COUR-01",
      price: new Prisma.Decimal(115000),
      compareAtPrice: new Prisma.Decimal(135000),
      inventoryCount: saddleStock,
      trackInventory: true,
      hasVariants: true,
      options: saddleOptions,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
      ],
      variants: { create: saddleVariants },
    },
    create: {
      businessId: business.id,
      name: "The Atelier Courier Saddle Bag",
      slug: "the-atelier-courier-saddle-bag",
      categoryId: catShoulder.id,
      description:
        "Archival equestrian saddle silhouette with magnetic flap closure, interior slip slots, and dual convertible strap options (custom woven monogram jacquard or tonal saddle leather).",
      sku: "SDL-COUR-01",
      price: new Prisma.Decimal(115000),
      compareAtPrice: new Prisma.Decimal(135000),
      inventoryCount: saddleStock,
      trackInventory: true,
      hasVariants: true,
      options: saddleOptions,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
      ],
      variants: { create: saddleVariants },
    },
    include: { variants: true },
  });

  // ---------------------------------------------------------------------------
  // 4. SEED AT LEAST 3 DUMMY ORDERS (FILLING THE ORDERS REGISTER)
  // ---------------------------------------------------------------------------
  console.info("📦 Seeding dummy orders for Atelier Forma storefront...");

  // Lookup existing customers from seedBusiness
  const customerSora = await prisma.customer.findFirst({
    where: { businessId: business.id, email: "kenji@soraprotocol.io" },
  });
  const customerKanso = await prisma.customer.findFirst({
    where: { businessId: business.id, email: "hiroshi@kanso.jp" },
  });
  const customerAethel = await prisma.customer.findFirst({
    where: { businessId: business.id, email: "amara@aethel.com" },
  });

  // Order 1: Completed, Paid & Delivered
  const order1Existing = await prisma.order.findUnique({
    where: { orderNumber: "ORD-2026-0001" },
  });
  if (order1Existing) {
    await prisma.orderItem.deleteMany({
      where: { orderId: order1Existing.id },
    });
    await prisma.order.delete({ where: { id: order1Existing.id } });
  }

  const v1 = prod1.variants[0];
  const v2 = prod2.variants[0];

  await prisma.order.create({
    data: {
      businessId: business.id,
      customerId: customerSora?.id,
      orderNumber: "ORD-2026-0001",
      customerName: customerSora?.name || "Kenji Takahashi",
      customerEmail: customerSora?.email || "kenji@soraprotocol.io",
      customerPhone: customerSora?.phone || "+2348031234567",
      notes: "Please pack with extra tissue wrap and include a gift invoice.",
      currency: "NGN",
      subtotal: new Prisma.Decimal(310000),
      discountAmount: new Prisma.Decimal(0),
      deliveryFee: new Prisma.Decimal(3500),
      platformFee: new Prisma.Decimal(4650),
      merchantEarnings: new Prisma.Decimal(308850),
      total: new Prisma.Decimal(313500),
      status: OrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      fulfillmentStatus: FulfillmentStatus.DELIVERED,
      deliveryType: DeliveryType.HOME_DELIVERY,
      courierName: "DHL Express",
      trackingNumber: "DHL-NG-8839201",
      trackingUrl: "https://www.dhl.com/en/express/tracking.html?AWB=8839201",
      shippingAddress: {
        line1: "548 Market St, Suite 2B",
        city: "Victoria Island",
        state: "Lagos",
        postalCode: "101241",
        country: "Nigeria",
      },
      paymentReference: "pstk_demo_ref_001_sora",
      paidAt: new Date("2026-09-12T14:32:00Z"),
      fulfilledAt: new Date("2026-09-14T11:00:00Z"),
      items: {
        create: [
          {
            productId: prod1.id,
            variantId: v1?.id,
            productName: prod1.name,
            variantTitle:
              v1?.title || "Onyx Black / Medium (28cm) / 24k Polished Gold",
            productSku: v1?.sku || "SAT-ONX-MED-GLD",
            productImage: v1?.imageUrl,
            unitPrice: new Prisma.Decimal(185000),
            quantity: 1,
            totalPrice: new Prisma.Decimal(185000),
          },
          {
            productId: prod2.id,
            variantId: v2?.id,
            productName: prod2.name,
            variantTitle:
              v2?.title || "Smooth Italian Calfskin / Standard (14-inch)",
            productSku: v2?.sku || "TOTE-SMO-STD",
            productImage: v2?.imageUrl,
            unitPrice: new Prisma.Decimal(125000),
            quantity: 1,
            totalPrice: new Prisma.Decimal(125000),
          },
        ],
      },
    },
  });

  // Order 2: Confirmed, Paid, Processing (Store Pickup)
  const order2Existing = await prisma.order.findUnique({
    where: { orderNumber: "ORD-2026-0002" },
  });
  if (order2Existing) {
    await prisma.orderItem.deleteMany({
      where: { orderId: order2Existing.id },
    });
    await prisma.order.delete({ where: { id: order2Existing.id } });
  }

  const v6 = prod6.variants[0];

  await prisma.order.create({
    data: {
      businessId: business.id,
      customerId: customerKanso?.id,
      orderNumber: "ORD-2026-0002",
      customerName: customerKanso?.name || "Hiroshi Tanaka",
      customerEmail: customerKanso?.email || "hiroshi@kanso.jp",
      customerPhone: customerKanso?.phone || "+2348055551234",
      notes: "Will pick up at the Victoria Island studio on Friday afternoon.",
      currency: "NGN",
      subtotal: new Prisma.Decimal(115000),
      discountAmount: new Prisma.Decimal(0),
      deliveryFee: new Prisma.Decimal(0),
      platformFee: new Prisma.Decimal(1725),
      merchantEarnings: new Prisma.Decimal(113275),
      total: new Prisma.Decimal(115000),
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      fulfillmentStatus: FulfillmentStatus.PROCESSING,
      deliveryType: DeliveryType.STORE_PICKUP,
      pickupLocation: "Victoria Island Design Studio, 14 Ahmadu Bello Way",
      paymentReference: "pstk_demo_ref_002_kanso",
      paidAt: new Date("2026-09-17T09:15:00Z"),
      items: {
        create: [
          {
            productId: prod6.id,
            variantId: v6?.id,
            productName: prod6.name,
            variantTitle: v6?.title || "Sienna Rust / Woven Jacquard Strap",
            productSku: v6?.sku || "SDL-SNA-WVN",
            productImage: v6?.imageUrl,
            unitPrice: new Prisma.Decimal(115000),
            quantity: 1,
            totalPrice: new Prisma.Decimal(115000),
          },
        ],
      },
    },
  });

  // Order 3: Open, Unpaid, Unfulfilled
  const order3Existing = await prisma.order.findUnique({
    where: { orderNumber: "ORD-2026-0003" },
  });
  if (order3Existing) {
    await prisma.orderItem.deleteMany({
      where: { orderId: order3Existing.id },
    });
    await prisma.order.delete({ where: { id: order3Existing.id } });
  }

  await prisma.order.create({
    data: {
      businessId: business.id,
      customerId: customerAethel?.id,
      orderNumber: "ORD-2026-0003",
      customerName: customerAethel?.name || "Amara Vance",
      customerEmail: customerAethel?.email || "amara@aethel.com",
      customerPhone: customerAethel?.phone || "+2348029998888",
      notes: "Awaiting bank transfer confirmation.",
      currency: "NGN",
      subtotal: new Prisma.Decimal(380000),
      discountAmount: new Prisma.Decimal(0),
      deliveryFee: new Prisma.Decimal(3500),
      platformFee: new Prisma.Decimal(5700),
      merchantEarnings: new Prisma.Decimal(377800),
      total: new Prisma.Decimal(383500),
      status: OrderStatus.OPEN,
      paymentStatus: PaymentStatus.UNPAID,
      fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
      deliveryType: DeliveryType.HOME_DELIVERY,
      courierName: "GIG Logistics",
      shippingAddress: {
        line1: "12 Queen's Drive, Ikoyi",
        city: "Lagos",
        state: "Lagos",
        postalCode: "101233",
        country: "Nigeria",
      },
      items: {
        create: [
          {
            productId: prod4.id,
            productName: prod4.name,
            variantTitle: "Collector Series (Piece No. 07)",
            productSku: prod4.sku || "CAPSULE-WVN-07",
            productImage: prod4.images[0],
            unitPrice: new Prisma.Decimal(380000),
            quantity: 1,
            totalPrice: new Prisma.Decimal(380000),
          },
        ],
      },
    },
  });

  // Update order document sequence to 3
  await prisma.documentSequence.upsert({
    where: {
      businessId_type_year: {
        businessId: business.id,
        type: "ORDER",
        year: 2026,
      },
    },
    update: { lastNumber: 3 },
    create: {
      businessId: business.id,
      type: "ORDER",
      year: 2026,
      lastNumber: 3,
    },
  });

  console.info(
    `✅ Successfully seeded 6 designer products (with 27 total variants across 5 variant types) and 3 orders for "${business.name}"!\n`,
  );
  console.info("📦 Seeded Products Summary:");
  console.info(
    "  1. The Saffiano Heritage Satchel (Color, Size, Hardware Finish - 7 Variants)",
  );
  console.info(
    "  2. Minimalist Structured Day Tote (Material Finish, Size - 4 Variants)",
  );
  console.info(
    "  3. Croc-Embossed Baguette Shoulder Bag (Color, Strap Style - 6 Variants)",
  );
  console.info(
    "  4. Limited Edition Hand-Woven Sculptural Bucket Bag (Numbered Series)",
  );
  console.info(
    "  5. The Florentine Weekend Duffle (Color, Hardware Finish - 4 Variants)",
  );
  console.info(
    "  6. The Atelier Courier Saddle Bag (Color, Strap Style - 6 Variants)",
  );
  console.info("📋 Seeded Orders Summary:");
  console.info("  - ORD-2026-0001: ₦313,500 (Completed / Paid / Delivered)");
  console.info("  - ORD-2026-0002: ₦115,000 (Confirmed / Paid / Store Pickup)");
  console.info("  - ORD-2026-0003: ₦383,500 (Open / Unpaid / Home Delivery)");
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
