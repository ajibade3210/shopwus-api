import type { AxiosResponse } from "axios";
import {
  DELIVERY_BUFFER_CONFIG,
  DELIVERY_FALLBACK_CONFIG,
  TERMINAL_CONFIG,
} from "../../../config/constants/delivery.constants";
import { BusinessRuleError, NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { getTerminalClient } from "../../../lib/terminal.client";
import { toFinancialAmount } from "../../../utils/currency.utils";
import type {
  DeliveryQuoteDto,
  TerminalQuoteResponse,
} from "../dto/delivery.dto";
import type { GetStorefrontDeliveryQuotesInput } from "../schema/delivery.schema";

export function applyDeliveryBuffer(baseRate: number): number {
  if (!baseRate || baseRate <= 0) return 0;
  const percentageBuffer =
    (baseRate * DELIVERY_BUFFER_CONFIG.BUFFER_PERCENT) / 100;
  const bufferToAdd = Math.max(
    percentageBuffer,
    DELIVERY_BUFFER_CONFIG.MIN_BUFFER_NAIRA,
  );
  const rawTotal = baseRate + bufferToAdd;
  return (
    Math.ceil(rawTotal / DELIVERY_BUFFER_CONFIG.ROUND_TO_NEAREST) *
    DELIVERY_BUFFER_CONFIG.ROUND_TO_NEAREST
  );
}

function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || "Customer";
  const lastName = parts.slice(1).join(" ") || firstName;
  return { firstName, lastName };
}

export async function getStorefrontDeliveryQuotesService(
  studioSlug: string,
  input: GetStorefrontDeliveryQuotesInput,
): Promise<DeliveryQuoteDto[]> {
  const business = await prisma.business.findUnique({
    where: { slug: studioSlug },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      senderPhone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      fallbackShippingFee: true,
    },
  });

  if (!business) {
    throw new NotFoundError("Storefront not found");
  }

  const fallbackFeeNum = business.fallbackShippingFee
    ? Number(business.fallbackShippingFee)
    : DELIVERY_FALLBACK_CONFIG.DEFAULT_FALLBACK_FEE;

  const fallbackQuote: DeliveryQuoteDto = {
    rateId: "fallback_standard",
    carrierName: DELIVERY_FALLBACK_CONFIG.DEFAULT_CARRIER_NAME,
    carrierSlug: "standard-delivery",
    carrierLogo: null,
    deliveryEta: null,
    deliveryTime: DELIVERY_FALLBACK_CONFIG.DEFAULT_ESTIMATED_DAYS,
    currency: TERMINAL_CONFIG.DEFAULT_CURRENCY,
    fee: fallbackFeeNum,
    feeKobo: fallbackFeeNum * 100,
  };

  // If merchant store origin address is not configured, immediately serve fallback rate
  if (!business.addressLine1 || !business.city || !business.state) {
    return [fallbackQuote];
  }

  // Calculate parcel items and total weight
  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, businessId: business.id },
    select: { id: true, name: true, price: true, weightKg: true },
  });

  let totalWeight = 0;
  const parcelItems: Array<{
    name: string;
    description: string;
    weight: number;
    quantity: number;
    value: number;
    currency: string;
  }> = [];

  for (const item of input.items) {
    const product = products.find((p) => p.id === item.productId);
    const weightPerUnit = product?.weightKg
      ? Number(product.weightKg)
      : TERMINAL_CONFIG.DEFAULT_PARCEL_WEIGHT_KG;
    const lineWeight = weightPerUnit * item.quantity;
    totalWeight += lineWeight;

    parcelItems.push({
      name: product?.name || "Store Product",
      description: "Fashion & Atelier Merchandise",
      weight: Math.max(0.1, lineWeight),
      quantity: item.quantity,
      value: product ? Number(product.price) * item.quantity : 1000,
      currency: TERMINAL_CONFIG.DEFAULT_CURRENCY,
    });
  }

  const senderNames = splitFullName(business.name);
  const recipientNames = splitFullName(input.destination.recipientName);

  const client = getTerminalClient();

  try {
    const payload = {
      pickup_address: {
        first_name: senderNames.firstName,
        last_name: senderNames.lastName,
        email: business.email || "support@shopwus.com",
        phone: business.senderPhone || business.phone || "+2348000000000",
        line1: business.addressLine1,
        line2: business.addressLine2 || "",
        city: business.city,
        state: business.state,
        country: TERMINAL_CONFIG.DEFAULT_COUNTRY_CODE,
        zip: business.postalCode || TERMINAL_CONFIG.DEFAULT_POSTAL_CODE,
      },
      delivery_address: {
        first_name: recipientNames.firstName,
        last_name: recipientNames.lastName,
        email: "customer@shopwus.com",
        phone: input.destination.phone,
        line1: input.destination.addressLine1,
        line2: input.destination.addressLine2 || "",
        city: input.destination.city,
        state: input.destination.state,
        country: TERMINAL_CONFIG.DEFAULT_COUNTRY_CODE,
        zip:
          input.destination.postalCode || TERMINAL_CONFIG.DEFAULT_POSTAL_CODE,
      },
      parcel: {
        weight: Math.max(0.2, totalWeight),
        items: parcelItems,
      },
      currency: TERMINAL_CONFIG.DEFAULT_CURRENCY,
      persist_data: true,
    };

    const response = await client.post<TerminalQuoteResponse>(
      "/rates/shipment/quotes",
      payload,
    );

    if (
      response.data?.status &&
      Array.isArray(response.data.data) &&
      response.data.data.length > 0
    ) {
      return response.data.data.map((rate) => {
        const bufferedAmount = applyDeliveryBuffer(rate.amount);
        const financial = toFinancialAmount(bufferedAmount, "fee");
        return {
          rateId: rate.id,
          carrierName: rate.carrier_name,
          carrierSlug: rate.carrier_slug || null,
          carrierLogo: rate.carrier_logo || null,
          deliveryEta: rate.delivery_eta || null,
          deliveryTime: rate.delivery_time || null,
          currency: rate.currency || TERMINAL_CONFIG.DEFAULT_CURRENCY,
          fee: financial.fee,
          feeKobo: financial.feeKobo,
        };
      });
    }

    // If no couriers returned, use fallback rate
    return [fallbackQuote];
  } catch (_error) {
    // Graceful fallback on API errors, timeouts, or network drops
    return [fallbackQuote];
  }
}

export async function dispatchOrderWithTerminalService(
  orderId: string,
  businessId: string,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, businessId },
    include: {
      business: true,
      items: {
        include: { product: true },
      },
      customer: true,
    },
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  if (
    order.fulfillmentStatus === "DISPATCHED" ||
    order.fulfillmentStatus === "DELIVERED"
  ) {
    throw new BusinessRuleError(
      "Order has already been dispatched or delivered.",
    );
  }

  if (order.deliveryType !== "HOME_DELIVERY") {
    throw new BusinessRuleError(
      "This order is designated for Store Pickup and cannot be dispatched via courier.",
    );
  }

  if (order.terminalShipmentId) {
    throw new BusinessRuleError(
      `A courier shipment is already booked for this order (${order.terminalShipmentId}).`,
    );
  }

  const business = order.business;
  if (!business.addressLine1 || !business.city || !business.state) {
    throw new BusinessRuleError(
      "Store pickup address is not configured. Please add your store address in Settings before booking courier pickup.",
    );
  }

  const shippingAddress =
    (order.shippingAddress as Record<string, unknown> | null) || {};
  const destinationAddressLine1 = String(
    shippingAddress.addressLine1 || "",
  ).trim();
  const destinationCity = String(shippingAddress.city || "").trim();
  const destinationState = String(shippingAddress.state || "").trim();

  if (!destinationAddressLine1 || !destinationCity || !destinationState) {
    throw new BusinessRuleError(
      "Order destination shipping address is incomplete. Address, city, and state are required.",
    );
  }

  let rateIdToUse = order.terminalRateId;

  // If no rateId saved, or need a fresh quote, fetch live quote
  if (!rateIdToUse) {
    const quotes = await getStorefrontDeliveryQuotesService(business.slug, {
      destination: {
        recipientName: order.customerName,
        phone: order.customerPhone,
        addressLine1: destinationAddressLine1,
        addressLine2: shippingAddress.addressLine2
          ? String(shippingAddress.addressLine2)
          : null,
        city: destinationCity,
        state: destinationState,
        postalCode: shippingAddress.postalCode
          ? String(shippingAddress.postalCode)
          : null,
      },
      items: order.items.map((i) => ({
        productId: i.productId || "",
        variantId: i.variantId || undefined,
        quantity: i.quantity,
      })),
    });

    const validQuote = quotes.find((q) => q.rateId);
    if (!validQuote) {
      throw new BusinessRuleError(
        "No courier rates available for this delivery route. Please check destination details or fulfill manually.",
      );
    }

    rateIdToUse = validQuote.rateId;
    if (validQuote.carrierName) {
      order.courierName = validQuote.carrierName;
    }
  }

  const client = getTerminalClient();

  interface AxiosLikeError {
    response?: {
      data?: {
        message?: string;
        error?: string;
      };
    };
    message?: string;
  }

  let response: AxiosResponse<unknown> | undefined;
  try {
    response = await client.post("/shipments/pickup", {
      rate_id: rateIdToUse,
    });
  } catch (initialError: unknown) {
    // If saved rate was expired or rejected, attempt fresh rate refresh
    try {
      const freshQuotes = await getStorefrontDeliveryQuotesService(
        business.slug,
        {
          destination: {
            recipientName: order.customerName,
            phone: order.customerPhone,
            addressLine1: destinationAddressLine1,
            addressLine2: shippingAddress.addressLine2
              ? String(shippingAddress.addressLine2)
              : null,
            city: destinationCity,
            state: destinationState,
            postalCode: shippingAddress.postalCode
              ? String(shippingAddress.postalCode)
              : null,
          },
          items: order.items.map((i) => ({
            productId: i.productId || "",
            variantId: i.variantId || undefined,
            quantity: i.quantity,
          })),
        },
      );

      const freshQuote = freshQuotes.find((q) => q.rateId);
      if (freshQuote && freshQuote.rateId !== rateIdToUse) {
        rateIdToUse = freshQuote.rateId;
        if (freshQuote.carrierName) {
          order.courierName = freshQuote.carrierName;
        }
        response = await client.post("/shipments/pickup", {
          rate_id: rateIdToUse,
        });
      } else {
        throw initialError;
      }
    } catch (_fallbackErr) {
      const err = initialError as AxiosLikeError;
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to arrange courier pickup";

      throw new BusinessRuleError(`Terminal Africa dispatch failed: ${msg}`);
    }
  }

  const resData =
    (response?.data as Record<string, unknown>)?.data ||
    response?.data ||
    {};
  const shipmentData = resData as Record<string, unknown>;

  const shipmentId = String(
    shipmentData.shipment_id || shipmentData.id || `SH-${Date.now()}`,
  );

  const extras = (shipmentData.extras as Record<string, unknown>) || {};
  const trackingNumber = String(
    shipmentData.tracking_number || extras.tracking_number || shipmentId,
  );

  const trackingUrl = String(
    shipmentData.tracking_url ||
      extras.carrier_tracking_url ||
      `https://track.terminal.africa/${shipmentId}`,
  );

  const carrierName = String(
    shipmentData.carrier_name || order.courierName || "Terminal Africa",
  );

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        terminalRateId: rateIdToUse,
        terminalShipmentId: shipmentId,
        trackingNumber,
        trackingUrl,
        courierName: carrierName,
        fulfillmentStatus: "DISPATCHED",
        status: order.status === "OPEN" ? "CONFIRMED" : order.status,
      },
      include: {
        items: true,
        customer: true,
        fulfillments: true,
        transactions: true,
      },
    }),
    prisma.orderFulfillment.create({
      data: {
        orderId: order.id,
        status: "DISPATCHED",
        trackingNumber,
        courierName: carrierName,
        terminalShipmentId: shipmentId,
        trackingUrl,
        notes: `Dispatched via Terminal Africa (${carrierName})`,
      },
    }),
  ]);

  return updatedOrder;
}

