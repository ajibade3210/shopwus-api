import { Prisma } from "@prisma/client";
import { NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { toFinancialAmount } from "../../../utils/currency.utils";
import type { CustomerAttributeDto } from "../dto/customer.dto";
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from "../schema/customer.schema";

export async function listCustomersService(
  businessId: string,
  query: ListCustomersQuery,
) {
  const { q, isActive, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {
    businessId,
  };

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { company: { contains: term, mode: "insensitive" } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: {
        services: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const items = customers.map((c) => ({
    id: c.id,
    businessId: c.businessId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    ...toFinancialAmount(c.totalRevenue, "totalRevenue"),
    notes: c.notes,
    attributes: (c.attributes as unknown as CustomerAttributeDto[]) || null,
    isActive: c.isActive,
    services: c.services.map((s) => ({
      id: s.id,
      businessId: s.businessId,
      customerId: s.customerId,
      name: s.name,
      service: s.service,
      ...toFinancialAmount(s.amount, "amount"),
      status: s.status,
      completedAt: s.completedAt ? s.completedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getCustomerByIdService(
  customerId: string,
  businessId: string,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
    include: {
      services: {
        orderBy: { createdAt: "desc" },
      },
      activities: {
        orderBy: { timestamp: "desc" },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) {
    throw new NotFoundError("Customer not found");
  }

  return {
    id: customer.id,
    businessId: customer.businessId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company,
    ...toFinancialAmount(customer.totalRevenue, "totalRevenue"),
    notes: customer.notes,
    attributes:
      (customer.attributes as unknown as CustomerAttributeDto[]) || null,
    isActive: customer.isActive,
    services: customer.services.map((s) => ({
      id: s.id,
      businessId: s.businessId,
      customerId: s.customerId,
      name: s.name,
      service: s.service,
      ...toFinancialAmount(s.amount, "amount"),
      status: s.status,
      completedAt: s.completedAt ? s.completedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    activities: customer.activities.map((a) => ({
      id: a.id,
      businessId: a.businessId,
      customerId: a.customerId,
      type: a.type,
      description: a.description,
      metadata: a.metadata,
      timestamp: a.timestamp.toISOString(),
    })),
    invoices: customer.invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      ...toFinancialAmount(inv.total, "total"),
      status: inv.status,
      dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
      createdAt: inv.createdAt.toISOString(),
    })),
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export async function createCustomerService(
  businessId: string,
  data: CreateCustomerInput,
) {
  const email = data.email.toLowerCase().trim();
  const rawAmount = data.amount !== undefined ? Number(data.amount) : 0;
  const initialServiceName = data.serviceName?.trim() || data.service?.trim();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.customer.findUnique({
      where: {
        businessId_email: {
          businessId,
          email,
        },
      },
      include: {
        services: true,
      },
    });

    let service = null;

    const customer = existing
      ? await tx.customer.update({
          where: { id: existing.id },
          data: {
            name: data.name.trim() || existing.name,
            phone: data.phone?.trim() ?? existing.phone,
            company: data.company?.trim() ?? existing.company,
            notes: data.notes?.trim() ?? existing.notes,
            ...(data.attributes !== undefined
              ? {
                  attributes: data.attributes
                    ? (data.attributes as unknown as Prisma.InputJsonValue)
                    : Prisma.DbNull,
                }
              : {}),
            isActive: true,
            totalRevenue: initialServiceName
              ? { increment: rawAmount }
              : existing.totalRevenue,
          },
          include: {
            services: true,
          },
        })
      : await tx.customer.create({
          data: {
            businessId,
            name: data.name.trim(),
            email,
            phone: data.phone?.trim(),
            company: data.company?.trim(),
            notes: data.notes?.trim(),
            attributes: data.attributes
              ? (data.attributes as unknown as Prisma.InputJsonValue)
              : undefined,
            totalRevenue: initialServiceName ? rawAmount : 0,
            isActive: data.isActive ?? true,
          },
          include: {
            services: true,
          },
        });

    if (initialServiceName) {
      service = await tx.customerService.create({
        data: {
          businessId,
          customerId: customer.id,
          name: initialServiceName,
          service: data.service?.trim() || "",
          amount: rawAmount,
          status: data.status || "active",
        },
      });
    }

    await tx.customerActivity.create({
      data: {
        businessId,
        customerId: customer.id,
        type: existing ? "note_added" : "client_onboarded",
        description: initialServiceName
          ? `New service '${initialServiceName}' attached to profile.`
          : existing
            ? "Customer profile reactivated/updated."
            : `Customer '${customer.name}' registered in directory.`,
      },
    });

    const allServices = service
      ? [...customer.services, service]
      : customer.services;

    return {
      id: customer.id,
      businessId: customer.businessId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      ...toFinancialAmount(customer.totalRevenue, "totalRevenue"),
      notes: customer.notes,
      attributes:
        (customer.attributes as unknown as CustomerAttributeDto[]) || null,
      isActive: customer.isActive,
      services: allServices.map((s) => ({
        id: s.id,
        businessId: s.businessId,
        customerId: s.customerId,
        name: s.name,
        service: s.service,
        ...toFinancialAmount(s.amount, "amount"),
        status: s.status,
        completedAt: s.completedAt ? s.completedAt.toISOString() : null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  });
}

export async function updateCustomerService(
  customerId: string,
  businessId: string,
  data: UpdateCustomerInput,
) {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!existing) {
    throw new NotFoundError("Customer not found");
  }

  const updatePayload: Prisma.CustomerUpdateInput = {};
  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.email !== undefined)
    updatePayload.email = data.email.toLowerCase().trim();
  if (data.phone !== undefined) updatePayload.phone = data.phone?.trim();
  if (data.company !== undefined) updatePayload.company = data.company?.trim();
  if (data.notes !== undefined) updatePayload.notes = data.notes?.trim();
  if (data.attributes !== undefined)
    updatePayload.attributes =
      data.attributes as unknown as Prisma.InputJsonValue;
  if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

  const updated = await prisma.customer.update({
    where: { id: existing.id },
    data: updatePayload,
    include: {
      services: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return {
    id: updated.id,
    businessId: updated.businessId,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    company: updated.company,
    ...toFinancialAmount(updated.totalRevenue, "totalRevenue"),
    notes: updated.notes,
    attributes:
      (updated.attributes as unknown as CustomerAttributeDto[]) || null,
    isActive: updated.isActive,
    services: updated.services.map((s) => ({
      id: s.id,
      businessId: s.businessId,
      customerId: s.customerId,
      name: s.name,
      service: s.service,
      ...toFinancialAmount(s.amount, "amount"),
      status: s.status,
      completedAt: s.completedAt ? s.completedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function toggleCustomerStatusService(
  customerId: string,
  businessId: string,
  isActive: boolean,
) {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!existing) {
    throw new NotFoundError("Customer not found");
  }

  const updated = await prisma.customer.update({
    where: { id: existing.id },
    data: { isActive },
  });

  return {
    id: updated.id,
    isActive: updated.isActive,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteCustomerService(
  customerId: string,
  businessId: string,
) {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!existing) {
    throw new NotFoundError("Customer not found");
  }

  await prisma.customer.delete({
    where: { id: existing.id },
  });

  return { id: existing.id, deleted: true };
}

export async function getCustomerSummaryService(businessId: string) {
  const customers = await prisma.customer.findMany({
    where: { businessId },
    select: {
      id: true,
      totalRevenue: true,
      services: {
        select: { status: true },
      },
    },
  });

  const total = customers.length;
  let activeServicesCount = 0;
  let totalRevenue = 0;

  for (const c of customers) {
    totalRevenue += Number(c.totalRevenue || 0);
    activeServicesCount += (c.services || []).filter(
      (s) => s.status === "active" || s.status === "pending",
    ).length;
  }

  return {
    total,
    activeServicesCount,
    totalRevenue,
  };
}
