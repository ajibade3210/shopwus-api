import type { InvoiceItem, InvoiceStatus } from "@prisma/client";
import { toFinancialAmount } from "../../../utils/currency.utils";

export interface InvoiceItemDto {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  unitPriceKobo?: number;
  amount: number;
  amountKobo?: number;
}

export interface InvoiceDto {
  id: string;
  businessId: string;
  customerId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  billingAddress?: string | null;
  issueDate: string;
  dueDate: string;
  paymentTerms?: string | null;
  currency: string;
  subtotal: number;
  subtotalKobo?: number;
  discount: number;
  discountKobo?: number;
  taxRate: number;
  taxAmount: number;
  taxAmountKobo?: number;
  total: number;
  totalKobo?: number;
  notes?: string | null;
  status: InvoiceStatus;
  sentAt?: string | null;
  pdfUrl?: string | null;
  items: InvoiceItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListResponseDto {
  items: InvoiceDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Serializers ───────────────────────────────────────────────────────────────

export function serializeInvoiceItem(i: InvoiceItem): InvoiceItemDto {
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

type InvoiceWithItems = {
  id: string;
  businessId: string;
  customerId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  billingAddress?: string | null;
  issueDate: Date;
  dueDate: Date;
  paymentTerms?: string | null;
  currency: string;
  subtotal: { toString(): string } | number | string;
  discount: { toString(): string } | number | string;
  taxRate: { toString(): string } | number | string;
  taxAmount: { toString(): string } | number | string;
  total: { toString(): string } | number | string;
  notes?: string | null;
  status: InvoiceStatus;
  sentAt?: Date | null;
  pdfUrl?: string | null;
  items: InvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
};

export function serializeInvoice(invoice: InvoiceWithItems): InvoiceDto {
  return {
    id: invoice.id,
    businessId: invoice.businessId,
    customerId: invoice.customerId,
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    billingAddress: invoice.billingAddress,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    paymentTerms: invoice.paymentTerms,
    currency: invoice.currency,
    ...toFinancialAmount(invoice.subtotal, "subtotal"),
    ...toFinancialAmount(invoice.discount, "discount"),
    taxRate: Number(invoice.taxRate),
    ...toFinancialAmount(invoice.taxAmount, "taxAmount"),
    ...toFinancialAmount(invoice.total, "total"),
    notes: invoice.notes,
    status: invoice.status,
    sentAt: invoice.sentAt ? invoice.sentAt.toISOString() : null,
    pdfUrl: invoice.pdfUrl,
    items: invoice.items.map(serializeInvoiceItem),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}
