import { z } from "zod";

export const productStatusEnum = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(100),
  description: z.string().trim().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParamsSchema = z.object({
  id: z.string().min(1, "Category ID is required"),
});

export const productOptionSchema = z.object({
  name: z.string().trim().min(1, "Option name is required"),
  values: z
    .array(z.string().trim().min(1))
    .min(1, "Option must have at least one value"),
});

export const productVariantInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Variant title is required"),
  sku: z.string().trim().max(100).optional().nullable(),
  price: z.number().positive("Variant price must be positive"),
  compareAtPrice: z
    .number()
    .positive("Compare at price must be positive")
    .optional()
    .nullable(),
  costPrice: z
    .number()
    .nonnegative("Cost price must be non-negative")
    .optional()
    .nullable(),
  inventoryCount: z.number().int().nonnegative().default(0),
  options: z.record(z.string(), z.string()), // e.g. { "Size": "Large", "Color": "Red" }
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200),
  categoryId: z.string().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  sku: z.string().trim().max(100).optional().nullable(),
  price: z.number().positive("Price must be greater than 0"),
  compareAtPrice: z
    .number()
    .positive("Compare at price must be positive")
    .optional()
    .nullable(),
  costPrice: z
    .number()
    .nonnegative("Cost price must be non-negative")
    .optional()
    .nullable(),
  trackInventory: z.boolean().default(true),
  inventoryCount: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(5),
  allowBackorder: z.boolean().default(false),
  hasVariants: z.boolean().default(false),
  options: z.array(productOptionSchema).optional().nullable(),
  variants: z.array(productVariantInputSchema).optional().nullable(),
  images: z.array(z.string().url()).default([]),
  status: productStatusEnum.default("ACTIVE"),
  isFeatured: z.boolean().default(false),
  attributes: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export const productIdParamsSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  status: productStatusEnum.optional(),
  isFeatured: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean().optional(),
  ),
  lowStock: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean().optional(),
  ),
  sortBy: z
    .enum(["createdAt", "name", "price", "inventoryCount"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const validateCartStockSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().nullable(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "Cart must have at least one item"),
});

export const storefrontProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(24),
  search: z.string().optional(),
  categorySlug: z.string().optional(),
  isFeatured: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean().optional(),
  ),
  sortBy: z.enum(["createdAt", "name", "price"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const storefrontSlugParamsSchema = z.object({
  slug: z.string().min(1, "Storefront slug is required"),
});

export const storefrontProductSlugParamsSchema = z.object({
  slug: z.string().min(1, "Storefront slug is required"),
  productSlug: z.string().min(1, "Product slug is required"),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ProductOption = z.infer<typeof productOptionSchema>;
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type ValidateCartStockInput = z.infer<typeof validateCartStockSchema>;
export type StorefrontProductsQuery = z.infer<
  typeof storefrontProductsQuerySchema
>;
