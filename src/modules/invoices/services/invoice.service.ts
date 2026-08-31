import { type InvoiceStatus, Prisma } from "@prisma/client";
import { DomainError, NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { toFinancialAmount } from "../../../utils/currency.utils";
import {
  generateDocumentNumber,
  type SequenceDbClient,
} from "../../../utils/sequence.utils";
import type {
  CreateInvoiceInput,
  ListInvoicesQuery,
  UpdateInvoiceInput,
} from "../schema/invoice.schema";

type InvoiceWithItems = Prisma.InvoiceGetPayload<{ include: { items: true } }>;
type InvoiceItem = InvoiceWithItems["items"][number];

function serializeInvoiceItem(i: InvoiceItem) {
  return {
    id: i.id,
    invoiceId: i.invoiceId,
    description: i.description,
    quantity: Number(i.quantity),
    unit: i.unit,
    ...toFinancialAmount(i.unitPrice, "unitPrice"),
    ...toFinancialAmount(i.amount, "amount"),
  };
}

function serializeInvoice(inv: InvoiceWithItems) {
  return {
    id: inv.id,
    businessId: inv.businessId,
    customerId: inv.customerId,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    customerEmail: inv.customerEmail,
    billingAddress: inv.billingAddress,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    paymentTerms: inv.paymentTerms,
    currency: inv.currency,
    ...toFinancialAmount(inv.subtotal, "subtotal"),
    ...toFinancialAmount(inv.discount, "discount"),
    taxRate: Number(inv.taxRate),
    ...toFinancialAmount(inv.taxAmount, "taxAmount"),
    ...toFinancialAmount(inv.total, "total"),
    notes: inv.notes,
    status: inv.status,
    sentAt: inv.sentAt ? inv.sentAt.toISOString() : null,
    pdfUrl: inv.pdfUrl,
    items: inv.items.map(serializeInvoiceItem),
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

export async function generateNextInvoiceNumber(
  businessId: string,
  client?: SequenceDbClient,
): Promise<string> {
  return generateDocumentNumber(businessId, "INV", { client });
}

export async function listInvoicesService(
  businessId: string,
  query: ListInvoicesQuery,
) {
  const { q, status, customerId, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.InvoiceWhereInput = { businessId };

  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { invoiceNumber: { contains: term, mode: "insensitive" } },
      { customerName: { contains: term, mode: "insensitive" } },
      { customerEmail: { contains: term, mode: "insensitive" } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const items = invoices.map(serializeInvoice);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getInvoiceByIdService(
  invoiceId: string,
  businessId: string,
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: {
      items: true,
      customer: true,
      business: true,
    },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }

  return serializeInvoice(invoice);
}

export interface CalculateInvoiceFinancialsInput {
  items: Array<{
    description: string;
    quantity: number | string | Prisma.Decimal;
    unit?: string;
    unitPrice: number | string | Prisma.Decimal;
    amount?: number | string | Prisma.Decimal;
  }>;
  subtotal?: number | string | Prisma.Decimal;
  discount?: number | string | Prisma.Decimal;
  taxRate?: number | string | Prisma.Decimal;
  taxAmount?: number | string | Prisma.Decimal;
  total?: number | string | Prisma.Decimal;
}

export function calculateInvoiceFinancials(
  data: CalculateInvoiceFinancialsInput,
) {
  const calculatedItems = data.items.map((i) => {
    const qty = new Prisma.Decimal(i.quantity ?? 1);
    const unitPrice = new Prisma.Decimal(i.unitPrice ?? 0);
    const amount =
      i.amount !== undefined
        ? new Prisma.Decimal(i.amount)
        : qty.mul(unitPrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    return {
      description: i.description.trim(),
      quantity: qty,
      unit: i.unit?.trim(),
      unitPrice,
      amount,
    };
  });

  const subtotal =
    data.subtotal !== undefined
      ? new Prisma.Decimal(data.subtotal)
      : calculatedItems
          .reduce((acc, item) => acc.add(item.amount), new Prisma.Decimal(0))
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  const discount =
    data.discount !== undefined
      ? new Prisma.Decimal(data.discount)
      : new Prisma.Decimal(0);

  const taxRate =
    data.taxRate !== undefined
      ? new Prisma.Decimal(data.taxRate)
      : new Prisma.Decimal(0);

  const taxableBase = Prisma.Decimal.max(
    subtotal.sub(discount),
    new Prisma.Decimal(0),
  );

  const taxAmount =
    data.taxAmount !== undefined
      ? new Prisma.Decimal(data.taxAmount)
      : taxableBase
          .mul(taxRate)
          .div(100)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  const total =
    data.total !== undefined
      ? new Prisma.Decimal(data.total)
      : subtotal
          .sub(discount)
          .add(taxAmount)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  return {
    calculatedItems,
    subtotal,
    discount,
    taxRate,
    taxAmount,
    total,
  };
}

export async function createInvoiceService(
  businessId: string,
  data: CreateInvoiceInput,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, businessId },
  });

  if (!customer) {
    throw new NotFoundError("Customer not found");
  }

  const financials = calculateInvoiceFinancials({
    items: data.items,
    subtotal: data.subtotal,
    discount: data.discount,
    taxRate: data.taxRate,
    taxAmount: data.taxAmount,
    total: data.total,
  });

  return prisma.$transaction(async (tx) => {
    const invoiceNumber = await generateNextInvoiceNumber(businessId, tx);

    const invoice = await tx.invoice.create({
      data: {
        businessId,
        customerId: customer.id,
        invoiceNumber,
        customerName: data.customerName?.trim() || customer.name,
        customerEmail:
          data.customerEmail?.toLowerCase().trim() || customer.email,
        billingAddress: data.billingAddress?.trim(),
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        dueDate: new Date(data.dueDate),
        paymentTerms: data.paymentTerms?.trim() || "Net 14",
        currency: data.currency?.trim() || "NGN",
        subtotal: financials.subtotal,
        discount: financials.discount,
        taxRate: financials.taxRate,
        taxAmount: financials.taxAmount,
        total: financials.total,
        notes: data.notes?.trim(),
        status: data.status || "draft",
        items: {
          create: financials.calculatedItems.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unit: i.unit,
            unitPrice: i.unitPrice,
            amount: i.amount,
          })),
        },
      },
      include: { items: true },
    });

    return serializeInvoice(invoice);
  });
}

export async function updateInvoiceService(
  invoiceId: string,
  businessId: string,
  data: UpdateInvoiceInput,
) {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: { items: true },
  });

  if (!existing) {
    throw new NotFoundError("Invoice not found");
  }

  return prisma.$transaction(async (tx) => {
    let itemsToSync = existing.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit: i.unit ?? undefined,
      unitPrice: i.unitPrice,
      amount: i.amount,
    }));

    if (data.items) {
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: existing.id },
      });

      const calculated = data.items.map((i) => {
        const qty = new Prisma.Decimal(i.quantity ?? 1);
        const unitPrice = new Prisma.Decimal(i.unitPrice ?? 0);
        const amount =
          i.amount !== undefined
            ? new Prisma.Decimal(i.amount)
            : qty
                .mul(unitPrice)
                .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        return {
          invoiceId: existing.id,
          description: i.description.trim(),
          quantity: qty,
          unit: i.unit?.trim(),
          unitPrice,
          amount,
        };
      });

      await tx.invoiceItem.createMany({
        data: calculated,
      });

      itemsToSync = calculated;
    }

    const financials = calculateInvoiceFinancials({
      items: itemsToSync,
      subtotal: data.subtotal,
      discount: data.discount !== undefined ? data.discount : existing.discount,
      taxRate: data.taxRate !== undefined ? data.taxRate : existing.taxRate,
      taxAmount: data.taxAmount,
      total: data.total,
    });

    const updated = await tx.invoice.update({
      where: { id: existing.id },
      data: {
        customerName: data.customerName?.trim(),
        customerEmail: data.customerEmail?.toLowerCase().trim(),
        billingAddress: data.billingAddress?.trim(),
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        paymentTerms: data.paymentTerms?.trim(),
        currency: data.currency?.trim(),
        subtotal: financials.subtotal,
        discount: financials.discount,
        taxRate: financials.taxRate,
        taxAmount: financials.taxAmount,
        total: financials.total,
        notes: data.notes?.trim(),
        status: data.status,
      },
      include: { items: true },
    });

    return serializeInvoice(updated);
  });
}

export async function updateInvoiceStatusService(
  invoiceId: string,
  businessId: string,
  status: InvoiceStatus,
) {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
  });

  if (!existing) {
    throw new NotFoundError("Invoice not found");
  }

  const updated = await prisma.invoice.update({
    where: { id: existing.id },
    data: {
      status,
      sentAt: status === "sent" && !existing.sentAt ? new Date() : undefined,
    },
  });

  return {
    id: updated.id,
    invoiceNumber: updated.invoiceNumber,
    status: updated.status,
    sentAt: updated.sentAt ? updated.sentAt.toISOString() : null,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteInvoiceService(
  invoiceId: string,
  businessId: string,
) {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
  });

  if (!existing) {
    throw new NotFoundError("Invoice not found");
  }

  if (existing.status === "paid") {
    throw new DomainError("Cannot delete an invoice marked as paid");
  }

  await prisma.invoice.delete({
    where: { id: existing.id },
  });

  return { id: existing.id, deleted: true };
}

export async function exportInvoicesCsvService(
  businessId: string,
  query: { q?: string; status?: InvoiceStatus; customerId?: string },
): Promise<string> {
  const where: Prisma.InvoiceWhereInput = { businessId };
  if (query.status) where.status = query.status;
  if (query.customerId) where.customerId = query.customerId;
  if (query.q?.trim()) {
    const term = query.q.trim();
    where.OR = [
      { invoiceNumber: { contains: term, mode: "insensitive" } },
      { customerName: { contains: term, mode: "insensitive" } },
      { customerEmail: { contains: term, mode: "insensitive" } },
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Invoice Number",
    "Customer Name",
    "Customer Email",
    "Subtotal",
    "Discount",
    "Tax Amount",
    "Total (NGN)",
    "Status",
    "Issue Date",
    "Due Date",
  ];

  const rows = invoices.map((inv) => [
    `"${inv.invoiceNumber}"`,
    `"${inv.customerName.replace(/"/g, '""')}"`,
    `"${inv.customerEmail}"`,
    Number(inv.subtotal),
    Number(inv.discount),
    Number(inv.taxAmount),
    Number(inv.total),
    `"${inv.status}"`,
    `"${inv.issueDate.toISOString().split("T")[0]}"`,
    `"${inv.dueDate.toISOString().split("T")[0]}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
