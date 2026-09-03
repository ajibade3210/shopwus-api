import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate, requireBusiness } from "../../middlewares/auth";
import { rateLimit } from "../../utils";
import * as productController from "./product.controller";
import * as productSchema from "./schema/product.schema";

export async function productRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // ---------------------------------------------------------------------------
  // PUBLIC STOREFRONT ROUTES (Rate limited, no auth required)
  // ---------------------------------------------------------------------------
  typedApp.get(
    "/storefront/:slug",
    {
      schema: {
        params: productSchema.storefrontSlugParamsSchema,
        querystring: productSchema.storefrontProductsQuerySchema,
      },
      ...rateLimit(120, "1 minute"),
    },
    productController.getStorefrontProductsHandler,
  );

  typedApp.get(
    "/storefront/:slug/p/:productSlug",
    {
      schema: {
        params: productSchema.storefrontProductSlugParamsSchema,
      },
      ...rateLimit(120, "1 minute"),
    },
    productController.getStorefrontProductDetailsHandler,
  );

  typedApp.post(
    "/storefront/:slug/cart/validate-stock",
    {
      schema: {
        params: productSchema.storefrontSlugParamsSchema,
        body: productSchema.validateCartStockSchema,
      },
      ...rateLimit(60, "1 minute"),
    },
    productController.validateCartStockHandler,
  );

  // ---------------------------------------------------------------------------
  // AUTHENTICATED VENDOR ROUTES
  // ---------------------------------------------------------------------------

  // Summary & Categories
  typedApp.get(
    "/summary",
    {
      preHandler: [authenticate, requireBusiness],
    },
    productController.getProductSummaryHandler,
  );

  typedApp.get(
    "/categories",
    {
      preHandler: [authenticate, requireBusiness],
    },
    productController.listCategoriesHandler,
  );

  typedApp.post(
    "/categories",
    {
      schema: { body: productSchema.createCategorySchema },
      preHandler: [authenticate, requireBusiness],
    },
    productController.createCategoryHandler,
  );

  typedApp.put(
    "/categories/:id",
    {
      schema: {
        params: productSchema.categoryIdParamsSchema,
        body: productSchema.updateCategorySchema,
      },
      preHandler: [authenticate, requireBusiness],
    },
    productController.updateCategoryHandler,
  );

  typedApp.delete(
    "/categories/:id",
    {
      schema: { params: productSchema.categoryIdParamsSchema },
      preHandler: [authenticate, requireBusiness],
    },
    productController.deleteCategoryHandler,
  );

  // Products CRUD
  typedApp.get(
    "/",
    {
      schema: { querystring: productSchema.listProductsQuerySchema },
      preHandler: [authenticate, requireBusiness],
    },
    productController.listProductsHandler,
  );

  typedApp.post(
    "/",
    {
      schema: { body: productSchema.createProductSchema },
      preHandler: [authenticate, requireBusiness],
    },
    productController.createProductHandler,
  );

  typedApp.get(
    "/:id",
    {
      schema: { params: productSchema.productIdParamsSchema },
      preHandler: [authenticate, requireBusiness],
    },
    productController.getProductHandler,
  );

  typedApp.put(
    "/:id",
    {
      schema: {
        params: productSchema.productIdParamsSchema,
        body: productSchema.updateProductSchema,
      },
      preHandler: [authenticate, requireBusiness],
    },
    productController.updateProductHandler,
  );

  typedApp.delete(
    "/:id",
    {
      schema: { params: productSchema.productIdParamsSchema },
      preHandler: [authenticate, requireBusiness],
    },
    productController.deleteProductHandler,
  );
}
