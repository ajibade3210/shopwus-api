import type {
  BusinessBilling,
  Prisma,
  TransactionStatus,
} from "@prisma/client";
import { toFinancialAmount } from "../../../utils/currency.utils";

export interface BusinessBillingDto {
  id: string;
  businessId: string;
  paystackSubaccount?: string | null;
  bankCode?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  isVerified: boolean;
  planTier: string;
  platformFeePercent: number;
  subscriptionStatus: string;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransactionDto {
  id: string;
  orderId: string;
  businessId: string;
  orderNumber?: string;
  customerName?: string;
  reference: string;
  amount: number;
  amountKobo?: number;
  platformFee: number;
  platformFeeKobo?: number;
  gatewayFee: number;
  gatewayFeeKobo?: number;
  merchantSettlement: number;
  merchantSettlementKobo?: number;
  currency: string;
  channel?: string | null;
  status: TransactionStatus;
  paidAt: string;
  createdAt: string;
}

export interface BillingSummaryDto {
  billing: BusinessBillingDto | null;
  stats: {
    totalVolume: number;
    totalVolumeKobo?: number;
    totalSettled: number;
    totalSettledKobo?: number;
    totalPlatformFees: number;
    totalPlatformFeesKobo?: number;
    totalTransactions: number;
  };
  transactions: PaymentTransactionDto[];
}

export function serializeBusinessBilling(
  b: BusinessBilling,
): BusinessBillingDto {
  return {
    id: b.id,
    businessId: b.businessId,
    paystackSubaccount: b.paystackSubaccount,
    bankCode: b.bankCode,
    bankName: b.bankName,
    accountNumber: b.accountNumber,
    accountName: b.accountName,
    isVerified: b.isVerified,
    planTier: b.planTier,
    platformFeePercent: Number(b.platformFeePercent),
    subscriptionStatus: b.subscriptionStatus,
    currentPeriodEnd: b.currentPeriodEnd
      ? b.currentPeriodEnd.toISOString()
      : null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export function serializePaymentTransaction(tx: {
  id: string;
  orderId?: string;
  businessId?: string;
  orderNumber?: string;
  customerName?: string;
  reference: string;
  amount: number | Prisma.Decimal;
  platformFee?: number | Prisma.Decimal;
  gatewayFee?: number | Prisma.Decimal;
  merchantSettlement?: number | Prisma.Decimal;
  currency?: string;
  channel?: string | null;
  status: TransactionStatus;
  paidAt: Date | string;
  createdAt?: Date | string;
  order?: { orderNumber: string; customerName: string } | null;
}): PaymentTransactionDto {
  const paidAtStr =
    typeof tx.paidAt === "string" ? tx.paidAt : tx.paidAt.toISOString();
  const createdAtStr = tx.createdAt
    ? typeof tx.createdAt === "string"
      ? tx.createdAt
      : tx.createdAt.toISOString()
    : paidAtStr;

  return {
    id: tx.id,
    orderId: tx.orderId || "",
    businessId: tx.businessId || "",
    orderNumber: tx.orderNumber || tx.order?.orderNumber,
    customerName: tx.customerName || tx.order?.customerName,
    reference: tx.reference,
    ...toFinancialAmount(tx.amount, "amount"),
    ...toFinancialAmount(tx.platformFee ?? 0, "platformFee"),
    ...toFinancialAmount(tx.gatewayFee ?? 0, "gatewayFee"),
    ...toFinancialAmount(tx.merchantSettlement ?? 0, "merchantSettlement"),
    currency: tx.currency || "NGN",
    channel: tx.channel,
    status: tx.status,
    paidAt: paidAtStr,
    createdAt: createdAtStr,
  };
}
