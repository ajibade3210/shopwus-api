import { describe, expect, it, jest } from "@jest/globals";
import { analyticsQuerySchema } from "../../src/modules/analytics/schema/analytics.schema";

describe("Analytics Module Unit Tests", () => {
  describe("Analytics Validation Schemas", () => {
    it("validates allowed timeframes", () => {
      const validMonthly = analyticsQuerySchema.safeParse({
        timeframe: "monthly",
      });
      expect(validMonthly.success).toBe(true);

      const validDaily = analyticsQuerySchema.safeParse({ timeframe: "daily" });
      expect(validDaily.success).toBe(true);

      const validYearly = analyticsQuerySchema.safeParse({
        timeframe: "yearly",
      });
      expect(validYearly.success).toBe(true);
    });

    it("defaults to monthly timeframe when omitted", () => {
      const parsed = analyticsQuerySchema.parse({});
      expect(parsed.timeframe).toBe("monthly");
    });

    it("rejects unsupported timeframe keys", () => {
      const invalid = analyticsQuerySchema.safeParse({ timeframe: "hourly" });
      expect(invalid.success).toBe(false);
    });
  });

  describe("Analytics Utility Functions", () => {
    it("formats compact numbers accurately", async () => {
      const { formatCompact } = await import("../../src/utils/analytics.utils");
      expect(formatCompact(0)).toBe("0");
      expect(formatCompact(850)).toBe("850");
      expect(formatCompact(1500)).toBe("1.5k");
      expect(formatCompact(250000)).toBe("250k");
      expect(formatCompact(1200000)).toBe("1.2M");
      expect(formatCompact(5000000)).toBe("5M");
    });

    it("calculates nice ceiling for chart bounds", async () => {
      const { calculateNiceCeiling } = await import(
        "../../src/utils/analytics.utils"
      );
      expect(calculateNiceCeiling(0)).toBe(1000);
      expect(calculateNiceCeiling(850)).toBe(1000);
      expect(calculateNiceCeiling(1250)).toBe(2000);
      expect(calculateNiceCeiling(2300)).toBe(2500);
      expect(calculateNiceCeiling(4200)).toBe(5000);
      expect(calculateNiceCeiling(89000)).toBe(100000);
    });

    it("generates time buckets for daily, weekly, monthly, quarterly, yearly", async () => {
      const { generateTimeBuckets } = await import(
        "../../src/utils/analytics.utils"
      );
      const now = new Date();
      const dailyBuckets = generateTimeBuckets("daily", now, now);
      expect(dailyBuckets.length).toBe(5);

      const weeklyBuckets = generateTimeBuckets(
        "weekly",
        new Date(now.getTime() - 7 * 86400000),
        now,
      );
      expect(weeklyBuckets.length).toBe(7);

      const monthlyBuckets = generateTimeBuckets("monthly", now, now);
      expect(monthlyBuckets.length).toBe(5);
    });

    it("generates smooth SVG paths from points", async () => {
      const { generateSvgChartPaths } = await import(
        "../../src/utils/analytics.utils"
      );
      const points = [
        { x: 40, y: 240, val: 0 },
        { x: 230, y: 150, val: 500 },
        { x: 420, y: 80, val: 1000 },
        { x: 610, y: 180, val: 400 },
        { x: 800, y: 240, val: 0 },
      ];
      const { linePath, areaPath } = generateSvgChartPaths(points);
      expect(linePath.startsWith("M 40 240")).toBe(true);
      expect(linePath.includes("C")).toBe(true);
      expect(areaPath.endsWith("Z")).toBe(true);
    });
  });

  describe("Analytics Overview Service", () => {
    it("aggregates data dynamically from database and returns zero metrics when empty", async () => {
      const { prisma } = await import("../../src/lib/prisma");

      jest.spyOn(prisma.business, "findUnique").mockResolvedValue({
        currency: "NGN",
      } as unknown as Awaited<ReturnType<typeof prisma.business.findUnique>>);
      jest.spyOn(prisma.invoice, "findMany").mockResolvedValue([]);
      jest.spyOn(prisma.expense, "findMany").mockResolvedValue([]);
      jest.spyOn(prisma.lead, "findMany").mockResolvedValue([]);
      jest.spyOn(prisma.customerActivity, "findMany").mockResolvedValue([]);
      jest.spyOn(prisma.customerActivity, "count").mockResolvedValue(0);
      jest.spyOn(prisma.broadcastCampaign, "aggregate").mockResolvedValue({
        _sum: { recipientCount: 0 },
      } as unknown as Awaited<
        ReturnType<typeof prisma.broadcastCampaign.aggregate>
      >);
      jest.spyOn(prisma.customerService, "findMany").mockResolvedValue([]);
      jest.spyOn(prisma.service, "findMany").mockResolvedValue([]);

      const { getAnalyticsOverviewService } = await import(
        "../../src/modules/analytics/services/analytics-overview.service"
      );

      const result = await getAnalyticsOverviewService("mock-biz-id");

      expect(result).toBeDefined();
      expect(result.revenue.rawNumber).toBe(0);
      expect(result.revenue.value).toBe("₦0");
      expect(result.expenses.rawNumber).toBe(0);
      expect(result.expenses.value).toBe("₦0");
      expect(result.netProfit.rawNumber).toBe(0);
      expect(result.leads.rawNumber).toBe(0);
      expect(result.views.rawNumber).toBe(0);
      expect(result.trendingServices).toEqual([]);
      expect(result.chart.xLabels.length).toBeGreaterThan(0);
      expect(result.chart.yLabels.length).toBe(6);
    });

    it("correctly aggregates revenue, expenses, profit margin and trending services from db records", async () => {
      const { prisma } = await import("../../src/lib/prisma");

      const mockDate = new Date();

      jest.spyOn(prisma.business, "findUnique").mockResolvedValue({
        currency: "USD",
      } as unknown as Awaited<ReturnType<typeof prisma.business.findUnique>>);
      jest.spyOn(prisma.invoice, "findMany").mockResolvedValue([
        {
          id: "inv-1",
          total: 1000,
          status: "paid",
          createdAt: mockDate,
        },
        {
          id: "inv-2",
          total: 500,
          status: "sent",
          createdAt: mockDate,
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.invoice.findMany>>);
      jest.spyOn(prisma.expense, "findMany").mockResolvedValue([
        {
          id: "exp-1",
          amount: 300,
          category: "Software",
          date: mockDate,
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.expense.findMany>>);
      jest.spyOn(prisma.lead, "findMany").mockResolvedValue([
        { id: "lead-1", status: "converted", createdAt: mockDate },
        { id: "lead-2", status: "new", createdAt: mockDate },
      ] as unknown as Awaited<ReturnType<typeof prisma.lead.findMany>>);
      jest.spyOn(prisma.customerActivity, "findMany").mockResolvedValue([
        {
          id: "act-1",
          type: "service",
          description: "Project started",
          timestamp: mockDate,
        },
      ] as unknown as Awaited<
        ReturnType<typeof prisma.customerActivity.findMany>
      >);
      jest.spyOn(prisma.customerActivity, "count").mockResolvedValue(1);
      jest.spyOn(prisma.broadcastCampaign, "aggregate").mockResolvedValue({
        _sum: { recipientCount: 50 },
      } as unknown as Awaited<
        ReturnType<typeof prisma.broadcastCampaign.aggregate>
      >);
      jest.spyOn(prisma.customerService, "findMany").mockResolvedValue([
        {
          id: "cs-1",
          name: "Brand Design",
          service: "Identity",
          amount: 1000,
          status: "active",
        },
      ] as unknown as Awaited<
        ReturnType<typeof prisma.customerService.findMany>
      >);
      jest.spyOn(prisma.service, "findMany").mockResolvedValue([]);

      const { getAnalyticsOverviewService } = await import(
        "../../src/modules/analytics/services/analytics-overview.service"
      );

      const result = await getAnalyticsOverviewService("mock-biz-id");

      expect(result.revenue.rawNumber).toBe(1000);
      expect(result.revenue.value).toBe("$1,000");
      expect(result.expenses.rawNumber).toBe(300);
      expect(result.expenses.value).toBe("$300");
      expect(result.netProfit.rawNumber).toBe(700);
      expect(result.netProfit.value).toBe("$700");
      expect(result.leads.rawNumber).toBe(2);
      expect(result.leads.change).toBe("+50% conv.");
      expect(result.expenseCategoryBreakdown).toEqual([
        {
          category: "Software",
          label: "Software",
          amount: 300,
          percentage: 100,
        },
      ]);
      expect(result.trendingServices).toEqual([
        { name: "Brand Design", category: "Identity", price: 1000, volume: 1 },
      ]);
      expect(result.invoices?.paidCount).toBe(1);
      expect(result.invoices?.pendingCount).toBe(1);
      expect(result.invoices?.pendingAmount).toBe(500);
    });
  });
});
