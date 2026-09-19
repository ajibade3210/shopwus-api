import { Prisma, type PrismaClient } from "@prisma/client";
import argon2 from "argon2";

export async function seedBusiness(prisma: PrismaClient) {
  console.info("🎨 Seeding Elena Vance & Atelier Forma Studio...");

  const passwordHash = await argon2.hash("@Shopwus2026");

  // 1. Create or update Demo Studio Owner User
  const user = await prisma.user.upsert({
    where: { email: "elena@atelierforma.design" },
    update: {
      passwordHash,
      emailVerified: true,
      firstName: "Elena",
      lastName: "Vance",
      phone: "+2348003676284",
      role: "OWNER",
      isActive: true,
    },
    create: {
      email: "elena@atelierforma.design",
      passwordHash,
      emailVerified: true,
      firstName: "Elena",
      lastName: "Vance",
      phone: "+2348003676284",
      role: "OWNER",
      isActive: true,
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    },
  });

  // 2. Create or update Studio Business with all preferences populated
  const businessData = {
    slug: "atelier-forma",
    name: "Atelier Forma",
    tagline: "Graphic Design, Brand Architecture & Visual Identity Atelier",
    description:
      "We partner with visionary founders, luxury ateliers, and technology pioneers to craft timeless visual identities, editorial publications, and high-conversion digital experiences.",
    location: "Victoria Island, Lagos & Mayfair, London",
    website: "https://atelierforma.design",
    email: "studio@atelierforma.design",
    phone: "+234 800 FORMA VIP",
    whatsAppNumber: "+2348055966944",
    operatingHours: "Mon–Fri",
    timeFrom: "09:00 AM",
    timeTo: "06:00 PM",
    byAppointmentOnly: false,
    logoUrl:
      "https://cdn.accessa.ng/test/accessa/louis-dike-ayskyj/images/c95e52aa48bf676ed0d53f36bb957b81.png",
    bannerUrl:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
    emailHeaderUrl:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
    headerType: "IMAGE",
    includeHeaderInInvoice: true,
    includeHeaderInEmail: true,
    businessType: "sales",
    currency: "NGN",
    bankName: "Access Bank",
    accountName: "Atelier Forma Limited",
    accountNumber: "0123456789",
    addressLine1: "14 Ahmadu Bello Way",
    addressLine2: "Suite 5B, Victoria Island",
    city: "Lagos",
    state: "Lagos",
    postalCode: "101241",
    country: "Nigeria",
    senderPhone: "+2348055966944",
    enableStorePickup: true,
    pickupInstructions:
      "Pick up available Monday to Friday, 10am to 5pm at our Victoria Island design studio.",
    enableHomeDelivery: true,
    freeDeliveryThreshold: 150000,
    fallbackShippingFee: 3500,
    colors: {
      primary: "#000000",
      secondary: "#0058BE",
      button: "#000000",
      pageBackground: "#faf8f5",
      cardBackground: "#faf6f0",
      text: "#191C1D",
    },
    buttonRadius: "8px",
    showServices: true,
    showPortfolio: true,
    showReviews: true,
    showFooterCta: true,
    footerEyebrow: "COMMISSION AN EDITORIAL WORK",
    footerTitle: "Let's craft something timeless together",
    footerDescription:
      "Direct consultations open for Q3/Q4 brand transformations and bespoke publications.",
    googleReviewsLink: "https://g.page/r/atelierforma/review",
    portfolioCategories: [
      "Brand Identity",
      "UI/UX & Product",
      "Packaging & Print",
    ],
    // Storefront Customization Preferences (All configured)
    showStorefrontBanner: true,
    storefrontBannerUrl:
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1600&q=80",
    storefrontBannerHeader: "THE ARCHIVE COLLECTION",
    storefrontBannerBody:
      "Limited-run publications, bespoke type specimens, and collectible design artifacts crafted for collectors worldwide.",
    storefrontBannerTextColor: "#FFFFFF",
    storefrontBannerBgColor: "#0D1117",
    showStorefrontSales: true,
    storefrontSalesPosition: "bottom",
    storefrontSalesUrl:
      "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=80",
    storefrontSalesHeader: "Mid-Season Archive Acquisition",
    storefrontSalesBody:
      "Complimentary express global delivery and signed bookplates with all limited-edition volumes this week.",
    storefrontSalesBtnText: "Explore The Collection",
    storefrontSalesBtnUrl: "/atelier-forma?category=luxury-totes",
    storefrontSalesLinkType: "category",
    isPublished: true,
    isVerified: true,
  };

  const business = await prisma.business.upsert({
    where: { slug: "atelier-forma" },
    update: businessData,
    create: businessData,
  });

  // 3. Link User to Business
  await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: user.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      businessId: business.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  // 4. Social Channels
  const channels = [
    {
      type: "instagram",
      label: "Instagram",
      connected: true,
      handle: "atelierforma.design",
      url: "https://instagram.com/atelierforma.design",
      description:
        "Visual identity archives, kinetic typography & editorial previews",
    },
    {
      type: "linkedin",
      label: "LinkedIn",
      connected: true,
      handle: "atelier-forma",
      url: "https://linkedin.com/company/atelier-forma",
      description:
        "Design leadership, brand system case studies & client essays",
    },
    {
      type: "x",
      label: "X (Twitter)",
      connected: true,
      handle: "atelierforma",
      url: "https://x.com/atelierforma",
      description: "Design critiques, type release dispatches & studio notes",
    },
    {
      type: "whatsapp",
      label: "WhatsApp",
      connected: true,
      handle: "+234 800 FORMA VIP",
      url: "https://wa.me/2348055966944",
      description: "Direct studio concierge & new project commission desk",
    },
  ];

  for (const ch of channels) {
    const existing = await prisma.socialChannel.findFirst({
      where: { businessId: business.id, type: ch.type },
    });
    if (!existing) {
      await prisma.socialChannel.create({
        data: { ...ch, businessId: business.id },
      });
    }
  }

  // 5. Portfolio Projects
  const projects = [
    {
      title: "Aethel Luxury Rebrand",
      category: "Brand Identity",
      location: "London & Lagos",
      description:
        "Comprehensive brand identity redesign for a luxury heritage maison including bespoke serif typography, monogram system, foiled stationery suite, and packaging architecture.",
      image:
        "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=1200&q=80",
      order: 0,
      isCover: true,
      gallery: [
        "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=80",
      ],
      stats: "48-Page Brand Book · Custom Monogram · Foil Packaging",
      client: "Aethel Heritage Maison",
      year: "2026",
    },
    {
      title: "Sora Protocol Design System",
      category: "UI/UX & Product",
      location: "San Francisco, CA",
      description:
        "Next-generation decentralized finance dashboard and mobile app interface, featuring high-contrast dark aesthetics, tokenized component libraries, and kinetic data visualizations.",
      image:
        "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80",
      order: 1,
      isCover: false,
      gallery: [
        "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
      ],
      stats: "140+ UI Components · iOS & Web · Figma System",
      client: "Sora Decentralized Protocol",
      year: "2026",
    },
    {
      title: "Kanso Editorial Book No. 04",
      category: "Packaging & Print",
      location: "Tokyo / Milan",
      description:
        "Limited hardcover architectural publication featuring exposed Swiss binding, blind debossed linen cover, custom grid layout systems, and duotone offset printing.",
      image:
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80",
      order: 2,
      isCover: false,
      gallery: [
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
      ],
      stats: "320 Pages · Linen Hardcover · Swiss Bound",
      client: "Kanso Architecture Press",
      year: "2025",
    },
  ];

  for (const proj of projects) {
    const existing = await prisma.portfolioProject.findFirst({
      where: { businessId: business.id, title: proj.title },
    });
    if (!existing) {
      await prisma.portfolioProject.create({
        data: { ...proj, businessId: business.id },
      });
    }
  }

  // 6. Reviews
  const reviews = [
    {
      author: "Claire Beaumont",
      role: "Global Marketing Director, Aethel Heritage",
      eventType: "Brand Identity & Monogram System",
      rating: 5,
      comment:
        "Atelier Forma captured our 140-year heritage with absolute elegance while making us feel instantly modern. Their mastery of bespoke typography, print textures, and brand guidelines is unmatched.",
      date: "February 2026",
      isApproved: true,
    },
    {
      author: "Kenji Sato",
      role: "Founder & CEO, Sora Protocol",
      eventType: "Product UI/UX & Design System",
      rating: 5,
      comment:
        "Working with Elena and her team transformed our product experience. They delivered an elite design system with pixel-perfect tokens that scaled across web and mobile effortlessly.",
      date: "January 2026",
      isApproved: true,
    },
  ];

  for (const rev of reviews) {
    const existing = await prisma.review.findFirst({
      where: { businessId: business.id, author: rev.author },
    });
    if (!existing) {
      await prisma.review.create({
        data: { ...rev, businessId: business.id },
      });
    }
  }

  // 7. Services
  const services = [
    {
      name: "Brand Identity & Guidelines",
      category: "Identity",
      description:
        "Comprehensive visual identity design including bespoke typography, primary marks, sub-marks, color harmony, and a full brand guidelines bible.",
      price: 96000,
      isFeatured: true,
    },
    {
      name: "Digital Product & UI/UX Design",
      category: "Digital",
      description:
        "End-to-end design systems, mobile app UI/UX, responsive web interfaces, and interactive prototyping built for scale.",
      price: 74000,
      isFeatured: true,
    },
    {
      name: "Packaging & Print Architecture",
      category: "Print",
      description:
        "Luxury unboxing experiences, die-cut packaging boxes, embossed foil treatments, and sustainable print production management.",
      price: 54000,
      isFeatured: false,
    },
    {
      name: "Editorial & Monograph Books",
      category: "Print",
      description:
        "Custom grid layout architecture, multi-lingual typesetting, art monographs, and coffee table publication design.",
      price: 32000,
      isFeatured: false,
    },
  ];

  for (const svc of services) {
    const existing = await prisma.service.findFirst({
      where: { businessId: business.id, name: svc.name },
    });
    if (!existing) {
      await prisma.service.create({
        data: { ...svc, businessId: business.id },
      });
    }
  }

  // 8. Customers
  const customerAethel = await prisma.customer.upsert({
    where: { id: "cust-aethel" },
    update: {
      name: "Aethel Heritage Maison",
      email: "claire@aethel.com",
      phone: "+234 803 555 0177",
      company: "Aethel Group",
      totalRevenue: 126000,
      notes:
        "Requires classic serif typography, minimal foil stamping, and warm editorial paper stock.",
      isActive: true,
    },
    create: {
      id: "cust-aethel",
      businessId: business.id,
      name: "Aethel Heritage Maison",
      email: "claire@aethel.com",
      phone: "+234 803 555 0177",
      company: "Aethel Group",
      totalRevenue: 126000,
      notes:
        "Requires classic serif typography, minimal foil stamping, and warm editorial paper stock.",
      isActive: true,
    },
  });

  const customerKanso = await prisma.customer.upsert({
    where: { id: "cust-kanso" },
    update: {
      name: "Kanso Architecture Press",
      email: "press@kanso.jp",
      phone: "+234 809 794 6095",
      company: "Kanso Press",
      totalRevenue: 43000,
      notes:
        "Japanese minimalist architectural publications. Emphasizes negative space and Swiss typography.",
      isActive: true,
    },
    create: {
      id: "cust-kanso",
      businessId: business.id,
      name: "Kanso Architecture Press",
      email: "press@kanso.jp",
      phone: "+234 809 794 6095",
      company: "Kanso Press",
      totalRevenue: 43000,
      notes:
        "Japanese minimalist architectural publications. Emphasizes negative space and Swiss typography.",
      isActive: true,
    },
  });

  const customerSora = await prisma.customer.upsert({
    where: { id: "cust-sora" },
    update: {
      name: "Sora Protocol Labs",
      email: "kenji@soraprotocol.io",
      phone: "+1 415 555 0192",
      company: "Sora Labs",
      totalRevenue: 96000,
      notes:
        "Web3 fintech platform. Requires dark-mode first design tokens, high contrast, and smooth micro-interactions.",
      isActive: true,
    },
    create: {
      id: "cust-sora",
      businessId: business.id,
      name: "Sora Protocol Labs",
      email: "kenji@soraprotocol.io",
      phone: "+1 415 555 0192",
      company: "Sora Labs",
      totalRevenue: 96000,
      notes:
        "Web3 fintech platform. Requires dark-mode first design tokens, high contrast, and smooth micro-interactions.",
      isActive: true,
    },
  });

  // 9. Customer Services
  const cServices = [
    {
      customerId: customerAethel.id,
      name: "Aethel Brand Architecture",
      service: "Brand Identity & Guidelines",
      amount: 96000,
      status: "active" as const,
    },
    {
      customerId: customerAethel.id,
      name: "Foil Packaging & Unboxing Suite",
      service: "Packaging & Print Architecture",
      amount: 18000,
      status: "completed" as const,
      completedAt: new Date("2026-07-20"),
    },
    {
      customerId: customerKanso.id,
      name: "Kanso Monograph Edition 04",
      service: "Editorial & Monograph Books",
      amount: 28000,
      status: "completed" as const,
      completedAt: new Date("2026-07-18"),
    },
    {
      customerId: customerSora.id,
      name: "Sora Protocol Design System",
      service: "Digital Product & UI/UX Design",
      amount: 74000,
      status: "pending" as const,
    },
  ];

  for (const cs of cServices) {
    const existing = await prisma.customerService.findFirst({
      where: { customerId: cs.customerId, name: cs.name },
    });
    if (!existing) {
      await prisma.customerService.create({
        data: { ...cs, businessId: business.id },
      });
    }
  }

  // 10. Customer Activities
  const activities = [
    {
      customerId: customerAethel.id,
      type: "service",
      description: "Brand guidelines bible and typography tokens approved",
    },
    {
      customerId: customerAethel.id,
      type: "note",
      description: "Added unboxing box dielines and foil stamp proofs",
    },
  ];

  for (const act of activities) {
    const existing = await prisma.customerActivity.findFirst({
      where: { customerId: act.customerId, description: act.description },
    });
    if (!existing) {
      await prisma.customerActivity.create({
        data: { ...act, businessId: business.id },
      });
    }
  }

  // 11. Leads
  const leads = [
    {
      name: "Sofia Laurent",
      email: "sofia.laurent@aethel.com",
      phone: "+234 802 555 0142",
      service: "Brand Identity & Guidelines",
      services: [
        "Brand Identity & Guidelines",
        "Packaging & Print Architecture",
      ],
      eventDate: "2026-10-18",
      budget: "85000",
      message:
        "We are launching our luxury beauty line and need an end-to-end visual identity and packaging system.",
      status: "new" as const,
    },
    {
      name: "Julian & Margot",
      email: "julian@soraprotocol.io",
      phone: "+1 415 555 0188",
      service: "Digital Product & UI/UX Design",
      services: [
        "Digital Product & UI/UX Design",
        "Motion & Kinetic Typography",
      ],
      eventDate: "2027-05-22",
      budget: "120000",
      message:
        "Looking for a design studio to architect our web3 exchange interface and complete token design system.",
      status: "contacted" as const,
    },
    {
      name: "Nora Chen",
      email: "nora.chen@kansopress.com",
      phone: "+44 20 7946 0958",
      service: "Editorial & Monograph Books",
      services: ["Editorial & Monograph Books"],
      eventDate: "2026-09-04",
      budget: "32000",
      message:
        "Art direction and 280-page layout design for our upcoming architecture monograph.",
      status: "qualified" as const,
    },
  ];

  for (const lead of leads) {
    const existing = await prisma.lead.findFirst({
      where: { businessId: business.id, email: lead.email },
    });
    if (!existing) {
      await prisma.lead.create({
        data: { ...lead, businessId: business.id },
      });
    }
  }

  // 12. Invoices
  const invoices = [
    {
      invoiceNumber: "INV-2026-001",
      customerId: customerAethel.id,
      customerName: "Aethel Heritage Maison",
      customerEmail: "claire@aethel.com",
      billingAddress: "14 Mayfair High St, London W1",
      dueDate: new Date("2026-09-15"),
      paymentTerms: "Net 30",
      currency: "NGN",
      subtotal: 96000,
      discount: 0,
      taxRate: 7.5,
      taxAmount: 7200,
      total: 103200,
      status: "paid" as const,
      items: [
        {
          description: "Aethel Luxury Rebrand & Comprehensive Guideline Bible",
          quantity: 1,
          unitPrice: 96000,
          amount: 96000,
        },
      ],
    },
    {
      invoiceNumber: "INV-2026-002",
      customerId: customerKanso.id,
      customerName: "Kanso Architecture Press",
      customerEmail: "press@kanso.jp",
      billingAddress: "Minato-ku, Tokyo, Japan",
      dueDate: new Date("2026-09-30"),
      paymentTerms: "Net 15",
      currency: "NGN",
      subtotal: 28000,
      discount: 0,
      taxRate: 7.5,
      taxAmount: 2100,
      total: 30100,
      status: "sent" as const,
      items: [
        {
          description: "Kanso Architecture Monograph 280-page Layout System",
          quantity: 1,
          unitPrice: 28000,
          amount: 28000,
        },
      ],
    },
    {
      invoiceNumber: "INV-2026-003",
      customerId: customerSora.id,
      customerName: "Sora Protocol Labs",
      customerEmail: "kenji@soraprotocol.io",
      billingAddress: "548 Market St, San Francisco, CA",
      dueDate: new Date("2026-10-15"),
      paymentTerms: "Due upon receipt",
      currency: "NGN",
      subtotal: 74000,
      discount: 0,
      taxRate: 7.5,
      taxAmount: 5550,
      total: 79550,
      status: "draft" as const,
      items: [
        {
          description: "Sora Protocol Dark-mode Design System & iOS Tokens",
          quantity: 1,
          unitPrice: 74000,
          amount: 74000,
        },
      ],
    },
  ];

  for (const inv of invoices) {
    const { items, ...invoiceData } = inv;
    const existing = await prisma.invoice.findUnique({
      where: { invoiceNumber: invoiceData.invoiceNumber },
    });
    if (!existing) {
      await prisma.invoice.create({
        data: {
          ...invoiceData,
          businessId: business.id,
          items: {
            create: items,
          },
        },
      });
    }
  }

  // 13. Expenses
  const expenses = [
    {
      description: "Figma Enterprise Organization Annual Subscription",
      category: "Software & Tools",
      amount: 45000,
      paymentMethod: "Corporate Card",
      vendor: "Figma Inc.",
      taxDeductible: true,
    },
    {
      description: "Editorial Linen Paper Proofs & Custom Die-cut Samples",
      category: "Materials & Production",
      amount: 28000,
      paymentMethod: "Bank Transfer",
      vendor: "GF Smith Papers London",
      taxDeductible: true,
    },
    {
      description: "Studio Dedicated Fiber High-Speed Internet",
      category: "Utilities",
      amount: 35000,
      paymentMethod: "Direct Debit",
      vendor: "MainOne Lagos",
      taxDeductible: true,
    },
    {
      description: "Bespoke Foundry Commercial Font License (Editorial Serif)",
      category: "Licensing",
      amount: 85000,
      paymentMethod: "Corporate Card",
      vendor: "Klim Type Foundry",
      taxDeductible: true,
    },
  ];

  for (const exp of expenses) {
    const existing = await prisma.expense.findFirst({
      where: { businessId: business.id, description: exp.description },
    });
    if (!existing) {
      await prisma.expense.create({
        data: { ...exp, businessId: business.id },
      });
    }
  }

  // 14. Broadcast Campaigns (at least 2 items)
  const campaigns = [
    {
      title: "Autumn 2026 Atelier Case Studies & Print Monograph Release",
      channel: "EMAIL",
      recipientCount: 420,
      status: "COMPLETED",
    },
    {
      title: "Exclusive VIP Atelier Preview: Handcrafted Leather Capsule",
      channel: "EMAIL",
      recipientCount: 650,
      status: "COMPLETED",
    },
  ];

  for (const camp of campaigns) {
    const existing = await prisma.broadcastCampaign.findFirst({
      where: {
        businessId: business.id,
        title: camp.title,
      },
    });
    if (!existing) {
      await prisma.broadcastCampaign.create({
        data: {
          ...camp,
          businessId: business.id,
        },
      });
    }
  }

  // 15. Storefront Categories
  const categoryBrand = await prisma.category.upsert({
    where: {
      businessId_slug: { businessId: business.id, slug: "brand-systems" },
    },
    update: {
      name: "Brand Systems & Identity",
      description:
        "Complete visual identity bibles, typography systems, and core marks.",
      imageUrl:
        "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=800&q=80",
    },
    create: {
      businessId: business.id,
      name: "Brand Systems & Identity",
      slug: "brand-systems",
      description:
        "Complete visual identity bibles, typography systems, and core marks.",
      imageUrl:
        "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=800&q=80",
    },
  });

  const categoryEditorial = await prisma.category.upsert({
    where: {
      businessId_slug: { businessId: business.id, slug: "editorial-books" },
    },
    update: {
      name: "Editorial & Monograph Books",
      description:
        "Hardcover monographs, exposed Swiss-bound art books, and layout systems.",
      imageUrl:
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    },
    create: {
      businessId: business.id,
      name: "Editorial & Monograph Books",
      slug: "editorial-books",
      description:
        "Hardcover monographs, exposed Swiss-bound art books, and layout systems.",
      imageUrl:
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    },
  });

  const categoryDigital = await prisma.category.upsert({
    where: {
      businessId_slug: { businessId: business.id, slug: "digital-tokens" },
    },
    update: {
      name: "Digital Design & UI Tokens",
      description:
        "High-contrast design systems, tokenized mobile interfaces, and Figma component libraries.",
      imageUrl:
        "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
    },
    create: {
      businessId: business.id,
      name: "Digital Design & UI Tokens",
      slug: "digital-tokens",
      description:
        "High-contrast design systems, tokenized mobile interfaces, and Figma component libraries.",
      imageUrl:
        "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
    },
  });

  const categoryPackaging = await prisma.category.upsert({
    where: {
      businessId_slug: { businessId: business.id, slug: "packaging-objects" },
    },
    update: {
      name: "Packaging & Spatial Objects",
      description:
        "Bespoke unboxing boxes, foil stamp dies, and physical design artifacts.",
      imageUrl:
        "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80",
    },
    create: {
      businessId: business.id,
      name: "Packaging & Spatial Objects",
      slug: "packaging-objects",
      description:
        "Bespoke unboxing boxes, foil stamp dies, and physical design artifacts.",
      imageUrl:
        "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80",
    },
  });

  // 16. Products (10 items: 9 with categories = 90%, 1 with null category = 10%)
  const productsData = [
    {
      name: "Aethel Heritage Monograph & Foil Box Edition",
      slug: "aethel-heritage-monograph",
      categoryId: categoryEditorial.id,
      description:
        "Limited hardcover architectural publication with custom blind debossed linen and foiled collector slipcase.",
      sku: "ATH-MONO-01",
      price: new Prisma.Decimal(185000),
      compareAtPrice: new Prisma.Decimal(220000),
      costPrice: new Prisma.Decimal(95000),
      trackInventory: true,
      inventoryCount: 14,
      isFeatured: true,
      images: [
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
      ],
    },
    {
      name: "Sora Protocol Dark-Mode UI/UX Token Library",
      slug: "sora-protocol-tokens",
      categoryId: categoryDigital.id,
      description:
        "140+ pixel-perfect tokenized dashboard components, iOS layout grids, and dark-aesthetic animations.",
      sku: "SRA-TOK-02",
      price: new Prisma.Decimal(95000),
      compareAtPrice: new Prisma.Decimal(120000),
      costPrice: new Prisma.Decimal(30000),
      trackInventory: false,
      inventoryCount: 999,
      isFeatured: true,
      images: [
        "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
      ],
    },
    {
      name: "Atelier Forma Complete Brand Identity Bible",
      slug: "brand-identity-bible",
      categoryId: categoryBrand.id,
      description:
        "Comprehensive 48-page brand architecture guidelines, typography tokens, and monogram vector suite.",
      sku: "FORMA-BIB-03",
      price: new Prisma.Decimal(240000),
      compareAtPrice: new Prisma.Decimal(280000),
      costPrice: new Prisma.Decimal(110000),
      trackInventory: true,
      inventoryCount: 9,
      isFeatured: true,
      images: [
        "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80",
      ],
    },
    {
      name: "Kanso Architecture Monograph No. 04",
      slug: "kanso-architecture-monograph-04",
      categoryId: categoryEditorial.id,
      description:
        "Swiss-bound architectural hardcover monograph printed on warm duotone offset paper stock.",
      sku: "KNS-MONO-04",
      price: new Prisma.Decimal(145000),
      compareAtPrice: new Prisma.Decimal(165000),
      costPrice: new Prisma.Decimal(65000),
      trackInventory: true,
      inventoryCount: 18,
      isFeatured: true,
      images: [
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
      ],
    },
    {
      name: "Bespoke Linen Presentation Box Suite",
      slug: "linen-presentation-box-suite",
      categoryId: categoryPackaging.id,
      description:
        "Custom debossed luxury presentation box with magnetic enclosure and custom velvet interior trays.",
      sku: "BOX-LINEN-05",
      price: new Prisma.Decimal(85000),
      compareAtPrice: new Prisma.Decimal(105000),
      costPrice: new Prisma.Decimal(35000),
      trackInventory: true,
      inventoryCount: 12,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80",
      ],
    },
    {
      name: "Kinetic Serif Display Type Specimen",
      slug: "kinetic-serif-type-specimen",
      categoryId: categoryBrand.id,
      description:
        "Desktop & Web typography specimen showcasing complete glyph alternates and OpenType ligature tables.",
      sku: "FNT-SRF-06",
      price: new Prisma.Decimal(65000),
      compareAtPrice: new Prisma.Decimal(80000),
      costPrice: new Prisma.Decimal(15000),
      trackInventory: false,
      inventoryCount: 999,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
      ],
    },
    {
      name: "Fintech Design System Token Architecture",
      slug: "fintech-token-architecture",
      categoryId: categoryDigital.id,
      description:
        "High-scale multi-platform token design repository for responsive web and React Native apps.",
      sku: "DS-FNT-07",
      price: new Prisma.Decimal(110000),
      compareAtPrice: new Prisma.Decimal(130000),
      costPrice: new Prisma.Decimal(40000),
      trackInventory: false,
      inventoryCount: 999,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
      ],
    },
    {
      name: "Blind Debossed Stationery Suite",
      slug: "blind-debossed-stationery-suite",
      categoryId: categoryPackaging.id,
      description:
        "Letterpress business cards, blind debossed envelopes, and foiled luxury correspondence cards.",
      sku: "STN-DEB-08",
      price: new Prisma.Decimal(55000),
      compareAtPrice: new Prisma.Decimal(70000),
      costPrice: new Prisma.Decimal(22000),
      trackInventory: true,
      inventoryCount: 25,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=800&q=80",
      ],
    },
    {
      name: "Swiss Grid Layout System Poster Folio",
      slug: "swiss-grid-layout-folio",
      categoryId: categoryEditorial.id,
      description:
        "Set of 6 architectural format posters printed on 240gsm matte stock exploring rationalist layout grids.",
      sku: "PST-SWS-09",
      price: new Prisma.Decimal(42000),
      compareAtPrice: null,
      costPrice: new Prisma.Decimal(16000),
      trackInventory: true,
      inventoryCount: 30,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 10: UNASSIGNED CATEGORY (categoryId is null)
    {
      name: "Private Studio Creative Consultation",
      slug: "private-studio-consultation",
      categoryId: null, // Demonstrates optional unassigned category support
      description:
        "1-on-1 direct creative direction session with Elena Vance for brand transformation and publishing.",
      sku: "CON-DIR-10",
      price: new Prisma.Decimal(75000),
      compareAtPrice: null,
      costPrice: new Prisma.Decimal(0),
      trackInventory: false,
      inventoryCount: 50,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 11: Brand Systems
    {
      name: "Monochrome Serif Type Family (Desktop & Web)",
      slug: "monochrome-serif-type-family",
      categoryId: categoryBrand.id,
      description:
        "Complete 18-weight serif family with extensive Latin language support and mathematical glyphs.",
      sku: "FNT-MONO-11",
      price: new Prisma.Decimal(120000),
      compareAtPrice: new Prisma.Decimal(150000),
      costPrice: new Prisma.Decimal(25000),
      trackInventory: false,
      inventoryCount: 999,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 12: Editorial Books
    {
      name: "Architectural Duotone Offset Print No. 01",
      slug: "duotone-offset-print-01",
      categoryId: categoryEditorial.id,
      description:
        "Archival giclée print on 310gsm German etching rag exploring brutalist elevation profiles.",
      sku: "PRT-BRUT-12",
      price: new Prisma.Decimal(38000),
      compareAtPrice: new Prisma.Decimal(48000),
      costPrice: new Prisma.Decimal(14000),
      trackInventory: true,
      inventoryCount: 22,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 13: Digital Tokens
    {
      name: "Minimalist iOS Design System & SwiftUI Tokens",
      slug: "minimalist-ios-tokens",
      categoryId: categoryDigital.id,
      description:
        "Native iOS 18 SwiftUI token architecture, haptic feedback patterns, and fluid animations.",
      sku: "DS-IOS-13",
      price: new Prisma.Decimal(88000),
      compareAtPrice: new Prisma.Decimal(115000),
      costPrice: new Prisma.Decimal(20000),
      trackInventory: false,
      inventoryCount: 999,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 14: Packaging Objects
    {
      name: "Hand-Crafted Acrylic Paperweight Block",
      slug: "acrylic-paperweight-block",
      categoryId: categoryPackaging.id,
      description:
        "Polished optical crystal cube with laser-etched typographic coordinate grid.",
      sku: "OBJ-CRY-14",
      price: new Prisma.Decimal(48000),
      compareAtPrice: new Prisma.Decimal(60000),
      costPrice: new Prisma.Decimal(19000),
      trackInventory: true,
      inventoryCount: 16,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 15: Editorial Books
    {
      name: "Editorial Layout Grid Template Bundle",
      slug: "editorial-grid-template-bundle",
      categoryId: categoryEditorial.id,
      description:
        "InDesign and Figma editorial layout kits for coffee table books, lookbooks, and annual reports.",
      sku: "TMP-EDT-15",
      price: new Prisma.Decimal(58000),
      compareAtPrice: new Prisma.Decimal(75000),
      costPrice: new Prisma.Decimal(12000),
      trackInventory: false,
      inventoryCount: 999,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 16: Packaging Objects
    {
      name: "Luxury Foil Stamped Certificate Suite",
      slug: "foil-stamped-certificate-suite",
      categoryId: categoryPackaging.id,
      description:
        "Set of 50 heavy parchment certificates with hot foil stamping and blind embossed seal.",
      sku: "STN-CRT-16",
      price: new Prisma.Decimal(68000),
      compareAtPrice: new Prisma.Decimal(85000),
      costPrice: new Prisma.Decimal(28000),
      trackInventory: true,
      inventoryCount: 19,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 17: Digital Tokens
    {
      name: "E-Commerce Micro-Interactions & Motion Kit",
      slug: "ecommerce-motion-kit",
      categoryId: categoryDigital.id,
      description:
        "Production-ready Framer Motion and CSS keyframe recipes for luxury boutique shopping carts.",
      sku: "DS-MOT-17",
      price: new Prisma.Decimal(78000),
      compareAtPrice: new Prisma.Decimal(95000),
      costPrice: new Prisma.Decimal(18000),
      trackInventory: false,
      inventoryCount: 999,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 18: Packaging Objects
    {
      name: "Atelier Heritage Monogram Wax Seal Kit",
      slug: "monogram-wax-seal-kit",
      categoryId: categoryPackaging.id,
      description:
        "Solid brass seal die with turned walnut handle, wickless wax sticks, and melting spoon.",
      sku: "OBJ-WAX-18",
      price: new Prisma.Decimal(35000),
      compareAtPrice: null,
      costPrice: new Prisma.Decimal(15000),
      trackInventory: true,
      inventoryCount: 40,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 19: Editorial Books
    {
      name: "Artisanal Japanese Binding Monograph",
      slug: "japanese-binding-monograph",
      categoryId: categoryEditorial.id,
      description:
        "Four-hole stab binding monograph bound in hand-dyed indigo washi paper with raw silk thread.",
      sku: "BOK-JAP-19",
      price: new Prisma.Decimal(160000),
      compareAtPrice: new Prisma.Decimal(190000),
      costPrice: new Prisma.Decimal(70000),
      trackInventory: true,
      inventoryCount: 11,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 20: Brand Systems
    {
      name: "Corporate Visual Identity Audit & Benchmark Kit",
      slug: "visual-identity-audit-kit",
      categoryId: categoryBrand.id,
      description:
        "Comprehensive methodology framework, scorecard spreadsheets, and stakeholder interview decks.",
      sku: "ID-AUD-20",
      price: new Prisma.Decimal(90000),
      compareAtPrice: new Prisma.Decimal(110000),
      costPrice: new Prisma.Decimal(25000),
      trackInventory: false,
      inventoryCount: 999,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 21: Digital Tokens
    {
      name: "Kinetic Typography Motion Title Pack",
      slug: "kinetic-motion-title-pack",
      categoryId: categoryDigital.id,
      description:
        "After Effects and Premiere Pro kinetic typography presets tailored for editorial campaigns.",
      sku: "MOT-TYP-21",
      price: new Prisma.Decimal(62000),
      compareAtPrice: new Prisma.Decimal(80000),
      costPrice: new Prisma.Decimal(15000),
      trackInventory: false,
      inventoryCount: 999,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
      ],
    },
    // Product 22: UNASSIGNED CATEGORY (categoryId is null)
    {
      name: "Studio Portfolio Advisory & Positioning Session",
      slug: "studio-portfolio-advisory-session",
      categoryId: null, // 2nd null category product (maintaining ~91% categorized)
      description:
        "60-minute intensive portfolio critique and agency positioning guidance with our senior design partners.",
      sku: "CON-ADV-22",
      price: new Prisma.Decimal(65000),
      compareAtPrice: null,
      costPrice: new Prisma.Decimal(0),
      trackInventory: false,
      inventoryCount: 30,
      isFeatured: false,
      images: [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
      ],
    },
  ];

  for (const prod of productsData) {
    await prisma.product.upsert({
      where: {
        businessId_slug: { businessId: business.id, slug: prod.slug },
      },
      update: {
        ...prod,
        status: "ACTIVE",
        requiresShipping: prod.categoryId !== null,
      },
      create: {
        businessId: business.id,
        ...prod,
        status: "ACTIVE",
        requiresShipping: prod.categoryId !== null,
      },
    });
  }

  console.info(
    "✨ Demo Studio 'Atelier Forma' seeded successfully with 4 categories and 22 products (~91% categorized)!",
  );
}
