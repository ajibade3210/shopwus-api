import * as paystackLib from "../../src/lib/paystack";
import { prisma } from "../../src/lib/prisma";
import {
  executeLogisticsSweep,
  getUnsettledLogisticsSummary,
  handleTransferWebhook,
  recordDeliveryFeeCollected,
  voidDeliveryFee,
} from "../../src/modules/delivery/services/logistics-sweep.service";

jest.mock("../../src/lib/prisma", () => ({
  prisma: {
    logisticsLedgerEntry: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    logisticsSweep: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callbackOrPromises) => {
      if (typeof callbackOrPromises === "function") {
        return callbackOrPromises(prisma);
      }
      return Promise.all(callbackOrPromises);
    }),
  },
}));

describe("Logistics Sweep Treasury & Ledger Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("recordDeliveryFeeCollected", () => {
    it("should create a PENDING ledger entry when a valid delivery fee is passed", async () => {
      (
        prisma.logisticsLedgerEntry.findFirst as jest.Mock
      ).mockResolvedValueOnce(null);
      (prisma.logisticsLedgerEntry.create as jest.Mock).mockResolvedValueOnce({
        id: "entry_1",
        orderId: "order_1",
        amount: 3000,
        status: "PENDING",
      });

      await recordDeliveryFeeCollected("order_1", 3000);

      expect(prisma.logisticsLedgerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: "order_1",
          status: "PENDING",
        }),
      });
    });

    it("should ignore zero or negative delivery fees", async () => {
      await recordDeliveryFeeCollected("order_free", 0);
      expect(prisma.logisticsLedgerEntry.create).not.toHaveBeenCalled();
    });

    it("should ignore duplicate calls for the same order", async () => {
      (
        prisma.logisticsLedgerEntry.findFirst as jest.Mock
      ).mockResolvedValueOnce({
        id: "entry_existing",
        orderId: "order_dup",
        status: "PENDING",
      });

      await recordDeliveryFeeCollected("order_dup", 2500);
      expect(prisma.logisticsLedgerEntry.create).not.toHaveBeenCalled();
    });
  });

  describe("voidDeliveryFee", () => {
    it("should update pending ledger entries to VOIDED", async () => {
      (
        prisma.logisticsLedgerEntry.updateMany as jest.Mock
      ).mockResolvedValueOnce({
        count: 1,
      });

      await voidDeliveryFee("order_cancelled");

      expect(prisma.logisticsLedgerEntry.updateMany).toHaveBeenCalledWith({
        where: { orderId: "order_cancelled", status: "PENDING" },
        data: { status: "VOIDED" },
      });
    });
  });

  describe("getUnsettledLogisticsSummary", () => {
    it("should compute exact amountToTransfer and report IDLE status when no sweep is in flight", async () => {
      (prisma.logisticsLedgerEntry.findMany as jest.Mock).mockResolvedValueOnce(
        [{ amount: 3000 }, { amount: 2500 }],
      );
      (prisma.logisticsSweep.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: "sweep_prev",
          amount: 15000,
          ordersCount: 5,
          status: "SUCCESS",
          mode: "RECORD_ONLY",
          completedAt: new Date("2026-09-12"),
          transferReference: "SWEEP-WEEKLY-2026-W37",
        });

      const summary = await getUnsettledLogisticsSummary();

      expect(summary.status).toBe("IDLE");
      expect(summary.amountToTransfer).toBe(5500);
      expect(summary.amountToTransferKobo).toBe(550000);
      expect(summary.pendingOrdersCount).toBe(2);
      expect(summary.lastSweep).not.toBeNull();
      expect(summary.lastSweep?.amount).toBe(15000);
    });

    it("should report SWEEP_IN_FLIGHT when an in-flight sweep is pending", async () => {
      (prisma.logisticsLedgerEntry.findMany as jest.Mock).mockResolvedValueOnce(
        [],
      );
      (prisma.logisticsSweep.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: "sweep_inflight",
          amount: 20000,
          transferReference: "SWEEP-MANUAL-12345",
          mode: "AUTOMATED",
          createdAt: new Date(),
        })
        .mockResolvedValueOnce(null);

      const summary = await getUnsettledLogisticsSummary();

      expect(summary.status).toBe("SWEEP_IN_FLIGHT");
      expect(summary.inFlightSweep).not.toBeNull();
      expect(summary.inFlightSweep?.transferReference).toBe(
        "SWEEP-MANUAL-12345",
      );
    });
  });

  describe("executeLogisticsSweep", () => {
    it("should reject execution if an in-flight sweep is already pending", async () => {
      (prisma.logisticsSweep.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "sweep_active",
        transferReference: "SWEEP-WEEKLY-2026-W38",
      });

      await expect(executeLogisticsSweep("MANUAL")).rejects.toThrow(
        /A logistics sweep is already in flight/,
      );
    });

    it("should return NO_OP when there are no pending ledger entries", async () => {
      (prisma.logisticsSweep.findFirst as jest.Mock).mockResolvedValueOnce(
        null,
      );
      (prisma.logisticsLedgerEntry.findMany as jest.Mock).mockResolvedValueOnce(
        [],
      );

      const result = await executeLogisticsSweep("MANUAL");
      expect(result.mode).toBe("NO_OP");
      expect(result.amount).toBe(0);
    });

    it("should reconcile ledger in RECORD_ONLY mode without calling external Paystack transfer API", async () => {
      (prisma.logisticsSweep.findFirst as jest.Mock).mockResolvedValueOnce(
        null,
      );
      (prisma.logisticsLedgerEntry.findMany as jest.Mock).mockResolvedValueOnce(
        [
          { id: "e1", amount: 3000 },
          { id: "e2", amount: 2000 },
        ],
      );

      const mockCreateSweep = prisma.logisticsSweep.create as jest.Mock;
      mockCreateSweep.mockResolvedValueOnce({
        id: "sweep_rec_1",
        amount: 5000,
        ordersCount: 2,
        transferReference: "SWEEP-MANUAL-100",
        mode: "RECORD_ONLY",
        status: "SUCCESS",
      });

      const spyPaystack = jest.spyOn(paystackLib, "initiatePaystackTransfer");

      const result = await executeLogisticsSweep("MANUAL", true);

      expect(result.mode).toBe("RECORD_ONLY");
      expect(result.status).toBe("SUCCESS");
      expect(result.amount).toBe(5000);
      expect(spyPaystack).not.toHaveBeenCalled();
    });
  });

  describe("handleTransferWebhook", () => {
    it("should mark sweep as SUCCESS and settle ledger entries on transfer.success", async () => {
      (prisma.logisticsSweep.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "sweep_1",
        transferReference: "TRF_123",
      });

      await handleTransferWebhook("transfer.success", { reference: "TRF_123" });

      expect(prisma.logisticsSweep.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sweep_1" },
          data: expect.objectContaining({ status: "SUCCESS" }),
        }),
      );
      expect(prisma.logisticsLedgerEntry.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sweepId: "sweep_1" },
          data: expect.objectContaining({ status: "SETTLED" }),
        }),
      );
    });

    it("should mark sweep as FAILED and revert ledger entries to PENDING on transfer.failed", async () => {
      (prisma.logisticsSweep.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "sweep_2",
        transferReference: "TRF_FAIL",
      });

      await handleTransferWebhook("transfer.failed", {
        reference: "TRF_FAIL",
        reason: "Beneficiary bank down",
      });

      expect(prisma.logisticsSweep.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sweep_2" },
          data: expect.objectContaining({
            status: "FAILED",
            failureReason: "Beneficiary bank down",
          }),
        }),
      );
      expect(prisma.logisticsLedgerEntry.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sweepId: "sweep_2" },
          data: expect.objectContaining({ sweepId: null, status: "PENDING" }),
        }),
      );
    });
  });
});
