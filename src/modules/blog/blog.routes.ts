import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as blogController from "./blog.controller";
import * as blogSchema from "./schema/blog.schema";

export async function blogRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    "/posts",
    {
      schema: blogSchema.listBlogPostsRouteSchema,
    },
    blogController.listBlogPostsHandler,
  );

  typedApp.get(
    "/posts/:slug",
    {
      schema: blogSchema.getBlogPostRouteSchema,
    },
    blogController.getBlogPostHandler,
  );

  typedApp.get(
    "/posts/:slug/related",
    {
      schema: blogSchema.getRelatedBlogPostsRouteSchema,
    },
    blogController.getRelatedBlogPostsHandler,
  );
}
