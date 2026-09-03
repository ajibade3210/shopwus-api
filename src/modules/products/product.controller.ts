import type { FastifyReply, FastifyRequest } from "fastify";
import { serializeCategory, serializeProduct } from "./dto/product.dto";
import type {
  CreateCategoryInput,
  CreateProductInput,
  ListProductsQuery,
  StorefrontProductsQuery,
  UpdateCategoryInput,
  UpdateProductInput,
  ValidateCartStockInput,
} from "./schema/product.schema";
import {
  createCategoryService,
  createProductService,
  deleteCategoryService,
  deleteProductService,
  getProductByIdService,
  getProductSummaryService,
  getStorefrontProductBySlugService,
  getStorefrontProductsService,
  listCategoriesService,
  listProductsService,
  updateCategoryService,
  updateProductService,
  validateStorefrontCartStockService,
} from "./services/product.service";

// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------

export async function listCategoriesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await listCategoriesService(request.businessId);
  return reply.success(result.map(serializeCategory), "Categories retrieved");
}

export async function createCategoryHandler(
  request: FastifyRequest<{ Body: CreateCategoryInput }>,
  reply: FastifyReply,
) {
  const result = await createCategoryService(request.businessId, request.body);
  return reply.success(serializeCategory(result), "Category created", 201);
}

export async function updateCategoryHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateCategoryInput;
  }>,
  reply: FastifyReply,
) {
  const result = await updateCategoryService(
    request.params.id,
    request.businessId,
    request.body,
  );
  return reply.success(serializeCategory(result), "Category updated");
}

export async function deleteCategoryHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await deleteCategoryService(request.params.id, request.businessId);
  return reply.success(null, "Category deleted");
}

// ---------------------------------------------------------------------------
// VENDOR PRODUCTS
// ---------------------------------------------------------------------------

export async function listProductsHandler(
  request: FastifyRequest<{ Querystring: ListProductsQuery }>,
  reply: FastifyReply,
) {
  const result = await listProductsService(request.businessId, request.query);
  return reply.success(
    {
      items: result.items.map(serializeProduct),
      meta: result.meta,
    },
    "Products retrieved",
  );
}

export async function getProductSummaryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await getProductSummaryService(request.businessId);
  return reply.success(result, "Product summary retrieved");
}

export async function getProductHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const result = await getProductByIdService(
    request.params.id,
    request.businessId,
  );
  return reply.success(serializeProduct(result), "Product retrieved");
}

export async function createProductHandler(
  request: FastifyRequest<{ Body: CreateProductInput }>,
  reply: FastifyReply,
) {
  const result = await createProductService(request.businessId, request.body);
  return reply.success(serializeProduct(result), "Product created", 201);
}

export async function updateProductHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateProductInput }>,
  reply: FastifyReply,
) {
  const result = await updateProductService(
    request.params.id,
    request.businessId,
    request.body,
  );
  return reply.success(serializeProduct(result), "Product updated");
}

export async function deleteProductHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await deleteProductService(request.params.id, request.businessId);
  return reply.success(null, "Product deleted");
}

// ---------------------------------------------------------------------------
// PUBLIC STOREFRONT & CART VALIDATION
// ---------------------------------------------------------------------------

export async function getStorefrontProductsHandler(
  request: FastifyRequest<{
    Params: { slug: string };
    Querystring: StorefrontProductsQuery;
  }>,
  reply: FastifyReply,
) {
  const result = await getStorefrontProductsService(
    request.params.slug,
    request.query,
  );
  return reply.success(
    {
      items: result.items.map(serializeProduct),
      meta: result.meta,
    },
    "Storefront products retrieved",
  );
}

export async function getStorefrontProductDetailsHandler(
  request: FastifyRequest<{
    Params: { slug: string; productSlug: string };
  }>,
  reply: FastifyReply,
) {
  const result = await getStorefrontProductBySlugService(
    request.params.slug,
    request.params.productSlug,
  );
  return reply.success(serializeProduct(result), "Product details retrieved");
}

export async function validateCartStockHandler(
  request: FastifyRequest<{
    Params: { slug: string };
    Body: ValidateCartStockInput;
  }>,
  reply: FastifyReply,
) {
  const result = await validateStorefrontCartStockService(
    request.params.slug,
    request.body,
  );
  return reply.success(result, "Cart stock validated");
}
