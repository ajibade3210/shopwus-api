import { z } from "zod";

export const deliveryZoneSchema = z.object({
  name: z.string().trim().min(1, "Zone name is required").max(100),
  states: z.array(z.string().trim().min(1)).default([]),
  fee: z.number().nonnegative("Delivery fee must be non-negative"),
  estimatedDays: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateDeliveryZoneSchema = deliveryZoneSchema.partial();

export const deliveryZoneIdParamsSchema = z.object({
  id: z.string().min(1, "Zone ID is required"),
});

export const updateDeliverySettingsSchema = z.object({
  addressLine1: z.string().trim().optional().nullable(),
  addressLine2: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  postalCode: z.string().trim().optional().nullable(),
  enableStorePickup: z.boolean().default(true),
  pickupInstructions: z.string().trim().optional().nullable(),
  enableHomeDelivery: z.boolean().default(true),
  freeDeliveryThreshold: z.number().nonnegative().optional().nullable(),
});

export type DeliveryZoneInput = z.infer<typeof deliveryZoneSchema>;
export type UpdateDeliveryZoneInput = z.infer<typeof updateDeliveryZoneSchema>;
export type UpdateDeliverySettingsInput = z.infer<
  typeof updateDeliverySettingsSchema
>;
