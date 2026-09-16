import { z } from "zod";

export const orderStatusEnum = z.enum([
  "OPEN",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
]);

export const paymentStatusEnum = z.enum([
  "UNPAID",
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

export const fulfillmentStatusEnum = z.enum([
  "UNFULFILLED",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "DISPATCHED",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
]);

export const deliveryTypeEnum = z.enum(["STORE_PICKUP", "HOME_DELIVERY"]);

export const manualFulfillmentModeEnum = z.enum([
  "DIRECT_SALE",
  "STORE_PICKUP",
  "SHIP_TO_CUSTOMER",
]);

export const manualPaymentMethodEnum = z.enum([
  "CASH",
  "POS",
  "BANK_TRANSFER",
  "ONLINE",
  "OTHER",
]);

export const MANUAL_FULFILLMENT_MODE = {
  DIRECT_SALE: "DIRECT_SALE",
  STORE_PICKUP: "STORE_PICKUP",
  SHIP_TO_CUSTOMER: "SHIP_TO_CUSTOMER",
} as const;

export type ManualFulfillmentMode = z.infer<typeof manualFulfillmentModeEnum>;
export type ManualPaymentMethod = z.infer<typeof manualPaymentMethodEnum>;

export const shippingAddressSchema = z.object({
  recipientName: z.string().trim().min(1, "Recipient name is required"),
  phone: z.string().trim().min(5, "Contact phone is required"),
  addressLine1: z.string().trim().min(1, "Address is required"),
  addressLine2: z.string().trim().optional().nullable(),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "State is required"),
  postalCode: z.string().trim().optional().nullable(),
  deliveryNote: z.string().trim().optional().nullable(),
});

export const cartItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  selectedOptions: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const syncCheckoutSessionSchema = z.object({
  customerName: z.string().trim().optional().nullable(),
  customerEmail: z
    .string()
    .email("Valid email is required")
    .optional()
    .nullable(),
  customerPhone: z.string().trim().optional().nullable(),
  cartSnapshot: z.array(cartItemInputSchema).min(1, "Cart cannot be empty"),
  subtotal: z.number().nonnegative(),
});

export const createStorefrontOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid customer email is required"),
  customerPhone: z.string().trim().min(5, "Customer phone number is required"),
  notes: z.string().trim().optional().nullable(),
  deliveryType: deliveryTypeEnum.default("HOME_DELIVERY"),
  shippingAddress: shippingAddressSchema.optional().nullable(),
  terminalRateId: z.string().optional().nullable(),
  deliveryFee: z.number().nonnegative().optional(),
  carrierName: z.string().optional().nullable(),
  items: z
    .array(cartItemInputSchema)
    .min(1, "Order must have at least one item"),
  checkoutSessionId: z.string().optional().nullable(),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: orderStatusEnum.optional(),
  paymentStatus: paymentStatusEnum.optional(),
  fulfillmentStatus: fulfillmentStatusEnum.optional(),
  tab: z
    .enum(["all", "unfulfilled", "completed", "abandoned"])
    .optional()
    .default("all"),
  sortBy: z.enum(["createdAt", "total", "orderNumber"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const orderIdParamsSchema = z.object({
  id: z.string().min(1, "Order ID is required"),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusEnum.optional(),
  fulfillmentStatus: fulfillmentStatusEnum.optional(),
  paymentStatus: paymentStatusEnum.optional(),
  trackingNumber: z.string().trim().optional().nullable(),
  courierName: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const manualOrderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unitPrice: z.number().nonnegative().optional(),
});

export const createManualOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid customer email is required"),
  customerPhone: z.string().trim().min(3, "Customer phone number is required"),
  items: z
    .array(manualOrderItemSchema)
    .min(1, "Order must have at least one item"),
  fulfillmentMode: manualFulfillmentModeEnum,
  shippingAddress: shippingAddressSchema.optional().nullable(),
  deliveryFee: z.number().nonnegative().optional().default(0),
  paymentStatus: z.enum(["PAID", "UNPAID", "PENDING"]).default("PAID"),
  paymentMethod: manualPaymentMethodEnum.default("CASH"),
  notes: z.string().trim().optional().nullable(),
});

export type CreateStorefrontOrderInput = z.infer<
  typeof createStorefrontOrderSchema
>;
export type SyncCheckoutSessionInput = z.infer<
  typeof syncCheckoutSessionSchema
>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CreateManualOrderInput = z.infer<typeof createManualOrderSchema>;
