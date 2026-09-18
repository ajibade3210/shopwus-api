import { z } from "zod";

export const resolveAccountSchema = z.object({
  accountNumber: z
    .string()
    .trim()
    .min(10, "Account number must be 10 digits")
    .max(10),
  bankCode: z.string().trim().min(1, "Bank code is required"),
});

export const updatePayoutAccountSchema = z.object({
  accountNumber: z
    .string()
    .trim()
    .min(10, "Account number must be 10 digits")
    .max(10),
  bankCode: z.string().trim().min(1, "Bank code is required"),
  bankName: z.string().trim().min(1, "Bank name is required"),
});

export const initializePaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  callbackUrl: z.string().url().optional(),
});

export const initializeSubscriptionSchema = z.object({
  planTier: z.enum(["PRO", "BUSINESS", "ENTERPRISE"]),
  callbackUrl: z.string().url().optional(),
});

export type ResolveAccountInput = z.infer<typeof resolveAccountSchema>;
export type UpdatePayoutAccountInput = z.infer<
  typeof updatePayoutAccountSchema
>;
export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
export type InitializeSubscriptionInput = z.infer<
  typeof initializeSubscriptionSchema
>;
