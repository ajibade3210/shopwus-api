import type { FastifyReply, FastifyRequest } from "fastify";
import type { BlogSlugParams, ListBlogPostsQuery } from "./schema/blog.schema";
import {
  getBlogPostBySlugService,
  getRelatedBlogPostsService,
  listBlogPostsService,
} from "./services/blog.service";

export async function listBlogPostsHandler(
  request: FastifyRequest<{ Querystring: ListBlogPostsQuery }>,
  reply: FastifyReply,
) {
  const result = await listBlogPostsService(request.query.category);
  return reply.success(result, "Blog posts retrieved");
}

export async function getBlogPostHandler(
  request: FastifyRequest<{ Params: BlogSlugParams }>,
  reply: FastifyReply,
) {
  const result = await getBlogPostBySlugService(request.params.slug);
  return reply.success(result, "Blog post retrieved");
}

export async function getRelatedBlogPostsHandler(
  request: FastifyRequest<{
    Params: BlogSlugParams;
    Querystring: { limit?: number };
  }>,
  reply: FastifyReply,
) {
  const result = await getRelatedBlogPostsService(
    request.params.slug,
    request.query.limit,
  );
  return reply.success(result, "Related blog posts retrieved");
}
