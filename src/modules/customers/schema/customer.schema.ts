import { z } from "zod";
import { ReqHeaderSchema } from "../../../utils";

export const customerServiceStatusEnum = z.enum([
  "pending",
  "active",
  "completed",
  "cancelled",
]);

export const customerAttributeSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Attribute key is required")
    .max(50, "Attribute key must not exceed 50 characters")
    .regex(/^[^|]+$/, "Pipe (|) character is not allowed in attribute key"),
  value: z
    .string()
    .trim()
    .min(1, "Attribute value is required")
    .max(100, "Attribute value must not exceed 100 characters")
    .regex(/^[^|]+$/, "Pipe (|) character is not allowed in attribute value"),
});

export const rawCustomerAttributeSchema = z.object({
  key: z.string().default(""),
  value: z.string().default(""),
});

export const customerAttributesArraySchema = z
  .array(rawCustomerAttributeSchema)
  .transform((items) =>
    items.filter((item) => item.key.trim() !== "" || item.value.trim() !== ""),
  )
  .pipe(
    z
      .array(customerAttributeSchema)
      .max(25, "Maximum 25 attributes allowed per customer")
      .superRefine((items, ctx) => {
        const seenKeys = new Set<string>();
        for (let i = 0; i < items.length; i++) {
          const lowerKey = items[i].key.toLowerCase().trim();
          if (seenKeys.has(lowerKey)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate attribute key "${items[i].key}"`,
              path: [i, "key"],
            });
          }
          seenKeys.add(lowerKey);
        }
      }),
  );

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  email: z.string().email("Valid email address is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  attributes: customerAttributesArraySchema.optional().nullable(),
  isActive: z.boolean().optional().default(true),
  // Optional initial service
  serviceName: z.string().optional(),
  service: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  status: customerServiceStatusEnum.optional().default("active"),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  attributes: customerAttributesArraySchema.optional().nullable(),
  isActive: z.boolean().optional(),
});

export const toggleCustomerStatusSchema = z.object({
  isActive: z.boolean(),
});

export const listCustomersQuerySchema = z.object({
  q: z.string().optional(),
  isActive: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((val) =>
      val !== undefined ? String(val) === "true" : undefined,
    ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const customerIdParamsSchema = z.object({
  id: z.string().min(1, "Customer ID is required"),
});

export const addCustomerServiceSchema = z.object({
  name: z.string().min(1, "Service title/scope name is required"),
  service: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional().default(0),
  status: customerServiceStatusEnum.optional().default("pending"),
});

export const customerServiceParamsSchema = z.object({
  id: z.string().min(1, "Customer ID is required"),
  serviceId: z.string().min(1, "Service ID is required"),
});

export const updateCustomerServiceStatusSchema = z.object({
  status: customerServiceStatusEnum,
});

export const addCustomerActivitySchema = z.object({
  type: z.string().min(1, "Activity type is required"),
  description: z.string().min(1, "Activity description is required"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const importCustomerRecordSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  attributes: z
    .union([customerAttributesArraySchema, z.string()])
    .optional()
    .nullable(),
});

export const importCustomersSchema = z.union([
  z.array(importCustomerRecordSchema),
  z.object({
    records: z.array(importCustomerRecordSchema),
  }),
]);

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ToggleCustomerStatusInput = z.infer<
  typeof toggleCustomerStatusSchema
>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type CustomerIdParams = z.infer<typeof customerIdParamsSchema>;
export type AddCustomerServiceInput = z.infer<typeof addCustomerServiceSchema>;
export type CustomerServiceParams = z.infer<typeof customerServiceParamsSchema>;
export type UpdateCustomerServiceStatusInput = z.infer<
  typeof updateCustomerServiceStatusSchema
>;
export type AddCustomerActivityInput = z.infer<
  typeof addCustomerActivitySchema
>;
export type ImportCustomerRecord = z.infer<typeof importCustomerRecordSchema>;
export type ImportCustomersInput = z.infer<typeof importCustomersSchema>;

export const listCustomersRouteSchema = {
  headers: ReqHeaderSchema,
  querystring: listCustomersQuerySchema,
};

export const createCustomerRouteSchema = {
  headers: ReqHeaderSchema,
  body: createCustomerSchema,
};

export const getCustomerRouteSchema = {
  headers: ReqHeaderSchema,
  params: customerIdParamsSchema,
};

export const updateCustomerRouteSchema = {
  headers: ReqHeaderSchema,
  params: customerIdParamsSchema,
  body: updateCustomerSchema,
};

export const toggleCustomerStatusRouteSchema = {
  headers: ReqHeaderSchema,
  params: customerIdParamsSchema,
  body: toggleCustomerStatusSchema,
};

export const deleteCustomerRouteSchema = {
  headers: ReqHeaderSchema,
  params: customerIdParamsSchema,
};

export const addCustomerServiceRouteSchema = {
  headers: ReqHeaderSchema,
  params: customerIdParamsSchema,
  body: addCustomerServiceSchema,
};

export const updateCustomerServiceStatusRouteSchema = {
  headers: ReqHeaderSchema,
  params: customerServiceParamsSchema,
  body: updateCustomerServiceStatusSchema,
};

export const deleteCustomerServiceRouteSchema = {
  headers: ReqHeaderSchema,
  params: customerServiceParamsSchema,
};

export const getCustomerActivitiesRouteSchema = {
  headers: ReqHeaderSchema,
  params: customerIdParamsSchema,
};

export const addCustomerActivityRouteSchema = {
  headers: ReqHeaderSchema,
  params: customerIdParamsSchema,
  body: addCustomerActivitySchema,
};

export const exportCustomersRouteSchema = {
  headers: ReqHeaderSchema,
  querystring: z.object({
    q: z.string().optional(),
    isActive: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .optional()
      .transform((val) =>
        val !== undefined ? String(val) === "true" : undefined,
      ),
  }),
};

export const importCustomersRouteSchema = {
  headers: ReqHeaderSchema,
  body: importCustomersSchema,
};
