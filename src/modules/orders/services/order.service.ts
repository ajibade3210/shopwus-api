import {
  DeliveryType,
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { BusinessRuleError, NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { voidDeliveryFee } from "../../delivery/services/logistics-sweep.service";
import {
  type CreateManualOrderInput,
  type CreateStorefrontOrderInput,
  type ListOrdersQuery,
  MANUAL_FULFILLMENT_MODE,
  type SyncCheckoutSessionInput,
  type UpdateOrderStatusInput,
} from "../schema/order.schema";

export async function syncCheckoutSessionService(
  studioSlug: string,
  input: SyncCheckoutSessionInput,
  existingSessionId?: string,
) {
  const business = await prisma.business.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });

  if (!business) {
    throw new NotFoundError("Storefront not found");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Active for 7 days

  if (existingSessionId) {
    const existing = await prisma.checkoutSession.findFirst({
      where: { id: existingSessionId, businessId: business.id },
    });
    if (existing) {
      return prisma.checkoutSession.update({
        where: { id: existingSessionId },
        data: {
          customerName: input.customerName || existing.customerName,
          customerEmail: input.customerEmail || existing.customerEmail,
          customerPhone: input.customerPhone || existing.customerPhone,
          cartSnapshot: input.cartSnapshot as Prisma.InputJsonValue,
          subtotal: new Prisma.Decimal(input.subtotal),
          expiresAt,
        },
      });
    }
  }

  return prisma.checkoutSession.create({
    data: {
      businessId: business.id,
      customerName: input.customerName || null,
      customerEmail: input.customerEmail || null,
      customerPhone: input.customerPhone || null,
      cartSnapshot: input.cartSnapshot as Prisma.InputJsonValue,
      subtotal: new Prisma.Decimal(input.subtotal),
      status: "IN_PROGRESS",
      expiresAt,
    },
  });
}

async function getNextOrderNumber(businessId: string): Promise<string> {
  const currentYear = new Date().getFullYear();

  try {
    const sequence = await prisma.documentSequence.upsert({
      where: {
        businessId_type_year: {
          businessId,
          type: "ORDER",
          year: currentYear,
        },
      },
      update: {
        lastNumber: { increment: 1 },
      },
      create: {
        businessId,
        type: "ORDER",
        year: currentYear,
        lastNumber: 1,
      },
    });

    const paddedNumber = String(sequence.lastNumber).padStart(4, "0");
    return `ORD-${currentYear}-${paddedNumber}`;
  } catch (_error) {
    // Fallback if concurrent sequence lock occurs
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${currentYear}-${randomSuffix}`;
  }
}

export async function createStorefrontOrderService(
  studioSlug: string,
  input: CreateStorefrontOrderInput,
) {
  const business = await prisma.business.findUnique({
    where: { slug: studioSlug },
    include: {
      billing: true,
    },
  });

  if (!business) {
    throw new NotFoundError("Storefront not found");
  }

  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: {
      businessId: business.id,
      id: { in: productIds },
      status: "ACTIVE",
    },
    include: {
      variants: true,
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  // 1. Build line item snapshots and calculate subtotal
  let subtotalNumber = 0;
  const itemSnapshots: Array<{
    productId: string;
    variantId?: string | null;
    productName: string;
    variantTitle?: string | null;
    productSku: string | null;
    productImage: string | null;
    unitPrice: Prisma.Decimal;
    quantity: number;
    totalPrice: Prisma.Decimal;
    selectedOptions?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  }> = [];

  for (const cartItem of input.items) {
    const product = productMap.get(cartItem.productId);
    if (!product) {
      throw new BusinessRuleError(
        `Product with ID ${cartItem.productId} is no longer available.`,
      );
    }

    let unitPrice = product.price;
    let productSku = product.sku;
    let variantTitle: string | null = null;
    let variantId: string | null = null;

    if (cartItem.variantId) {
      const variant = product.variants.find((v) => v.id === cartItem.variantId);
      if (!variant) {
        throw new BusinessRuleError(
          `The selected variant for "${product.name}" is no longer available.`,
        );
      }

      if (
        product.trackInventory &&
        !product.allowBackorder &&
        variant.inventoryCount < cartItem.quantity
      ) {
        throw new BusinessRuleError(
          `Insufficient stock for "${product.name} • ${variant.title}". Available: ${variant.inventoryCount}, Requested: ${cartItem.quantity}.`,
        );
      }

      unitPrice = variant.price;
      productSku = variant.sku || product.sku;
      variantTitle = variant.title;
      variantId = variant.id;
    } else {
      if (
        product.trackInventory &&
        !product.allowBackorder &&
        product.inventoryCount < cartItem.quantity
      ) {
        throw new BusinessRuleError(
          `Insufficient stock for "${product.name}". Available: ${product.inventoryCount}, Requested: ${cartItem.quantity}.`,
        );
      }
    }

    const unitPriceNum = Number(unitPrice);
    const lineTotalNum = unitPriceNum * cartItem.quantity;
    subtotalNumber += lineTotalNum;

    itemSnapshots.push({
      productId: product.id,
      variantId,
      productName: product.name,
      variantTitle,
      productSku,
      productImage: product.images[0] || null,
      unitPrice,
      quantity: cartItem.quantity,
      totalPrice: new Prisma.Decimal(lineTotalNum),
      selectedOptions: cartItem.selectedOptions
        ? (cartItem.selectedOptions as Prisma.InputJsonValue)
        : undefined,
    });
  }

  // 2. Delivery Calculation
  let deliveryFeeNumber = 0;
  let pickupLocation: string | null = null;

  if (input.deliveryType === "STORE_PICKUP") {
    deliveryFeeNumber = 0;
    const storeParts = [
      business.addressLine1,
      business.addressLine2,
      business.city,
      business.state,
    ].filter(Boolean);
    pickupLocation =
      storeParts.length > 0
        ? storeParts.join(", ")
        : business.location || "Store Location";
  } else {
    // Home Delivery
    const freeThreshold = business.freeDeliveryThreshold
      ? Number(business.freeDeliveryThreshold)
      : null;
    if (freeThreshold !== null && subtotalNumber >= freeThreshold) {
      deliveryFeeNumber = 0;
    } else if (input.deliveryFee !== undefined) {
      deliveryFeeNumber = input.deliveryFee;
    } else {
      deliveryFeeNumber = business.fallbackShippingFee
        ? Number(business.fallbackShippingFee)
        : 3000;
    }
  }

  // 3. Platform Fee vs Merchant Earnings Calculation
  // Platform fee percentage applies ONLY to the product subtotal (Never to shipping)
  const platformFeePercent = business.billing?.platformFeePercent
    ? Number(business.billing.platformFeePercent)
    : 2.5; // Default 2.5% on free tier

  const platformFeeNumber = (subtotalNumber * platformFeePercent) / 100;
  const totalNumber = subtotalNumber + deliveryFeeNumber;
  // If delivery is managed via platform courier (Terminal), the delivery fee remains
  // with the platform to fund the courier wallet: merchant receives subtotal - platformFee
  const merchantEarningsNumber =
    input.terminalRateId || input.deliveryType === "HOME_DELIVERY"
      ? subtotalNumber - platformFeeNumber
      : totalNumber - platformFeeNumber;

  const orderNumber = await getNextOrderNumber(business.id);

  // 4. Atomic Transaction: Create Customer (if needed), Create Order + Items, Convert Checkout Session
  const order = await prisma.$transaction(
    async (tx) => {
      let customerId: string | null = null;
      const existingCustomer = await tx.customer.findFirst({
        where: {
          businessId: business.id,
          email: input.customerEmail.toLowerCase().trim(),
        },
      });

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCustomer = await tx.customer.create({
          data: {
            businessId: business.id,
            name: input.customerName.trim(),
            email: input.customerEmail.toLowerCase().trim(),
            phone: input.customerPhone.trim() || null,
          },
        });
        customerId = newCustomer.id;
      }

      const createdOrder = await tx.order.create({
        data: {
          businessId: business.id,
          customerId,
          orderNumber,
          customerName: input.customerName.trim(),
          customerEmail: input.customerEmail.toLowerCase().trim(),
          customerPhone: input.customerPhone.trim(),
          notes: input.notes || null,
          currency: business.currency || "NGN",
          subtotal: new Prisma.Decimal(subtotalNumber),
          deliveryFee: new Prisma.Decimal(deliveryFeeNumber),
          platformFee: new Prisma.Decimal(platformFeeNumber),
          merchantEarnings: new Prisma.Decimal(merchantEarningsNumber),
          total: new Prisma.Decimal(totalNumber),
          status: "OPEN",
          paymentStatus: "UNPAID",
          fulfillmentStatus: "UNFULFILLED",
          deliveryType: input.deliveryType,
          shippingAddress: input.shippingAddress
            ? (input.shippingAddress as Prisma.InputJsonValue)
            : undefined,
          pickupLocation,
          terminalRateId: input.terminalRateId || null,
          courierName: input.carrierName || null,
          paystackSubaccount: business.billing?.paystackSubaccount || null,
          items: {
            create: itemSnapshots,
          },
        },
        include: {
          items: true,
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
              currency: true,
              billing: true,
            },
          },
        },
      });

      if (input.checkoutSessionId) {
        await tx.checkoutSession.updateMany({
          where: { id: input.checkoutSessionId, businessId: business.id },
          data: {
            status: "CONVERTED",
            convertedAt: new Date(),
          },
        });
      }

      return createdOrder;
    },
    {
      maxWait: 2000,
      timeout: 5000,
    },
  );

  return order;
}

export async function createManualOrderService(
  businessId: string,
  input: CreateManualOrderInput,
) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { billing: true },
  });

  if (!business) {
    throw new NotFoundError("Business not found");
  }

  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: {
      businessId: business.id,
      id: { in: productIds },
    },
    include: {
      variants: true,
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  // 1. Build line item snapshots and calculate subtotal
  let subtotalNumber = 0;
  const itemSnapshots: Array<{
    productId: string;
    variantId?: string | null;
    productName: string;
    variantTitle?: string | null;
    productSku: string | null;
    productImage: string | null;
    unitPrice: Prisma.Decimal;
    quantity: number;
    totalPrice: Prisma.Decimal;
  }> = [];

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new BusinessRuleError(
        `Product with ID ${item.productId} was not found.`,
      );
    }

    let unitPrice =
      item.unitPrice !== undefined
        ? new Prisma.Decimal(item.unitPrice)
        : product.price;
    let productSku = product.sku;
    let variantTitle: string | null = null;
    let variantId: string | null = null;

    if (item.variantId) {
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new BusinessRuleError(
          `Selected variant for "${product.name}" was not found.`,
        );
      }
      if (
        product.trackInventory &&
        !product.allowBackorder &&
        variant.inventoryCount < item.quantity
      ) {
        throw new BusinessRuleError(
          `Insufficient stock for "${product.name} • ${variant.title}". Available: ${variant.inventoryCount}, Requested: ${item.quantity}.`,
        );
      }
      if (item.unitPrice === undefined) {
        unitPrice = variant.price;
      }
      productSku = variant.sku || product.sku;
      variantTitle = variant.title;
      variantId = variant.id;
    } else {
      if (
        product.trackInventory &&
        !product.allowBackorder &&
        product.inventoryCount < item.quantity
      ) {
        throw new BusinessRuleError(
          `Insufficient stock for "${product.name}". Available: ${product.inventoryCount}, Requested: ${item.quantity}.`,
        );
      }
    }

    const unitPriceNum = Number(unitPrice);
    const lineTotalNum = unitPriceNum * item.quantity;
    subtotalNumber += lineTotalNum;

    itemSnapshots.push({
      productId: product.id,
      variantId,
      productName: product.name,
      variantTitle,
      productSku,
      productImage: product.images[0] || null,
      unitPrice,
      quantity: item.quantity,
      totalPrice: new Prisma.Decimal(lineTotalNum),
    });
  }

  // 2. Fulfillment and delivery mapping
  let deliveryFeeNumber = 0;
  let deliveryType: DeliveryType = DeliveryType.STORE_PICKUP;
  let fulfillmentStatus: FulfillmentStatus = FulfillmentStatus.UNFULFILLED;
  let status: OrderStatus = OrderStatus.CONFIRMED;
  let pickupLocation: string | null = null;

  if (input.fulfillmentMode === MANUAL_FULFILLMENT_MODE.DIRECT_SALE) {
    deliveryType = DeliveryType.STORE_PICKUP;
    deliveryFeeNumber = 0;
    fulfillmentStatus = FulfillmentStatus.DELIVERED;
    status =
      input.paymentStatus === PaymentStatus.PAID
        ? OrderStatus.COMPLETED
        : OrderStatus.CONFIRMED;
  } else if (input.fulfillmentMode === MANUAL_FULFILLMENT_MODE.STORE_PICKUP) {
    deliveryType = DeliveryType.STORE_PICKUP;
    deliveryFeeNumber = 0;
    fulfillmentStatus = FulfillmentStatus.READY_FOR_PICKUP;
    status = OrderStatus.CONFIRMED;
    const storeParts = [
      business.addressLine1,
      business.addressLine2,
      business.city,
      business.state,
    ].filter(Boolean);
    pickupLocation =
      storeParts.length > 0
        ? storeParts.join(", ")
        : business.location || "Store Location";
  } else {
    // SHIP_TO_CUSTOMER
    deliveryType = DeliveryType.HOME_DELIVERY;
    deliveryFeeNumber = input.deliveryFee ?? 0;
    fulfillmentStatus = FulfillmentStatus.UNFULFILLED;
    status = OrderStatus.CONFIRMED;
  }

  const totalNumber = subtotalNumber + deliveryFeeNumber;
  const merchantEarningsNumber = totalNumber; // In-house direct sales have 0 platform fee deduction

  const orderNumber = await getNextOrderNumber(business.id);

  // 3. Atomic Transaction: Upsert customer, decrement stock, create order, fulfillment & optional transaction
  const order = await prisma.$transaction(
    async (tx) => {
      let customerId: string | null = null;
      const existingCustomer = await tx.customer.findFirst({
        where: {
          businessId: business.id,
          email: input.customerEmail.toLowerCase().trim(),
        },
      });

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCustomer = await tx.customer.create({
          data: {
            businessId: business.id,
            name: input.customerName.trim(),
            email: input.customerEmail.toLowerCase().trim(),
            phone: input.customerPhone.trim() || null,
          },
        });
        customerId = newCustomer.id;
      }

      // Decrement stock for tracked items
      for (const item of input.items) {
        const product = productMap.get(item.productId);
        if (product?.trackInventory) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { inventoryCount: { decrement: item.quantity } },
            });
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { inventoryCount: { decrement: item.quantity } },
          });
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          businessId: business.id,
          customerId,
          orderNumber,
          customerName: input.customerName.trim(),
          customerEmail: input.customerEmail.toLowerCase().trim(),
          customerPhone: input.customerPhone.trim(),
          notes: input.notes || null,
          currency: business.currency || "NGN",
          subtotal: new Prisma.Decimal(subtotalNumber),
          deliveryFee: new Prisma.Decimal(deliveryFeeNumber),
          platformFee: new Prisma.Decimal(0),
          merchantEarnings: new Prisma.Decimal(merchantEarningsNumber),
          total: new Prisma.Decimal(totalNumber),
          status,
          paymentStatus: input.paymentStatus,
          fulfillmentStatus,
          fulfilledAt: fulfillmentStatus === "DELIVERED" ? new Date() : null,
          deliveryType,
          shippingAddress: input.shippingAddress
            ? (input.shippingAddress as Prisma.InputJsonValue)
            : undefined,
          pickupLocation,
          items: {
            create: itemSnapshots,
          },
        },
        include: {
          items: true,
          customer: true,
          fulfillments: true,
          transactions: true,
        },
      });

      // Create initial fulfillment record
      await tx.orderFulfillment.create({
        data: {
          orderId: createdOrder.id,
          status: fulfillmentStatus,
          notes:
            input.fulfillmentMode === "DIRECT_SALE"
              ? "In-store manual sale handed over to customer"
              : input.notes || undefined,
        },
      });

      // If paid, create PaymentTransaction for bookkeeping
      if (input.paymentStatus === "PAID") {
        const cleanNum = orderNumber.replace(/[^A-Za-z0-9]/g, "");
        const reference = `ORD-MANUAL-${cleanNum}-${Date.now()}`;
        await tx.paymentTransaction.create({
          data: {
            orderId: createdOrder.id,
            businessId: business.id,
            reference,
            amount: new Prisma.Decimal(totalNumber),
            platformFee: new Prisma.Decimal(0),
            gatewayFee: new Prisma.Decimal(0),
            merchantSettlement: new Prisma.Decimal(totalNumber),
            currency: business.currency || "NGN",
            channel: input.paymentMethod || "CASH",
            status: "SUCCESS",
            paidAt: new Date(),
          },
        });
      }

      return createdOrder;
    },
    {
      maxWait: 3000,
      timeout: 10000,
    },
  );

  return order;
}

export async function listOrdersService(
  businessId: string,
  query: ListOrdersQuery,
) {
  const {
    page,
    limit,
    search,
    status,
    paymentStatus,
    fulfillmentStatus,
    tab,
    sortBy,
    sortOrder,
  } = query;
  const skip = (page - 1) * limit;

  // Handle Abandoned Checkouts tab
  if (tab === "abandoned") {
    const sessionWhere: Prisma.CheckoutSessionWhereInput = {
      businessId,
      status: { in: ["ABANDONED", "IN_PROGRESS"] },
    };

    if (search?.trim()) {
      const term = search.trim();
      sessionWhere.OR = [
        { customerName: { contains: term, mode: "insensitive" } },
        { customerEmail: { contains: term, mode: "insensitive" } },
        { customerPhone: { contains: term, mode: "insensitive" } },
      ];
    }

    const [sessions, total] = await Promise.all([
      prisma.checkoutSession.findMany({
        where: sessionWhere,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.checkoutSession.count({ where: sessionWhere }),
    ]);

    return {
      items: sessions,
      isAbandonedTab: true,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + sessions.length < total,
      },
    };
  }

  const where: Prisma.OrderWhereInput = {
    businessId,
  };

  if (tab === "unfulfilled") {
    where.paymentStatus = "PAID";
    where.fulfillmentStatus = { notIn: ["DELIVERED", "CANCELLED"] };
  } else if (tab === "completed") {
    where.fulfillmentStatus = "DELIVERED";
  }

  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (fulfillmentStatus) where.fulfillmentStatus = fulfillmentStatus;

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { orderNumber: { contains: term, mode: "insensitive" } },
      { customerName: { contains: term, mode: "insensitive" } },
      { customerEmail: { contains: term, mode: "insensitive" } },
      { customerPhone: { contains: term, mode: "insensitive" } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      include: {
        items: true,
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items: orders,
    isAbandonedTab: false,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + orders.length < total,
    },
  };
}

export async function getOrderSummaryService(businessId: string) {
  const [totalOrders, unfulfilled, pendingPayment, abandonedCount, revenueAgg] =
    await Promise.all([
      prisma.order.count({ where: { businessId } }),
      prisma.order.count({
        where: {
          businessId,
          paymentStatus: "PAID",
          fulfillmentStatus: { notIn: ["DELIVERED", "CANCELLED"] },
        },
      }),
      prisma.order.count({
        where: {
          businessId,
          paymentStatus: "UNPAID",
          status: "OPEN",
        },
      }),
      prisma.checkoutSession.count({
        where: {
          businessId,
          status: { in: ["ABANDONED", "IN_PROGRESS"] },
        },
      }),
      prisma.order.aggregate({
        where: { businessId, paymentStatus: "PAID" },
        _sum: { total: true, merchantEarnings: true },
      }),
    ]);

  return {
    totalOrders,
    unfulfilled,
    pendingPayment,
    abandonedCount,
    totalRevenue: revenueAgg._sum.total || 0,
    merchantEarnings: revenueAgg._sum.merchantEarnings || 0,
  };
}

export async function getOrderByIdService(id: string, businessId: string) {
  const order = await prisma.order.findFirst({
    where: { id, businessId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
              inventoryCount: true,
            },
          },
        },
      },
      customer: true,
      fulfillments: {
        orderBy: { createdAt: "desc" },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  return order;
}

export async function updateOrderStatusService(
  id: string,
  businessId: string,
  input: UpdateOrderStatusInput,
) {
  const order = await prisma.order.findFirst({
    where: { id, businessId },
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const updateData: Prisma.OrderUpdateInput = {};

  if (input.status) updateData.status = input.status;
  if (input.paymentStatus) updateData.paymentStatus = input.paymentStatus;
  if (input.fulfillmentStatus) {
    updateData.fulfillmentStatus = input.fulfillmentStatus;
    if (input.fulfillmentStatus === FulfillmentStatus.DELIVERED) {
      updateData.fulfilledAt = new Date();
    }
  }
  if (input.trackingNumber !== undefined)
    updateData.trackingNumber = input.trackingNumber;
  if (input.courierName !== undefined)
    updateData.courierName = input.courierName;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: updateData,
    include: {
      items: true,
      customer: true,
      fulfillments: true,
      transactions: true,
    },
  });

  if (
    input.fulfillmentStatus &&
    input.fulfillmentStatus !== order.fulfillmentStatus
  ) {
    await prisma.orderFulfillment.create({
      data: {
        orderId: id,
        status: input.fulfillmentStatus,
        trackingNumber: input.trackingNumber || order.trackingNumber,
        courierName: input.courierName || order.courierName,
        notes: input.notes,
      },
    });
  }

  if (
    input.status === OrderStatus.CANCELLED ||
    input.fulfillmentStatus === FulfillmentStatus.CANCELLED ||
    input.paymentStatus === PaymentStatus.REFUNDED
  ) {
    await voidDeliveryFee(id);
  }

  return updatedOrder;
}
