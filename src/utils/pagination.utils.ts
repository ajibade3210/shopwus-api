import type { BuildPaginationMetaParams, PaginationMeta } from "../types";

export function buildPaginationMeta({
  total,
  page,
  limit,
}: BuildPaginationMetaParams): PaginationMeta {
  const safeLimit = limit > 0 ? limit : 10;
  const totalPages = Math.ceil(total / safeLimit);

  return {
    total,
    page,
    limit: safeLimit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
