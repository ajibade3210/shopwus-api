import { ValidationError } from "../lib/errors";

export const MAX_EXPORT_LIMIT = 3000;

/**
 * Throws a ValidationError if the total records count exceeds the safe maximum.
 */
export async function validateExportLimit(count: number): Promise<void> {
  if (count > MAX_EXPORT_LIMIT) {
    throw new ValidationError(
      `Export limit exceeded. Please narrow the date range or apply filters to reduce the number of records (maximum allowed: ${MAX_EXPORT_LIMIT}).`,
    );
  }
}

/**
 * Fetches data iteratively in chunks to avoid high database memory allocation and
 * optimize Garbage Collection.
 */
export async function fetchInChunks<T>(
  fetchPage: (skip: number, take: number) => Promise<T[]>,
  chunkSize = 1000,
): Promise<T[]> {
  const results: T[] = [];
  let skip = 0;
  while (true) {
    const chunk = await fetchPage(skip, chunkSize);
    results.push(...chunk);
    if (chunk.length < chunkSize) break;
    skip += chunkSize;
  }
  return results;
}
