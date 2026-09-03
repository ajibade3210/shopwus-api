import type { Product, ProductStatus, ProductVariant } from "@prisma/client";
import { toFinancialAmount } from "../../../utils/currency.utils";

export interface ProductVariantDto {
  id: string;
  productId: string;
  title: string;
  sku?: string | null;
  price: number;
  priceKobo?: number;
  compareAtPrice?: number | null;
  compareAtPriceKobo?: number | null;
  costPrice?: number | null;
  costPriceKobo?: number | null;
  inventoryCount: number;
  options: Record<string, string>;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  businessId?: string;
  description?: string | null;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductDto {
  id: string;
  businessId: string;
  categoryId?: string | null;
  category?: CategoryDto | null;
  name: string;
  slug: string;
  description?: string | null;
  sku?: string | null;
  price: number;
  priceKobo?: number;
  compareAtPrice?: number | null;
  compareAtPriceKobo?: number | null;
  costPrice?: number | null;
  costPriceKobo?: number | null;
  trackInventory: boolean;
  inventoryCount: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  hasVariants: boolean;
  options?: unknown;
  variants?: ProductVariantDto[];
  images: string[];
  status: ProductStatus;
  isFeatured: boolean;
  attributes?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponseDto {
  items: ProductDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ── Serializers ───────────────────────────────────────────────────────────────

export function serializeProductVariant(v: ProductVariant): ProductVariantDto {
  return {
    id: v.id,
    productId: v.productId,
    title: v.title,
    sku: v.sku,
    ...toFinancialAmount(v.price, "price"),
    ...toFinancialAmount(v.compareAtPrice, "compareAtPrice"),
    ...toFinancialAmount(v.costPrice, "costPrice"),
    inventoryCount: v.inventoryCount,
    options: (v.options as Record<string, string>) || {},
    imageUrl: v.imageUrl,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

export function serializeCategory(c: {
  id: string;
  name: string;
  slug: string;
  businessId?: string;
  description?: string | null;
  imageUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): CategoryDto {
  return {
    id: c.id,
    businessId: c.businessId,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    createdAt: c.createdAt ? c.createdAt.toISOString() : undefined,
    updatedAt: c.updatedAt ? c.updatedAt.toISOString() : undefined,
  };
}

export function serializeProduct(
  p: Product & {
    category?: {
      id: string;
      name: string;
      slug: string;
      description?: string | null;
      imageUrl?: string | null;
      businessId?: string;
      createdAt?: Date;
      updatedAt?: Date;
    } | null;
    variants?: ProductVariant[];
  },
): ProductDto {
  return {
    id: p.id,
    businessId: p.businessId,
    categoryId: p.categoryId,
    category: p.category ? serializeCategory(p.category) : null,
    name: p.name,
    slug: p.slug,
    description: p.description,
    sku: p.sku,
    ...toFinancialAmount(p.price, "price"),
    ...toFinancialAmount(p.compareAtPrice, "compareAtPrice"),
    ...toFinancialAmount(p.costPrice, "costPrice"),
    trackInventory: p.trackInventory,
    inventoryCount: p.inventoryCount,
    lowStockThreshold: p.lowStockThreshold,
    allowBackorder: p.allowBackorder,
    hasVariants: p.hasVariants,
    options: p.options,
    variants: p.variants?.map(serializeProductVariant),
    images: p.images,
    status: p.status,
    isFeatured: p.isFeatured,
    attributes: p.attributes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
