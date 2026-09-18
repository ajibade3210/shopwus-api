import { Prisma } from "@prisma/client";
import { NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { generateSlug } from "../../../utils";
import type {
  CreateCategoryInput,
  CreateProductInput,
  ListProductsQuery,
  StorefrontProductsQuery,
  UpdateCategoryInput,
  UpdateProductInput,
  ValidateCartStockInput,
} from "../schema/product.schema";

// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------

export async function listCategoriesService(businessId: string) {
  return prisma.category.findMany({
    where: { businessId },
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createCategoryService(
  businessId: string,
  input: CreateCategoryInput,
) {
  let baseSlug = generateSlug(input.name);
  if (!baseSlug) baseSlug = "category";

  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.category.findUnique({
      where: {
        businessId_slug: { businessId, slug },
      },
    });
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return prisma.category.create({
    data: {
      businessId,
      name: input.name,
      slug,
      description: input.description,
      imageUrl: input.imageUrl,
    },
  });
}

export async function updateCategoryService(
  categoryId: string,
  businessId: string,
  input: UpdateCategoryInput,
) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, businessId },
  });
  if (!category) {
    throw new NotFoundError("Category not found");
  }

  let slug = category.slug;
  if (input.name && input.name !== category.name) {
    const baseSlug = generateSlug(input.name);
    slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await prisma.category.findFirst({
        where: {
          businessId,
          slug,
          NOT: { id: categoryId },
        },
      });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  return prisma.category.update({
    where: { id: categoryId },
    data: {
      ...input,
      ...(input.name ? { slug } : {}),
    },
  });
}

export async function deleteCategoryService(
  categoryId: string,
  businessId: string,
) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, businessId },
  });
  if (!category) {
    throw new NotFoundError("Category not found");
  }

  return prisma.category.delete({
    where: { id: categoryId },
  });
}

// ---------------------------------------------------------------------------
// VENDOR PRODUCT MANAGEMENT
// ---------------------------------------------------------------------------

export async function listProductsService(
  businessId: string,
  query: ListProductsQuery,
) {
  const {
    page,
    limit,
    search,
    categoryId,
    status,
    isFeatured,
    lowStock,
    sortBy,
    sortOrder,
  } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    businessId,
  };

  if (status) {
    where.status = status;
  } else {
    where.status = { not: "ARCHIVED" };
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (isFeatured !== undefined) {
    where.isFeatured = isFeatured;
  }

  if (lowStock) {
    where.trackInventory = true;
    where.inventoryCount = { lte: 5 };
  }

  if (search) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: products,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + products.length < total,
    },
  };
}

export async function getProductSummaryService(businessId: string) {
  const [total, active, lowStock, outOfStock] = await Promise.all([
    prisma.product.count({
      where: { businessId, status: { not: "ARCHIVED" } },
    }),
    prisma.product.count({ where: { businessId, status: "ACTIVE" } }),
    prisma.product.count({
      where: {
        businessId,
        status: "ACTIVE",
        trackInventory: true,
        inventoryCount: { gt: 0, lte: 5 },
      },
    }),
    prisma.product.count({
      where: {
        businessId,
        status: "ACTIVE",
        trackInventory: true,
        inventoryCount: { lte: 0 },
      },
    }),
  ]);

  return {
    total,
    active,
    lowStock,
    outOfStock,
  };
}

export async function getProductByIdService(id: string, businessId: string) {
  const product = await prisma.product.findFirst({
    where: { id, businessId },
    include: {
      category: true,
      variants: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return product;
}

export async function createProductService(
  businessId: string,
  input: CreateProductInput,
) {
  let baseSlug = generateSlug(input.name);
  if (!baseSlug) baseSlug = "product";

  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.product.findUnique({
      where: {
        businessId_slug: { businessId, slug },
      },
    });
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const hasVariants = Boolean(
    input.hasVariants && input.variants && input.variants.length > 0,
  );

  // If variants exist, auto-aggregate parent inventory count and base price
  let inventoryCount = input.inventoryCount;
  let price = input.price;
  const compareAtPrice = input.compareAtPrice;

  if (hasVariants && input.variants) {
    inventoryCount = input.variants.reduce(
      (acc, v) => acc + (v.inventoryCount || 0),
      0,
    );
    const minVariantPrice = Math.min(...input.variants.map((v) => v.price));
    if (minVariantPrice > 0) {
      price = minVariantPrice;
    }
  }

  return prisma.product.create({
    data: {
      businessId,
      name: input.name,
      slug,
      categoryId: input.categoryId || null,
      description: input.description || null,
      sku: input.sku || null,
      price: new Prisma.Decimal(price),
      compareAtPrice: compareAtPrice
        ? new Prisma.Decimal(compareAtPrice)
        : null,
      costPrice: input.costPrice ? new Prisma.Decimal(input.costPrice) : null,
      trackInventory: input.trackInventory,
      inventoryCount,
      lowStockThreshold: input.lowStockThreshold,
      allowBackorder: input.allowBackorder,
      hasVariants,
      options: input.options
        ? (input.options as Prisma.InputJsonValue)
        : undefined,
      images: input.images,
      status: input.status,
      isFeatured: input.isFeatured,
      attributes: input.attributes
        ? (input.attributes as Prisma.InputJsonValue)
        : undefined,
      variants:
        hasVariants && input.variants
          ? {
              create: input.variants.map((v) => ({
                title: v.title,
                sku: v.sku || null,
                price: new Prisma.Decimal(v.price),
                compareAtPrice: v.compareAtPrice
                  ? new Prisma.Decimal(v.compareAtPrice)
                  : null,
                costPrice: v.costPrice ? new Prisma.Decimal(v.costPrice) : null,
                inventoryCount: v.inventoryCount || 0,
                options: v.options as Prisma.InputJsonValue,
                imageUrl: v.imageUrl || null,
              })),
            }
          : undefined,
    },
    include: {
      category: true,
      variants: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function updateProductService(
  id: string,
  businessId: string,
  input: UpdateProductInput,
) {
  const product = await prisma.product.findFirst({
    where: { id, businessId },
    include: { variants: true },
  });
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  let slug = product.slug;
  if (input.name && input.name !== product.name) {
    const baseSlug = generateSlug(input.name);
    slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await prisma.product.findFirst({
        where: {
          businessId,
          slug,
          NOT: { id },
        },
      });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  const hasVariants =
    input.hasVariants !== undefined ? input.hasVariants : product.hasVariants;

  let inventoryCount =
    input.inventoryCount !== undefined
      ? input.inventoryCount
      : product.inventoryCount;

  let price = input.price !== undefined ? input.price : Number(product.price);

  const compareAtPrice =
    input.compareAtPrice !== undefined
      ? input.compareAtPrice
      : product.compareAtPrice
        ? Number(product.compareAtPrice)
        : null;

  // If variants provided, calculate aggregate inventory and price
  if (hasVariants && input.variants && input.variants.length > 0) {
    inventoryCount = input.variants.reduce(
      (acc, v) => acc + (v.inventoryCount || 0),
      0,
    );
    const minVariantPrice = Math.min(...input.variants.map((v) => v.price));
    if (minVariantPrice > 0) {
      price = minVariantPrice;
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Sync variants if hasVariants is true
    if (hasVariants && input.variants) {
      const incomingVariantIds = input.variants
        .map((v) => v.id)
        .filter(Boolean) as string[];

      // Delete removed variants
      await tx.productVariant.deleteMany({
        where: {
          productId: id,
          id: { notIn: incomingVariantIds },
        },
      });

      // Upsert / update each variant
      for (const v of input.variants) {
        if (v.id) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              title: v.title,
              sku: v.sku || null,
              price: new Prisma.Decimal(v.price),
              compareAtPrice: v.compareAtPrice
                ? new Prisma.Decimal(v.compareAtPrice)
                : null,
              costPrice: v.costPrice ? new Prisma.Decimal(v.costPrice) : null,
              inventoryCount: v.inventoryCount || 0,
              options: v.options as Prisma.InputJsonValue,
              imageUrl: v.imageUrl || null,
            },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id,
              title: v.title,
              sku: v.sku || null,
              price: new Prisma.Decimal(v.price),
              compareAtPrice: v.compareAtPrice
                ? new Prisma.Decimal(v.compareAtPrice)
                : null,
              costPrice: v.costPrice ? new Prisma.Decimal(v.costPrice) : null,
              inventoryCount: v.inventoryCount || 0,
              options: v.options as Prisma.InputJsonValue,
              imageUrl: v.imageUrl || null,
            },
          });
        }
      }
    } else if (input.hasVariants === false) {
      // If variants toggled off, remove existing variants
      await tx.productVariant.deleteMany({
        where: { productId: id },
      });
    }

    // 2. Update parent product
    return tx.product.update({
      where: { id },
      data: {
        ...input,
        ...(input.name ? { slug } : {}),
        price: new Prisma.Decimal(price),
        compareAtPrice: compareAtPrice
          ? new Prisma.Decimal(compareAtPrice)
          : null,
        costPrice:
          input.costPrice !== undefined
            ? input.costPrice
              ? new Prisma.Decimal(input.costPrice)
              : null
            : undefined,
        inventoryCount,
        hasVariants,
        options: input.options
          ? (input.options as Prisma.InputJsonValue)
          : undefined,
        attributes: input.attributes
          ? (input.attributes as Prisma.InputJsonValue)
          : undefined,
        variants: undefined, // Handled separately in transaction
      },
      include: {
        category: true,
        variants: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  });
}

export async function deleteProductService(id: string, businessId: string) {
  const product = await prisma.product.findFirst({
    where: { id, businessId },
  });
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  // Soft delete / archive product so historical orders retain integrity
  return prisma.product.update({
    where: { id },
    data: {
      status: "ARCHIVED",
    },
  });
}

// ---------------------------------------------------------------------------
// PUBLIC STOREFRONT PRODUCT QUERIES
// ---------------------------------------------------------------------------

export async function getStorefrontProductsService(
  studioSlug: string,
  query: StorefrontProductsQuery,
) {
  const business = await prisma.business.findUnique({
    where: { slug: studioSlug },
    select: { id: true, businessType: true },
  });

  if (!business) {
    throw new NotFoundError("Storefront not found");
  }

  const { page, limit, search, categorySlug, isFeatured, sortBy, sortOrder } =
    query;
  const skip = (page - 1) * limit;

  // Check if business has active products
  const productCount = await prisma.product.count({
    where: { businessId: business.id, status: "ACTIVE" },
  });

  // Fallback for businesses with zero products that offer services
  if (productCount === 0) {
    const totalServicesCount = await prisma.service.count({
      where: { businessId: business.id },
    });

    if (totalServicesCount > 0) {
      const serviceWhere: Prisma.ServiceWhereInput = {
        businessId: business.id,
      };

    if (isFeatured !== undefined) {
      serviceWhere.isFeatured = isFeatured;
    }

    if (categorySlug) {
      // Decode slug to match case/spaces loosely
      const normalizedCategory = categorySlug.replace(/-/g, " ");
      serviceWhere.category = { contains: normalizedCategory, mode: "insensitive" };
    }

    if (search) {
      const term = search.trim();
      serviceWhere.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { category: { contains: term, mode: "insensitive" } },
      ];
    }

    const [services, totalServices, categories] = await Promise.all([
      prisma.service.findMany({
        where: serviceWhere,
        skip,
        take: limit,
        orderBy: sortBy === "price" ? { price: sortOrder } : { createdAt: sortOrder },
      }),
      prisma.service.count({ where: serviceWhere }),
      prisma.category.findMany({
        where: { businessId: business.id },
        select: { id: true, name: true, slug: true, imageUrl: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // Map Service items into Product-compatible catalog items
    const items = services.map((s) => ({
      id: s.id,
      businessId: s.businessId,
      categoryId: null,
      name: s.name,
      slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: s.description,
      sku: null,
      price: new Prisma.Decimal(s.price ? Number(s.price) : s.minPrice ? Number(s.minPrice) : 0),
      compareAtPrice: null,
      costPrice: null,
      trackInventory: false,
      inventoryCount: 999,
      lowStockThreshold: 0,
      allowBackorder: true,
      hasVariants: false,
      options: {} as Prisma.JsonValue,
      images: [] as string[],
      status: "ACTIVE" as const,
      isFeatured: s.isFeatured,
      attributes: {
        priceType: s.priceType,
        minPrice: s.minPrice ? Number(s.minPrice) : null,
        maxPrice: s.maxPrice ? Number(s.maxPrice) : null,
        isService: true,
      } as Prisma.JsonValue,
      requiresShipping: false,
      weightKg: null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      category: s.category
        ? {
            id: `svc-cat-${s.category}`,
            name: s.category,
            slug: s.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          }
        : null,
      variants: [],
    }));

    return {
      items,
      categories,
      meta: {
        total: totalServices,
        page,
        limit,
        totalPages: Math.ceil(totalServices / limit),
        hasMore: skip + items.length < totalServices,
      },
    };
    }
  }

  const where: Prisma.ProductWhereInput = {
    businessId: business.id,
    status: "ACTIVE",
  };

  if (isFeatured !== undefined) {
    where.isFeatured = isFeatured;
  }

  if (categorySlug) {
    where.category = {
      slug: categorySlug,
    };
  }

  if (search) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { category: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { businessId: business.id },
      select: { id: true, name: true, slug: true, imageUrl: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    items: products,
    categories,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + products.length < total,
    },
  };
}

export async function getStorefrontProductBySlugService(
  studioSlug: string,
  productSlug: string,
) {
  const business = await prisma.business.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });

  if (!business) {
    throw new NotFoundError("Storefront not found");
  }

  const product = await prisma.product.findFirst({
    where: {
      businessId: business.id,
      slug: productSlug,
      status: "ACTIVE",
    },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      variants: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return product;
}

export async function validateStorefrontCartStockService(
  studioSlug: string,
  input: ValidateCartStockInput,
) {
  const business = await prisma.business.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });

  if (!business) {
    throw new NotFoundError("Storefront not found");
  }

  const productIds = input.items.map((i) => i.productId);
  const variantIds = input.items
    .map((i) => i.variantId)
    .filter(Boolean) as string[];

  const [liveProducts, liveVariants] = await Promise.all([
    prisma.product.findMany({
      where: {
        businessId: business.id,
        id: { in: productIds },
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        price: true,
        trackInventory: true,
        inventoryCount: true,
        allowBackorder: true,
        hasVariants: true,
      },
    }),
    variantIds.length > 0
      ? prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            productId: true,
            title: true,
            price: true,
            inventoryCount: true,
          },
        })
      : [],
  ]);

  const productMap = new Map(liveProducts.map((p) => [p.id, p]));
  const variantMap = new Map(liveVariants.map((v) => [v.id, v]));

  const issues: Array<{
    productId: string;
    variantId?: string | null;
    productName: string;
    issue: "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "PRODUCT_UNAVAILABLE";
    requestedQty: number;
    availableQty: number;
  }> = [];

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      issues.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: "Unavailable item",
        issue: "PRODUCT_UNAVAILABLE",
        requestedQty: item.quantity,
        availableQty: 0,
      });
      continue;
    }

    if (item.variantId) {
      const variant = variantMap.get(item.variantId);
      if (!variant || variant.productId !== product.id) {
        issues.push({
          productId: product.id,
          variantId: item.variantId,
          productName: `${product.name} (Variant unavailable)`,
          issue: "PRODUCT_UNAVAILABLE",
          requestedQty: item.quantity,
          availableQty: 0,
        });
        continue;
      }

      if (product.trackInventory && !product.allowBackorder) {
        if (variant.inventoryCount <= 0) {
          issues.push({
            productId: product.id,
            variantId: item.variantId,
            productName: `${product.name} • ${variant.title}`,
            issue: "OUT_OF_STOCK",
            requestedQty: item.quantity,
            availableQty: 0,
          });
        } else if (variant.inventoryCount < item.quantity) {
          issues.push({
            productId: product.id,
            variantId: item.variantId,
            productName: `${product.name} • ${variant.title}`,
            issue: "INSUFFICIENT_STOCK",
            requestedQty: item.quantity,
            availableQty: variant.inventoryCount,
          });
        }
      }
    } else {
      if (product.trackInventory && !product.allowBackorder) {
        if (product.inventoryCount <= 0) {
          issues.push({
            productId: product.id,
            productName: product.name,
            issue: "OUT_OF_STOCK",
            requestedQty: item.quantity,
            availableQty: 0,
          });
        } else if (product.inventoryCount < item.quantity) {
          issues.push({
            productId: product.id,
            productName: product.name,
            issue: "INSUFFICIENT_STOCK",
            requestedQty: item.quantity,
            availableQty: product.inventoryCount,
          });
        }
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    checkedAt: new Date().toISOString(),
  };
}
