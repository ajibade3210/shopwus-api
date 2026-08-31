import { z } from "zod";
import { ReqHeaderSchema } from "../../../utils";

export const publicValuationInputsSchema = z.object({
  currency: z.string().optional().default("NGN"),
  industry: z.string().optional().default("luxury_services"),
  annualRevenue: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v) || 0),
  annualExpenses: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v) || 0),
  netAssets: z.union([z.string(), z.number()]).transform((v) => Number(v) || 0),
  customerRetentionRate: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v) || 50),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const advancedValuationInputsSchema = z.object({
  monthlyRevenueOverride: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined)),
});

export type PublicValuationInputs = z.infer<typeof publicValuationInputsSchema>;
export type AdvancedValuationInputs = z.infer<
  typeof advancedValuationInputsSchema
>;

export const publicValuationRouteSchema = {
  body: publicValuationInputsSchema,
};

export const advancedValuationRouteSchema = {
  headers: ReqHeaderSchema,
  body: advancedValuationInputsSchema.optional(),
};
