import type { LeadStatus, Prisma } from "@prisma/client";
import { NotFoundError } from "../../../lib/errors";
import { logger } from "../../../lib/logger";
import { prisma } from "../../../lib/prisma";
import { sendNewLeadNotificationEmail } from "../../../utils";
import { generateNextInvoiceNumber } from "../../invoices/services/invoice.service";
import type {
  ConvertLeadInput,
  CreateLeadInput,
  ListLeadsQuery,
  PublicInquiryInput,
} from "../schema/lead.schema";

export async function submitPublicInquiryService(
  slug: string,
  data: PublicInquiryInput,
) {
  const normalizedSlug = slug.toLowerCase().trim();

  const business = await prisma.business.findUnique({
    where: { slug: normalizedSlug },
    select: {
      id: true,
      name: true,
      email: true,
      businessType: true,
      businessUsers: {
        select: {
          user: {
            select: {
              email: true,
              firstName: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!business) {
    throw new NotFoundError(`Studio '${slug}' not found`);
  }

  const budgetStr =
    data.budget !== undefined ? String(data.budget).trim() : null;

  const lead = await prisma.lead.create({
    data: {
      businessId: business.id,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim(),
      service: data.service?.trim(),
      services: data.services || (data.service ? [data.service.trim()] : []),
      eventDate: data.eventDate?.trim(),
      budget: budgetStr,
      message: data.message?.trim(),
      status: "new",
    },
  });

  // Notify the business vendor via email
  const vendorEmail =
    business.email?.trim() || business.businessUsers[0]?.user?.email;
  const vendorName =
    business.businessUsers[0]?.user?.firstName || business.name;

  if (vendorEmail) {
    const servicesText =
      lead.services && lead.services.length > 0
        ? lead.services.join(", ")
        : lead.service || undefined;

    sendNewLeadNotificationEmail({
      vendorEmail,
      vendorName,
      studioName: business.name,
      businessType: business.businessType || "sales",
      customerName: lead.name,
      customerEmail: lead.email,
      customerPhone: lead.phone,
      services: servicesText,
      eventDate: lead.eventDate,
      budget: lead.budget,
      message: lead.message,
    }).catch((err) => {
      logger.error(
        { err, leadId: lead.id, vendorEmail },
        "Failed to dispatch new lead notification email",
      );
    });
  }

  return {
    id: lead.id,
    status: lead.status,
    createdAt: lead.createdAt.toISOString(),
  };
}

export async function listLeadsService(
  businessId: string,
  query: ListLeadsQuery,
) {
  const { q, status, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.LeadWhereInput = {
    businessId,
  };

  if (status === "converted") {
    where.status = "converted";
  } else if (status && status !== "all" && status !== "active") {
    where.status = status as LeadStatus;
  } else {
    // Default (or status === "all" / "active"): return all leads except converted
    where.status = { not: "converted" };
  }

  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { service: { contains: term, mode: "insensitive" } },
      { message: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const items = leads.map((l) => ({
    id: l.id,
    businessId: l.businessId,
    name: l.name,
    email: l.email,
    phone: l.phone,
    service: l.service,
    services: l.services,
    eventDate: l.eventDate,
    budget: l.budget,
    message: l.message,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getLeadByIdService(leadId: string, businessId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, businessId },
  });

  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  return {
    id: lead.id,
    businessId: lead.businessId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    service: lead.service,
    services: lead.services,
    eventDate: lead.eventDate,
    budget: lead.budget,
    message: lead.message,
    status: lead.status,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export async function createLeadAdminService(
  businessId: string,
  data: CreateLeadInput,
) {
  const budgetStr =
    data.budget !== undefined ? String(data.budget).trim() : null;

  const lead = await prisma.lead.create({
    data: {
      businessId,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim(),
      service: data.service?.trim(),
      services: data.services || (data.service ? [data.service.trim()] : []),
      eventDate: data.eventDate?.trim(),
      budget: budgetStr,
      message: data.message?.trim(),
      status: data.status || "new",
    },
  });

  return {
    id: lead.id,
    businessId: lead.businessId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    service: lead.service,
    services: lead.services,
    eventDate: lead.eventDate,
    budget: lead.budget,
    message: lead.message,
    status: lead.status,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export async function updateLeadStatusService(
  leadId: string,
  businessId: string,
  status: LeadStatus,
) {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, businessId },
  });

  if (!existing) {
    throw new NotFoundError("Lead not found");
  }

  const updated = await prisma.lead.update({
    where: { id: existing.id },
    data: { status },
  });

  return {
    id: updated.id,
    status: updated.status,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function convertLeadToCustomerService(
  leadId: string,
  businessId: string,
  options: ConvertLeadInput,
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, businessId },
  });

  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  const rawAmount =
    options.amount !== undefined
      ? Number(options.amount)
      : Number(lead.budget) || 50000;
  const serviceTitle = options.serviceName || lead.service || "";
  const serviceCategory = options.service || lead.service || "Design";

  return prisma.$transaction(async (tx) => {
    // 1. Update lead status to converted
    const updatedLead = await tx.lead.update({
      where: { id: lead.id },
      data: { status: "converted" },
    });

    // 2. Find or create Customer
    let customer = await tx.customer.findFirst({
      where: { businessId, email: lead.email },
    });

    if (!customer) {
      customer = await tx.customer.create({
        data: {
          businessId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          totalRevenue: rawAmount,
          notes: lead.message
            ? `Consultation note: ${lead.message}`
            : undefined,
          isActive: true,
        },
      });
    } else {
      customer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalRevenue: { increment: rawAmount },
        },
      });
    }

    // 3. Create CustomerService
    const customerService = await tx.customerService.create({
      data: {
        businessId,
        customerId: customer.id,
        name: serviceTitle,
        service: serviceCategory,
        amount: rawAmount,
        status: "pending",
      },
    });

    // 4. Create Activity
    await tx.customerActivity.create({
      data: {
        businessId,
        customerId: customer.id,
        type: "lead_conversion",
        description: `Lead '${lead.name}' converted into active client with service '${serviceTitle}' (₦${rawAmount.toLocaleString()}).`,
      },
    });

    // 5. Optional Draft Invoice
    let invoice = null;
    if (options.createDraftInvoice) {
      const invoiceNumber = await generateNextInvoiceNumber(businessId, tx);

      invoice = await tx.invoice.create({
        data: {
          businessId,
          customerId: customer.id,
          invoiceNumber,
          customerName: customer.name,
          customerEmail: customer.email,
          subtotal: rawAmount,
          total: rawAmount,
          status: "draft",
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          items: {
            create: [
              {
                description: serviceTitle,
                quantity: 1,
                unitPrice: rawAmount,
                amount: rawAmount,
              },
            ],
          },
        },
        include: { items: true },
      });
    }

    return {
      lead: updatedLead,
      customer,
      service: customerService,
      invoice,
    };
  });
}

export async function exportLeadsCsvService(
  businessId: string,
  query: { q?: string; status?: LeadStatus },
): Promise<string> {
  const where: Prisma.LeadWhereInput = { businessId };
  if (query.status) where.status = query.status;
  if (query.q?.trim()) {
    const term = query.q.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { service: { contains: term, mode: "insensitive" } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "ID",
    "Client Name",
    "Email",
    "Phone",
    "Service Requested",
    "Estimated Date",
    "Target Budget",
    "Status",
    "Created At",
    "Message",
  ];

  const rows = leads.map((l) => [
    l.id,
    `"${l.name.replace(/"/g, '""')}"`,
    `"${l.email}"`,
    `"${l.phone || ""}"`,
    `"${(l.service || "").replace(/"/g, '""')}"`,
    `"${l.eventDate || "Flexible"}"`,
    `"${l.budget || ""}"`,
    `"${l.status}"`,
    `"${l.createdAt.toISOString()}"`,
    `"${(l.message || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export async function deleteLeadService(leadId: string, businessId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, businessId },
  });

  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  await prisma.lead.delete({
    where: { id: lead.id },
  });

  return { id: lead.id, deleted: true };
}

export async function getLeadSummaryService(businessId: string) {
  const leads = await prisma.lead.findMany({
    where: { businessId },
    select: { id: true, status: true, createdAt: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const unconvertedLeads = leads.filter((l) => l.status !== "converted");
  const total = unconvertedLeads.length;
  const newToday = unconvertedLeads.filter(
    (l) => l.status === "new" || l.createdAt >= today,
  ).length;
  const convertedCount = leads.filter((l) => l.status === "converted").length;
  const totalAllTime = leads.length;
  const conversion =
    totalAllTime > 0 ? Math.round((convertedCount / totalAllTime) * 100) : 0;

  return {
    total,
    newToday,
    conversion,
  };
}
