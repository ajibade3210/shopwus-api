import { z } from "zod";

export const blogCategoryEnum = z.enum([
  "all",
  "pricing-strategy",
  "operations",
  "storefront",
  "invoicing",
  "growth",
]);

export const listBlogPostsQuerySchema = z.object({
  category: blogCategoryEnum.optional().default("all"),
});

export const blogSlugParamsSchema = z.object({
  slug: z.string().min(1, "Post slug is required"),
});

export type ListBlogPostsQuery = z.infer<typeof listBlogPostsQuerySchema>;
export type BlogSlugParams = z.infer<typeof blogSlugParamsSchema>;

export const listBlogPostsRouteSchema = {
  querystring: listBlogPostsQuerySchema,
};

export const getBlogPostRouteSchema = {
  params: blogSlugParamsSchema,
};

export const getRelatedBlogPostsRouteSchema = {
  params: blogSlugParamsSchema,
  querystring: z.object({
    limit: z.coerce.number().int().min(1).max(10).default(2),
  }),
};
