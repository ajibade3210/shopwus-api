import type { FastifyRequest } from "fastify";
import z from "zod";

export type TypedRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown,
  THeaders = unknown,
> = FastifyRequest<{
  Body: TBody;
  Querystring: TQuery;
  Params: TParams;
  Headers: THeaders;
}>;

export const ReqHeaderSchema = z.object({
  "x-longitude": z.string().optional().describe("User's longitude"),
  "x-latitude": z.string().optional().describe("User's latitude"),
});

export type ReqHeaders = z.infer<typeof ReqHeaderSchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
