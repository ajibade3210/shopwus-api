import { z } from "zod";
import { ReqHeaderSchema } from "../../../utils";

export const invoiceStatusEnum = z.enum([
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
]);

export const invoiceItemInputSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Item description is required"),
  quantity: z.union([z.string(), z.number()]).optional().default(1),
  unit: z.string().optional(),
  unitPrice: z.union([z.string(), z.number()]),
  amount: z.union([z.string(), z.number()]).optional(),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  billingAddress: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  paymentTerms: z.string().optional().default("Net 14"),
  currency: z.string().optional().default("NGN"),
  items: z
    .array(invoiceItemInputSchema)
    .min(1, "At least one invoice line item is required"),
  subtotal: z.union([z.string(), z.number()]).optional(),
  discount: z.union([z.string(), z.number()]).optional().default(0),
  taxRate: z.union([z.string(), z.number()]).optional().default(0),
  taxAmount: z.union([z.string(), z.number()]).optional().default(0),
  total: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
  status: invoiceStatusEnum.optional().default("draft"),
});

export const updateInvoiceSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  billingAddress: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  currency: z.string().optional(),
  items: z.array(invoiceItemInputSchema).optional(),
  subtotal: z.union([z.string(), z.number()]).optional(),
  discount: z.union([z.string(), z.number()]).optional(),
  taxRate: z.union([z.string(), z.number()]).optional(),
  taxAmount: z.union([z.string(), z.number()]).optional(),
  total: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
  status: invoiceStatusEnum.optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: invoiceStatusEnum,
});

export const listInvoicesQuerySchema = z.object({
  q: z.string().optional(),
  status: invoiceStatusEnum.optional(),
  customerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const invoiceIdParamsSchema = z.object({
  id: z.string().min(1, "Invoice ID is required"),
});

export const quickCustomerInvoiceParamsSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
});

export const quickCustomerInvoiceBodySchema = z.object({
  serviceId: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type UpdateInvoiceStatusInput = z.infer<
  typeof updateInvoiceStatusSchema
>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type InvoiceIdParams = z.infer<typeof invoiceIdParamsSchema>;
export type QuickCustomerInvoiceParams = z.infer<
  typeof quickCustomerInvoiceParamsSchema
>;
export type QuickCustomerInvoiceBody = z.infer<
  typeof quickCustomerInvoiceBodySchema
>;

export const listInvoicesRouteSchema = {
  headers: ReqHeaderSchema,
  querystring: listInvoicesQuerySchema,
};

export const createInvoiceRouteSchema = {
  headers: ReqHeaderSchema,
  body: createInvoiceSchema,
};

export const getInvoiceRouteSchema = {
  headers: ReqHeaderSchema,
  params: invoiceIdParamsSchema,
};

export const updateInvoiceRouteSchema = {
  headers: ReqHeaderSchema,
  params: invoiceIdParamsSchema,
  body: updateInvoiceSchema,
};

export const updateInvoiceStatusRouteSchema = {
  headers: ReqHeaderSchema,
  params: invoiceIdParamsSchema,
  body: updateInvoiceStatusSchema,
};

export const deleteInvoiceRouteSchema = {
  headers: ReqHeaderSchema,
  params: invoiceIdParamsSchema,
};

export const sendInvoiceRouteSchema = {
  headers: ReqHeaderSchema,
  params: invoiceIdParamsSchema,
};

export const exportInvoicesRouteSchema = {
  headers: ReqHeaderSchema,
  querystring: z.object({
    q: z.string().optional(),
    status: invoiceStatusEnum.optional(),
    customerId: z.string().optional(),
  }),
};

export const quickCustomerInvoiceRouteSchema = {
  headers: ReqHeaderSchema,
  params: quickCustomerInvoiceParamsSchema,
  body: quickCustomerInvoiceBodySchema.optional(),
};
