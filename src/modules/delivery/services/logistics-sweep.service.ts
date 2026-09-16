import { Prisma } from "@prisma/client";
import { env } from "../../../config/env";
import { BusinessRuleError } from "../../../lib/errors";
import { initiatePaystackTransfer } from "../../../lib/paystack";
import { prisma } from "../../../lib/prisma";
import { toFinancialAmount } from "../../../utils/currency.utils";

export const LOGISTICS_LEDGER_STATUS = {
  PENDING: "PENDING",
  SETTLED: "SETTLED",
  VOIDED: "VOIDED",
} as const;

export type LogisticsLedgerStatus =
  (typeof LOGISTICS_LEDGER_STATUS)[keyof typeof LOGISTICS_LEDGER_STATUS];

export const LOGISTICS_SWEEP_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export type LogisticsSweepStatus =
  (typeof LOGISTICS_SWEEP_STATUS)[keyof typeof LOGISTICS_SWEEP_STATUS];

export const LOGISTICS_SWEEP_MODE = {
  RECORD_ONLY: "RECORD_ONLY",
  AUTOMATED: "AUTOMATED",
} as const;

export type LogisticsSweepMode =
  (typeof LOGISTICS_SWEEP_MODE)[keyof typeof LOGISTICS_SWEEP_MODE];

function getIsoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function recordDeliveryFeeCollected(
  orderId: string,
  fee: number,
): Promise<void> {
  if (!fee || fee <= 0) return;

  const existing = await prisma.logisticsLedgerEntry.findFirst({
    where: {
      orderId,
      status: {
        in: [LOGISTICS_LEDGER_STATUS.PENDING, LOGISTICS_LEDGER_STATUS.SETTLED],
      },
    },
  });

  if (existing) return;

  await prisma.logisticsLedgerEntry.create({
    data: {
      orderId,
      amount: new Prisma.Decimal(fee),
      status: LOGISTICS_LEDGER_STATUS.PENDING,
    },
  });
}

export async function voidDeliveryFee(orderId: string): Promise<void> {
  await prisma.logisticsLedgerEntry.updateMany({
    where: {
      orderId,
      status: LOGISTICS_LEDGER_STATUS.PENDING,
    },
    data: {
      status: LOGISTICS_LEDGER_STATUS.VOIDED,
    },
  });
}

export async function getUnsettledLogisticsSummary() {
  const pendingEntries = await prisma.logisticsLedgerEntry.findMany({
    where: { status: LOGISTICS_LEDGER_STATUS.PENDING },
    select: { amount: true },
  });

  const pendingSum = pendingEntries.reduce(
    (sum, entry) => sum + Number(entry.amount),
    0,
  );
  const financial = toFinancialAmount(pendingSum, "amountToTransfer");

  const inFlightSweep = await prisma.logisticsSweep.findFirst({
    where: { status: LOGISTICS_SWEEP_STATUS.PENDING },
    orderBy: { createdAt: "desc" },
  });

  const lastSweep = await prisma.logisticsSweep.findFirst({
    where: { status: LOGISTICS_SWEEP_STATUS.SUCCESS },
    orderBy: { completedAt: "desc" },
  });

  return {
    status: inFlightSweep ? "SWEEP_IN_FLIGHT" : "IDLE",
    amountToTransfer: financial.amountToTransfer,
    amountToTransferKobo: financial.amountToTransferKobo,
    currency: "NGN",
    pendingOrdersCount: pendingEntries.length,
    autoSweepEnabled: env.LOGISTICS_AUTO_SWEEP_ENABLED === "true",
    recipientCodeConfigured: Boolean(env.TERMINAL_PAYSTACK_RECIPIENT_CODE),
    inFlightSweep: inFlightSweep
      ? {
          id: inFlightSweep.id,
          amount: Number(inFlightSweep.amount),
          transferReference: inFlightSweep.transferReference,
          mode: inFlightSweep.mode,
          createdAt: inFlightSweep.createdAt,
        }
      : null,
    lastSweep: lastSweep
      ? {
          id: lastSweep.id,
          amount: Number(lastSweep.amount),
          ordersCount: lastSweep.ordersCount,
          status: lastSweep.status,
          mode: lastSweep.mode,
          completedAt: lastSweep.completedAt,
          transferReference: lastSweep.transferReference,
        }
      : null,
  };
}

export async function executeLogisticsSweep(
  triggerType: "SCHEDULED" | "MANUAL" = "MANUAL",
  forceRecordOnly = false,
) {
  const existingInFlight = await prisma.logisticsSweep.findFirst({
    where: { status: LOGISTICS_SWEEP_STATUS.PENDING },
  });

  if (existingInFlight) {
    throw new BusinessRuleError(
      `A logistics sweep is already in flight (${existingInFlight.transferReference}). Please await webhook confirmation before sweeping again.`,
    );
  }

  const pendingEntries = await prisma.logisticsLedgerEntry.findMany({
    where: { status: LOGISTICS_LEDGER_STATUS.PENDING },
  });

  if (pendingEntries.length === 0) {
    return {
      success: true,
      message: "No pending delivery fees to sweep at this time.",
      amount: 0,
      ordersCount: 0,
      mode: "NO_OP",
    };
  }

  const totalAmountNum = pendingEntries.reduce(
    (sum, entry) => sum + Number(entry.amount),
    0,
  );

  if (totalAmountNum < 100) {
    return {
      success: true,
      message: `Pending balance (₦${totalAmountNum}) is below minimum sweep threshold of ₦100.`,
      amount: totalAmountNum,
      ordersCount: pendingEntries.length,
      mode: "THRESHOLD_NOT_MET",
    };
  }

  const totalAmount = new Prisma.Decimal(totalAmountNum);
  const now = new Date();
  const entryIds = pendingEntries.map((e) => e.id);

  const transferReference =
    triggerType === "SCHEDULED"
      ? `SWEEP-WEEKLY-${now.getFullYear()}-W${getIsoWeekNumber(now)}`
      : `SWEEP-MANUAL-${Date.now()}`;

  const isAutoSweep =
    env.LOGISTICS_AUTO_SWEEP_ENABLED === "true" && !forceRecordOnly;

  if (!isAutoSweep) {
    const sweep = await prisma.$transaction(async (tx) => {
      const createdSweep = await tx.logisticsSweep.create({
        data: {
          amount: totalAmount,
          ordersCount: pendingEntries.length,
          transferReference,
          mode: LOGISTICS_SWEEP_MODE.RECORD_ONLY,
          status: LOGISTICS_SWEEP_STATUS.SUCCESS,
          completedAt: now,
        },
      });

      await tx.logisticsLedgerEntry.updateMany({
        where: { id: { in: entryIds } },
        data: {
          sweepId: createdSweep.id,
          status: LOGISTICS_LEDGER_STATUS.SETTLED,
          settledAt: now,
        },
      });

      return createdSweep;
    });

    return {
      success: true,
      message: "Logistics ledger reconciled successfully (RECORD_ONLY mode).",
      sweepId: sweep.id,
      amount: Number(sweep.amount),
      ordersCount: sweep.ordersCount,
      transferReference: sweep.transferReference,
      mode: LOGISTICS_SWEEP_MODE.RECORD_ONLY,
      status: LOGISTICS_SWEEP_STATUS.SUCCESS,
    };
  }

  const recipientCode = env.TERMINAL_PAYSTACK_RECIPIENT_CODE;
  if (!recipientCode) {
    throw new BusinessRuleError(
      "TERMINAL_PAYSTACK_RECIPIENT_CODE is not configured in server environment.",
    );
  }

  const sweep = await prisma.$transaction(async (tx) => {
    const createdSweep = await tx.logisticsSweep.create({
      data: {
        amount: totalAmount,
        ordersCount: pendingEntries.length,
        transferReference,
        mode: LOGISTICS_SWEEP_MODE.AUTOMATED,
        status: LOGISTICS_SWEEP_STATUS.PENDING,
      },
    });

    await tx.logisticsLedgerEntry.updateMany({
      where: { id: { in: entryIds } },
      data: {
        sweepId: createdSweep.id,
      },
    });

    return createdSweep;
  });

  try {
    const amountInKobo = Math.round(totalAmountNum * 100);
    const transferRes = await initiatePaystackTransfer({
      amountInKobo,
      recipientCode,
      reference: transferReference,
      reason: `Shopwus weekly logistics sweep (${pendingEntries.length} orders)`,
    });

    await prisma.logisticsSweep.update({
      where: { id: sweep.id },
      data: {
        paystackTransferCode: transferRes.transfer_code,
      },
    });

    return {
      success: true,
      message: "Paystack transfer initiated. Awaiting webhook settlement confirmation.",
      sweepId: sweep.id,
      amount: totalAmountNum,
      ordersCount: pendingEntries.length,
      transferReference,
      transferCode: transferRes.transfer_code,
      mode: LOGISTICS_SWEEP_MODE.AUTOMATED,
      status: LOGISTICS_SWEEP_STATUS.PENDING,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to initiate Paystack transfer";

    await prisma.$transaction([
      prisma.logisticsSweep.update({
        where: { id: sweep.id },
        data: {
          status: LOGISTICS_SWEEP_STATUS.FAILED,
          failureReason: errorMsg,
        },
      }),
      prisma.logisticsLedgerEntry.updateMany({
        where: { id: { in: entryIds } },
        data: {
          sweepId: null,
          status: LOGISTICS_LEDGER_STATUS.PENDING,
        },
      }),
    ]);

    throw new BusinessRuleError(`Logistics sweep transfer failed: ${errorMsg}`);
  }
}

export async function handleTransferWebhook(
  event: "transfer.success" | "transfer.failed",
  data: {
    reference?: string;
    transfer_code?: string;
    reason?: string;
  },
): Promise<void> {
  const reference = data.reference;
  const transferCode = data.transfer_code;

  if (!reference && !transferCode) return;

  const filters = [];
  if (reference) filters.push({ transferReference: reference });
  if (transferCode) filters.push({ paystackTransferCode: transferCode });

  const sweep = await prisma.logisticsSweep.findFirst({
    where: { OR: filters },
  });

  if (!sweep) return;

  const now = new Date();

  if (event === "transfer.success") {
    if (sweep.status === LOGISTICS_SWEEP_STATUS.SUCCESS) return;

    await prisma.$transaction([
      prisma.logisticsSweep.update({
        where: { id: sweep.id },
        data: {
          status: LOGISTICS_SWEEP_STATUS.SUCCESS,
          completedAt: now,
        },
      }),
      prisma.logisticsLedgerEntry.updateMany({
        where: { sweepId: sweep.id },
        data: {
          status: LOGISTICS_LEDGER_STATUS.SETTLED,
          settledAt: now,
        },
      }),
    ]);
  } else if (event === "transfer.failed") {
    if (sweep.status === LOGISTICS_SWEEP_STATUS.FAILED) return;

    await prisma.$transaction([
      prisma.logisticsSweep.update({
        where: { id: sweep.id },
        data: {
          status: LOGISTICS_SWEEP_STATUS.FAILED,
          failureReason: data.reason || "Paystack transfer failed",
        },
      }),
      prisma.logisticsLedgerEntry.updateMany({
        where: { sweepId: sweep.id },
        data: {
          sweepId: null,
          status: LOGISTICS_LEDGER_STATUS.PENDING,
        },
      }),
    ]);
  }
}
