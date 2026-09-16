import { Prisma } from "@prisma/client";
import { NotFoundError, PaymentError } from "../../../lib/errors";
import {
  createPaystackSubaccount,
  initializeSplitPayment,
  listPaystackBanks,
  type PaystackWebhookPayload,
  resolveBankAccount,
} from "../../../lib/paystack";
import { prisma } from "../../../lib/prisma";
import {
  recordDeliveryFeeCollected,
  handleTransferWebhook,
} from "../../delivery/services/logistics-sweep.service";
import type {
  ResolveAccountInput,
  UpdatePayoutAccountInput,
} from "../schema/billing.schema";

export async function getBanksListService() {
  return listPaystackBanks();
}

export async function resolveAccountService(input: ResolveAccountInput) {
  return resolveBankAccount(input.accountNumber, input.bankCode);
}

export async function updatePayoutAccountService(
  businessId: string,
  input: UpdatePayoutAccountInput,
) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { billing: true },
  });

  if (!business) {
    throw new NotFoundError("Business not found");
  }

  const resolved = await resolveBankAccount(
    input.accountNumber,
    input.bankCode,
  );

  const subaccount = await createPaystackSubaccount({
    business_name: business.name,
    settlement_bank: input.bankCode,
    account_number: input.accountNumber,
    percentage_charge: Number(business.billing?.platformFeePercent || 2.5),
    description: `Shopwus settlement account for ${business.name}`,
  });

  return prisma.businessBilling.upsert({
    where: { businessId },
    create: {
      businessId,
      bankCode: input.bankCode,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName: resolved.account_name,
      paystackSubaccount: subaccount.subaccount_code,
      isVerified: true,
    },
    update: {
      bankCode: input.bankCode,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName: resolved.account_name,
      paystackSubaccount: subaccount.subaccount_code,
      isVerified: true,
    },
  });
}

export async function getBillingSummaryService(businessId: string) {
  let billing = await prisma.businessBilling.findUnique({
    where: { businessId },
  });

  if (!billing) {
    billing = await prisma.businessBilling.create({
      data: {
        businessId,
        planTier: "FREE",
        platformFeePercent: new Prisma.Decimal(2.5),
      },
    });
  }

  const transactions = await prisma.paymentTransaction.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
        },
      },
    },
  });

  const totalSettled = await prisma.paymentTransaction.aggregate({
    where: { businessId, status: "SUCCESS" },
    _sum: {
      merchantSettlement: true,
      amount: true,
      platformFee: true,
    },
  });

  return {
    billing,
    stats: {
      totalVolume: totalSettled._sum.amount
        ? Number(totalSettled._sum.amount)
        : 0,
      totalSettled: totalSettled._sum.merchantSettlement
        ? Number(totalSettled._sum.merchantSettlement)
        : 0,
      totalPlatformFees: totalSettled._sum.platformFee
        ? Number(totalSettled._sum.platformFee)
        : 0,
    },
    transactions: transactions.map((tx) => ({
      id: tx.id,
      orderNumber: tx.order?.orderNumber || "—",
      customerName: tx.order?.customerName || "—",
      reference: tx.reference,
      amount: Number(tx.amount),
      merchantSettlement: Number(tx.merchantSettlement),
      platformFee: Number(tx.platformFee),
      status: tx.status,
      paidAt: tx.paidAt,
    })),
  };
}

export async function initializeOrderPaymentService(
  orderId: string,
  callbackUrl?: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      business: {
        include: { billing: true },
      },
      items: true,
    },
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  if (order.paymentStatus === "PAID") {
    throw new PaymentError("This order has already been paid");
  }

  const subaccountCode = order.business.billing?.paystackSubaccount;
  if (!subaccountCode) {
    throw new PaymentError(
      "The merchant has not linked a settlement bank account yet. Please contact support.",
    );
  }

  const reference = `ORD-PAY-${order.orderNumber.replace(/[^A-Za-z0-9]/g, "")}-${Date.now()}`;
  const totalInKobo = Math.round(Number(order.total) * 100);
  const merchantEarningsInKobo = Math.round(
    Number(order.merchantEarnings) * 100,
  );
  // Platform retains platformFee + deliveryFee (funding the central Terminal wallet)
  const platformRetentionInKobo = Math.max(
    0,
    totalInKobo - merchantEarningsInKobo,
  );

  const initData = await initializeSplitPayment({
    email: order.customerEmail,
    amountInKobo: totalInKobo,
    subaccountCode,
    platformFeeInKobo: platformRetentionInKobo,
    reference,
    callbackUrl,
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      businessId: order.businessId,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      platformFee: Number(order.platformFee),
      merchantEarnings: Number(order.merchantEarnings),
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentReference: reference,
    },
  });

  return initData;
}

export async function processPaystackWebhookService(
  eventData: PaystackWebhookPayload,
) {
  const eventType = eventData.event;
  const data = eventData.data;

  if (eventType === "charge.success") {
    const reference = data.reference;
    const metadata = data.metadata || {};
    const orderId = metadata.orderId;
    const businessId = metadata.businessId;

    if (!reference) return;

    const existingTx = await prisma.paymentTransaction.findUnique({
      where: { reference },
    });

    if (existingTx && existingTx.status === "SUCCESS") {
      return;
    }

    const totalAmount = new Prisma.Decimal(data.amount / 100);
    const platformFee = metadata.platformFee
      ? new Prisma.Decimal(metadata.platformFee)
      : new Prisma.Decimal(0);
    const gatewayFee = new Prisma.Decimal((data.fees || 0) / 100);

    await prisma.$transaction(
      async (tx) => {
        if (orderId && businessId) {
          const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true },
          });

          // Merchant settlement corresponds directly to order.merchantEarnings
          const merchantSettlement = order
            ? order.merchantEarnings
            : totalAmount.minus(platformFee);

          await tx.paymentTransaction.upsert({
            where: { reference },
            create: {
              reference,
              orderId,
              businessId,
              amount: totalAmount,
              platformFee,
              gatewayFee,
              merchantSettlement,
              currency: data.currency || "NGN",
              channel: data.channel || "card",
              status: "SUCCESS",
              rawWebhookData: data as Prisma.InputJsonValue,
              paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
            },
            update: {
              status: "SUCCESS",
              rawWebhookData: data as Prisma.InputJsonValue,
              paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
            },
          });

          if (order && order.paymentStatus !== "PAID") {
            await tx.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: "PAID",
                paymentReference: reference,
              },
            });

            for (const item of order.items) {
              if (item.variantId) {
                await tx.productVariant.updateMany({
                  where: {
                    id: item.variantId,
                    inventoryCount: { gte: item.quantity },
                  },
                  data: {
                    inventoryCount: {
                      decrement: item.quantity,
                    },
                  },
                });

                if (item.productId) {
                  await tx.product.updateMany({
                    where: {
                      id: item.productId,
                      trackInventory: true,
                    },
                    data: {
                      inventoryCount: {
                        decrement: item.quantity,
                      },
                    },
                  });
                }
              } else if (item.productId) {
                await tx.product.updateMany({
                  where: {
                    id: item.productId,
                    trackInventory: true,
                    inventoryCount: { gte: item.quantity },
                  },
                  data: {
                    inventoryCount: {
                      decrement: item.quantity,
                    },
                  },
                });
              }
            }

            await tx.orderFulfillment.create({
              data: {
                orderId,
                status: "PROCESSING",
                notes: "Payment verified via Paystack Split Settlement",
              },
            });

            if (
              order?.deliveryFee &&
              Number(order.deliveryFee) > 0 &&
              (order.terminalRateId || order.deliveryType === "HOME_DELIVERY")
            ) {
              await recordDeliveryFeeCollected(order.id, Number(order.deliveryFee));
            }
          }
        }
      },
      {
        maxWait: 2000,
        timeout: 5000,
      },
    );
  } else if (
    eventType === "transfer.success" ||
    eventType === "transfer.failed"
  ) {
    await handleTransferWebhook(eventType, data);
  }
}
