import crypto from "node:crypto";
import { prisma as defaultPrisma } from "../lib/prisma";
import type { SequenceDbClient, SequenceOptions } from "../types";

// SequenceDbClient and SequenceOptions are defined in src/types/utils.ts
// Re-exported here for backwards compatibility
export type { SequenceDbClient, SequenceOptions };

/**
 * Format a sequence number with a standard prefix, year, and 0-padded digits.
 * Example: formatDocumentNumber("INV", 2026, 7) => "INV-2026-0007"
 */
export function formatDocumentNumber(
  prefix: string,
  year: number,
  sequenceNumber: number,
  padLength = 4,
): string {
  return `${prefix}-${year}-${String(sequenceNumber).padStart(padLength, "0")}`;
}

/**
 * Atomically increments and returns the next sequence number for a given tenant, document type, and year.
 * Uses PostgreSQL row-level locking via INSERT ... ON CONFLICT DO UPDATE RETURNING.
 * Safe against race conditions and concurrent requests.
 */
export async function getNextSequenceNumber(
  businessId: string,
  options: SequenceOptions = {},
): Promise<number> {
  const type = options.type || "INVOICE";
  const year = options.year || new Date().getFullYear();
  const db = options.client || defaultPrisma;
  const id = crypto.randomUUID();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);

  if (type === "INVOICE") {
    const result = await db.$queryRaw<Array<{ lastNumber: number }>>`
      INSERT INTO "DocumentSequence" ("id", "businessId", "type", "year", "lastNumber", "updatedAt", "createdAt")
      VALUES (
        ${id},
        ${businessId},
        ${type},
        ${year},
        COALESCE((
          SELECT COUNT(*)::int 
          FROM "Invoice" 
          WHERE "businessId" = ${businessId} 
            AND "createdAt" >= ${yearStart}
        ), 0) + 1,
        NOW(),
        NOW()
      )
      ON CONFLICT ("businessId", "type", "year")
      DO UPDATE SET "lastNumber" = "DocumentSequence"."lastNumber" + 1, "updatedAt" = NOW()
      RETURNING "lastNumber"
    `;

    return Number(result[0]?.lastNumber || 1);
  }

  const result = await db.$queryRaw<Array<{ lastNumber: number }>>`
    INSERT INTO "DocumentSequence" ("id", "businessId", "type", "year", "lastNumber", "updatedAt", "createdAt")
    VALUES (
      ${id},
      ${businessId},
      ${type},
      ${year},
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT ("businessId", "type", "year")
    DO UPDATE SET "lastNumber" = "DocumentSequence"."lastNumber" + 1, "updatedAt" = NOW()
    RETURNING "lastNumber"
  `;

  return Number(result[0]?.lastNumber || 1);
}

/**
 * Atomically generates and formats the next document number string.
 * Example: generateDocumentNumber("biz_123", "INV") => "INV-2026-0001"
 */
export async function generateDocumentNumber(
  businessId: string,
  prefix = "INV",
  options: SequenceOptions = {},
): Promise<string> {
  const year = options.year || new Date().getFullYear();
  const nextNum = await getNextSequenceNumber(businessId, options);
  return formatDocumentNumber(prefix, year, nextNum);
}
