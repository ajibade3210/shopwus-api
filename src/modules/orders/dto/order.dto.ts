import type {
  CheckoutSession,
  CheckoutSessionStatus,
  DeliveryType,
  FulfillmentStatus,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";
import { toFinancialAmount } from "../../../utils/currency.utils";

export interface OrderItemDto {
  id: string;
  orderId: string;
  productId?: string | null;
  variantId?: string | null;
  productName: string;
  variantTitle?: string | null;
  productSku?: string | null;
  productImage?: string | null;
  unitPrice: number;
  unitPriceKobo?: number;
  quantity: number;
  totalPrice: number;
  totalPriceKobo?: number;
  selectedOptions?: unknown;
  createdAt: string;
}

export interface OrderDto {
  id: string;
  businessId: string;
  customerId?: string | null;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string | null;
  currency: string;
  subtotal: number;
  subtotalKobo?: number;
  discountAmount: number;
  discountAmountKobo?: number;
  deliveryFee: number;
  deliveryFeeKobo?: number;
  platformFee: number;
  platformFeeKobo?: number;
  merchantEarnings: number;
  merchantEarningsKobo?: number;
  total: number;
  totalKobo?: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  deliveryType: DeliveryType;
  shippingAddress?: unknown;
  pickupLocation?: string | null;
  trackingNumber?: string | null;
  courierName?: string | null;
  estimatedDelivery?: string | null;
  fulfilledAt?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  items?: OrderItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutSessionDto {
  id: string;
  businessId: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  cartSnapshot: unknown;
  subtotal: number;
  subtotalKobo?: number;
  status: CheckoutSessionStatus;
  expiresAt: string;
  convertedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Serializers ───────────────────────────────────────────────────────────────

export function serializeOrderItem(item: OrderItem): OrderItemDto {
  return {
    id: item.id,
    orderId: item.orderId,
    productId: item.productId,
    variantId: item.variantId,
    productName: item.productName,
    variantTitle: item.variantTitle,
    productSku: item.productSku,
    productImage: item.productImage,
    ...toFinancialAmount(item.unitPrice, "unitPrice"),
    quantity: item.quantity,
    ...toFinancialAmount(item.totalPrice, "totalPrice"),
    selectedOptions: item.selectedOptions,
    createdAt: item.createdAt.toISOString(),
  };
}

export function serializeOrder(
  order: Order & {
    items?: OrderItem[];
    customer?: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    } | null;
  },
): OrderDto {
  return {
    id: order.id,
    businessId: order.businessId,
    customerId: order.customerId,
    customer: order.customer,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    notes: order.notes,
    currency: order.currency,
    ...toFinancialAmount(order.subtotal, "subtotal"),
    ...toFinancialAmount(order.discountAmount, "discountAmount"),
    ...toFinancialAmount(order.deliveryFee, "deliveryFee"),
    ...toFinancialAmount(order.platformFee, "platformFee"),
    ...toFinancialAmount(order.merchantEarnings, "merchantEarnings"),
    ...toFinancialAmount(order.total, "total"),
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    deliveryType: order.deliveryType,
    shippingAddress: order.shippingAddress,
    pickupLocation: order.pickupLocation,
    trackingNumber: order.trackingNumber,
    courierName: order.courierName,
    estimatedDelivery: order.estimatedDelivery
      ? order.estimatedDelivery.toISOString()
      : null,
    fulfilledAt: order.fulfilledAt ? order.fulfilledAt.toISOString() : null,
    paymentReference: order.paymentReference,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    items: order.items?.map(serializeOrderItem),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function serializeCheckoutSession(
  session: CheckoutSession,
): CheckoutSessionDto {
  return {
    id: session.id,
    businessId: session.businessId,
    customerEmail: session.customerEmail,
    customerPhone: session.customerPhone,
    customerName: session.customerName,
    cartSnapshot: session.cartSnapshot,
    ...toFinancialAmount(session.subtotal, "subtotal"),
    status: session.status,
    expiresAt: session.expiresAt.toISOString(),
    convertedAt: session.convertedAt ? session.convertedAt.toISOString() : null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}
