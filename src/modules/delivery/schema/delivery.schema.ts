import { z } from "zod";

export const updateDeliverySettingsSchema = z.object({
  addressLine1: z.string().trim().optional().nullable(),
  addressLine2: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  postalCode: z.string().trim().optional().nullable(),
  senderPhone: z.string().trim().optional().nullable(),
  enableStorePickup: z.boolean().default(true),
  pickupInstructions: z.string().trim().optional().nullable(),
  enableHomeDelivery: z.boolean().default(true),
  freeDeliveryThreshold: z.number().nonnegative().optional().nullable(),
  fallbackShippingFee: z.number().nonnegative().optional().nullable(),
});

export const deliveryDestinationSchema = z.object({
  recipientName: z.string().trim().min(1, "Recipient name is required"),
  phone: z.string().trim().min(5, "Contact phone is required"),
  addressLine1: z.string().trim().min(1, "Address is required"),
  addressLine2: z.string().trim().optional().nullable(),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "State is required"),
  postalCode: z.string().trim().optional().nullable(),
});

export const getStorefrontDeliveryQuotesSchema = z.object({
  destination: deliveryDestinationSchema,
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().nullable(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "Cart cannot be empty"),
});

export type UpdateDeliverySettingsInput = z.infer<
  typeof updateDeliverySettingsSchema
>;
export type DeliveryDestinationInput = z.infer<
  typeof deliveryDestinationSchema
>;
export type GetStorefrontDeliveryQuotesInput = z.infer<
  typeof getStorefrontDeliveryQuotesSchema
>;

export const executeLogisticsSweepSchema = z.object({
  recordOnly: z.boolean().optional(),
});

export type ExecuteLogisticsSweepInput = z.infer<
  typeof executeLogisticsSweepSchema
>;

