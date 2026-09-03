import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type {
  ImportCustomerRecord,
  ImportCustomersInput,
} from "../schema/customer.schema";

export interface ParsedAttribute {
  key: string;
  value: string;
}

export interface SkippedRow {
  line: number;
  error: string;
}

/**
 * Parse and validate attributes from raw string (e.g. "Waist: 32 | Shoe Size: 10.5") or array.
 */
export function parseCustomerAttributes(
  rawAttributes?: unknown,
): ParsedAttribute[] {
  if (!rawAttributes) return [];

  let items: Array<{ key?: unknown; value?: unknown }> = [];

  if (typeof rawAttributes === "string") {
    const trimmed = rawAttributes.trim();
    if (!trimmed) return [];

    const pairs = trimmed.split("|");
    for (const pair of pairs) {
      const p = pair.trim();
      if (!p) continue;

      const firstColonIndex = p.indexOf(":");
      if (firstColonIndex === -1) {
        throw new Error(
          `Invalid attribute format "${p}". Expected "Key: Value".`,
        );
      }

      const key = p.slice(0, firstColonIndex).trim();
      const value = p.slice(firstColonIndex + 1).trim();

      if (!key && !value) continue; // prune completely empty pair

      if (!key) {
        throw new Error(`Attribute key cannot be empty in "${p}".`);
      }
      if (!value) {
        throw new Error(`Attribute value cannot be empty in "${p}".`);
      }

      items.push({ key, value });
    }
  } else if (Array.isArray(rawAttributes)) {
    items = rawAttributes;
  } else {
    throw new Error("Attributes must be a string or array of key-value pairs.");
  }

  // 1. Prune completely empty items (where both key and value are blank)
  const nonBlankItems: ParsedAttribute[] = [];
  for (const item of items) {
    const rawKey = typeof item?.key === "string" ? item.key.trim() : "";
    const rawVal = typeof item?.value === "string" ? item.value.trim() : "";

    if (!rawKey && !rawVal) {
      continue; // Silently prune
    }

    if (!rawKey) {
      throw new Error("Attribute key is required when value is provided.");
    }
    if (!rawVal) {
      throw new Error("Attribute value is required when key is provided.");
    }

    if (rawKey.includes("|")) {
      throw new Error(`Pipe (|) character is not allowed in key "${rawKey}".`);
    }
    if (rawVal.includes("|")) {
      throw new Error(
        `Pipe (|) character is not allowed in value "${rawVal}".`,
      );
    }

    if (rawKey.length > 50) {
      throw new Error(`Attribute key "${rawKey}" exceeds 50 character limit.`);
    }
    if (rawVal.length > 100) {
      throw new Error(
        `Attribute value for "${rawKey}" exceeds 100 character limit.`,
      );
    }

    nonBlankItems.push({ key: rawKey, value: rawVal });
  }

  // 2. Validate max 25 items constraint
  if (nonBlankItems.length > 25) {
    throw new Error(
      `Exceeded maximum 25 attributes limit (found ${nonBlankItems.length}).`,
    );
  }

  // 3. Deduplicate keys case-insensitively
  const seenKeys = new Set<string>();
  for (const attr of nonBlankItems) {
    const lowerKey = attr.key.toLowerCase();
    if (seenKeys.has(lowerKey)) {
      throw new Error(`Duplicate attribute key "${attr.key}".`);
    }
    seenKeys.add(lowerKey);
  }

  return nonBlankItems;
}

export async function importCustomersService(
  businessId: string,
  input: ImportCustomersInput,
) {
  const records: ImportCustomerRecord[] = Array.isArray(input)
    ? input
    : input.records;

  const results = [];
  const skipped: SkippedRow[] = [];

  for (let i = 0; i < records.length; i++) {
    const line = i + 2; // Human readable 1-based index (Header is line 1)
    const record = records[i];

    try {
      if (!record || typeof record !== "object") {
        skipped.push({ line, error: "Empty or invalid row structure." });
        continue;
      }

      const rawName = record.name ? String(record.name).trim() : "";
      const rawEmail = record.email
        ? String(record.email).toLowerCase().trim()
        : "";

      if (!rawName) {
        skipped.push({ line, error: "Customer name is required." });
        continue;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!rawEmail || !emailRegex.test(rawEmail)) {
        skipped.push({
          line,
          error: `Valid email is required (found "${record.email || ""}").`,
        });
        continue;
      }

      let parsedAttrs: ParsedAttribute[] | undefined;
      if (record.attributes !== undefined && record.attributes !== null) {
        parsedAttrs = parseCustomerAttributes(record.attributes);
      }

      const existing = await prisma.customer.findFirst({
        where: { businessId, email: rawEmail },
      });

      if (existing) {
        const updated = await prisma.customer.update({
          where: { id: existing.id },
          data: {
            name: rawName || existing.name,
            phone: record.phone?.trim() || existing.phone,
            company: record.company?.trim() || existing.company,
            notes: record.notes?.trim() || existing.notes,
            ...(parsedAttrs !== undefined
              ? { attributes: parsedAttrs as unknown as Prisma.InputJsonValue }
              : {}),
          },
          include: { services: true },
        });
        results.push(updated);
      } else {
        const created = await prisma.customer.create({
          data: {
            businessId,
            name: rawName,
            email: rawEmail,
            phone: record.phone?.trim(),
            company: record.company?.trim(),
            notes: record.notes?.trim(),
            ...(parsedAttrs !== undefined
              ? { attributes: parsedAttrs as unknown as Prisma.InputJsonValue }
              : {}),
            isActive: true,
          },
          include: { services: true },
        });

        await prisma.customerActivity.create({
          data: {
            businessId,
            customerId: created.id,
            type: "imported",
            description: "Customer imported from CSV batch.",
          },
        });

        results.push(created);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to import row.";
      skipped.push({ line, error: message });
    }
  }

  return {
    totalRows: records.length,
    imported: results.length,
    importedCount: results.length,
    skipped,
    customers: results.map((c) => ({
      id: c.id,
      businessId: c.businessId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      totalRevenue: Number(c.totalRevenue),
      notes: c.notes,
      attributes: (c.attributes as unknown as ParsedAttribute[]) || null,
      isActive: c.isActive,
      services: c.services.map((s) => ({
        id: s.id,
        businessId: s.businessId,
        customerId: s.customerId,
        name: s.name,
        service: s.service,
        amount: Number(s.amount),
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  };
}

export async function exportCustomersCsvService(
  businessId: string,
  query: { q?: string; isActive?: boolean },
): Promise<string> {
  const where: Prisma.CustomerWhereInput = { businessId };
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q?.trim()) {
    const term = query.q.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { company: { contains: term, mode: "insensitive" } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      services: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "ID",
    "Customer Name",
    "Email",
    "Phone",
    "Company",
    "Total Revenue (NGN)",
    "Services Count",
    "Primary Service",
    "Latest Status",
    "Customer Attributes",
    "Created At",
  ];

  const rows = customers.map((c) => {
    let formattedAttributes = "";
    if (Array.isArray(c.attributes)) {
      formattedAttributes = (c.attributes as unknown as ParsedAttribute[])
        .map((a) => `${a.key}: ${a.value}`)
        .join(" | ");
    }

    return [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${c.phone || "N/A"}"`,
      `"${(c.company || "").replace(/"/g, '""')}"`,
      Number(c.totalRevenue),
      c.services.length,
      `"${(c.services[0]?.service || "").replace(/"/g, '""')}"`,
      `"${c.services[0]?.status || "active"}"`,
      `"${formattedAttributes.replace(/"/g, '""')}"`,
      `"${c.createdAt.toISOString()}"`,
    ];
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
