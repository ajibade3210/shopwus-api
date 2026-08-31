import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type {
  ImportCustomerRecord,
  ImportCustomersInput,
} from "../schema/customer.schema";

export async function importCustomersService(
  businessId: string,
  input: ImportCustomersInput,
) {
  const records: ImportCustomerRecord[] = Array.isArray(input)
    ? input
    : input.records;

  const createdCustomers = await prisma.$transaction(async (tx) => {
    const results = [];

    for (const record of records) {
      const email = record.email.toLowerCase().trim();

      const existing = await tx.customer.findFirst({
        where: { businessId, email },
      });

      if (existing) {
        const updated = await tx.customer.update({
          where: { id: existing.id },
          data: {
            name: record.name.trim(),
            phone: record.phone?.trim() || existing.phone,
            company: record.company?.trim() || existing.company,
            notes: record.notes?.trim() || existing.notes,
          },
          include: { services: true },
        });
        results.push(updated);
      } else {
        const created = await tx.customer.create({
          data: {
            businessId,
            name: record.name.trim(),
            email,
            phone: record.phone?.trim(),
            company: record.company?.trim(),
            notes: record.notes?.trim(),
            isActive: true,
          },
          include: { services: true },
        });

        await tx.customerActivity.create({
          data: {
            businessId,
            customerId: created.id,
            type: "imported",
            description: "Customer imported from CSV batch.",
          },
        });

        results.push(created);
      }
    }

    return results;
  });

  return {
    imported: createdCustomers.length,
    customers: createdCustomers.map((c) => ({
      id: c.id,
      businessId: c.businessId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      totalRevenue: Number(c.totalRevenue),
      notes: c.notes,
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
    "Created At",
  ];

  const rows = customers.map((c) => [
    c.id,
    `"${c.name.replace(/"/g, '""')}"`,
    `"${c.email}"`,
    `"${c.phone || "N/A"}"`,
    `"${(c.company || "").replace(/"/g, '""')}"`,
    Number(c.totalRevenue),
    c.services.length,
    `"${(c.services[0]?.service || "").replace(/"/g, '""')}"`,
    `"${c.services[0]?.status || "active"}"`,
    `"${c.createdAt.toISOString()}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
