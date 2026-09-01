import { z } from "zod";
import { ReqHeaderSchema } from "../../../utils";

export const leadStatusEnum = z.enum([
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
]);

export const publicInquiryInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Valid email is required"),
  phone: z.string().optional(),
  service: z.string().optional(),
  services: z.array(z.string()).optional().default([]),
  eventDate: z.string().optional(),
  budget: z.union([z.string(), z.number()]).optional(),
  message: z.string().optional(),
});

export const studioSlugParamsSchema = z.object({
  slug: z.string().min(1, "Studio slug is required"),
});

export const createLeadInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Valid email is required"),
  phone: z.string().optional(),
  service: z.string().optional(),
  services: z.array(z.string()).optional().default([]),
  eventDate: z.string().optional(),
  budget: z.union([z.string(), z.number()]).optional(),
  message: z.string().optional(),
  status: leadStatusEnum.optional().default("new"),
});

export const leadFilterStatusEnum = z.enum([
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
  "all",
  "active",
]);

export const listLeadsQuerySchema = z.object({
  q: z.string().optional(),
  status: leadFilterStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const leadIdParamsSchema = z.object({
  id: z.string().min(1, "Lead ID is required"),
});

export const updateLeadStatusSchema = z.object({
  status: leadStatusEnum,
});

export const convertLeadSchema = z
  .object({
    serviceName: z.string().optional(),
    service: z.string().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    createDraftInvoice: z.boolean().optional().default(false),
  })
  .optional()
  .default({ createDraftInvoice: false });

export type PublicInquiryInput = z.infer<typeof publicInquiryInputSchema>;
export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type LeadIdParams = z.infer<typeof leadIdParamsSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;

export const publicInquiryRouteSchema = {
  params: studioSlugParamsSchema,
  body: publicInquiryInputSchema,
};

export const listLeadsRouteSchema = {
  headers: ReqHeaderSchema,
  querystring: listLeadsQuerySchema,
};

export const getLeadRouteSchema = {
  headers: ReqHeaderSchema,
  params: leadIdParamsSchema,
};

export const createLeadRouteSchema = {
  headers: ReqHeaderSchema,
  body: createLeadInputSchema,
};

export const updateLeadStatusRouteSchema = {
  headers: ReqHeaderSchema,
  params: leadIdParamsSchema,
  body: updateLeadStatusSchema,
};

export const convertLeadRouteSchema = {
  headers: ReqHeaderSchema,
  params: leadIdParamsSchema,
  body: convertLeadSchema,
};

export const exportLeadsRouteSchema = {
  headers: ReqHeaderSchema,
  querystring: z.object({
    q: z.string().optional(),
    status: leadStatusEnum.optional(),
  }),
};
