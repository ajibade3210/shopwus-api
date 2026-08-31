import { prisma } from "../../../lib/prisma";
import {
  calculateNiceCeiling,
  formatCompact,
  generateSvgChartPaths,
  generateTimeBuckets,
  getCurrencySymbol,
} from "../../../utils";
import { calculateAdvancedStudioValuationService } from "../../valuation/services/valuation.service";
import type {
  AnalyticsOverviewDto,
  ExpenseCategorySummaryDto,
  TrendingServiceDto,
} from "../dto/analytics.dto";

export async function getAnalyticsOverviewService(
  businessId: string,
  timeframe:
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "yearly" = "monthly",
): Promise<AnalyticsOverviewDto> {
  const now = new Date();

  let startDate: Date;
  let prevStartDate: Date;
  let timeframeLabel: string;

  if (timeframe === "daily") {
    startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    timeframeLabel = "Today";
  } else if (timeframe === "weekly") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    timeframeLabel = "Past 7 Days";
  } else if (timeframe === "quarterly") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    prevStartDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    timeframeLabel = "This Quarter";
  } else if (timeframe === "yearly") {
    startDate = new Date(now.getFullYear(), 0, 1);
    prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
    timeframeLabel = `Annual ${now.getFullYear()}`;
  } else {
    // monthly default
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    timeframeLabel = "This Month";
  }

  // Concurrently fetch all necessary data strictly from the database
  const [
    business,
    allInvoices,
    periodInvoices,
    prevInvoices,
    allExpenses,
    periodExpenses,
    prevExpenses,
    allLeads,
    periodLeads,
    prevLeads,
    recentActivities,
    periodActivitiesCount,
    prevActivitiesCount,
    allActivitiesCount,
    campaignRecipients,
    prevCampaignRecipients,
    customerServices,
    services,
    valuationData,
  ] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: { currency: true },
    }),
    prisma.invoice.findMany({
      where: { businessId },
      select: { id: true, total: true, status: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: {
        businessId,
        createdAt: { gte: startDate },
      },
      select: { id: true, total: true, status: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: {
        businessId,
        createdAt: { gte: prevStartDate, lt: startDate },
      },
      select: { id: true, total: true, status: true, createdAt: true },
    }),
    prisma.expense.findMany({ where: { businessId } }),
    prisma.expense.findMany({
      where: {
        businessId,
        date: { gte: startDate },
      },
    }),
    prisma.expense.findMany({
      where: {
        businessId,
        date: { gte: prevStartDate, lt: startDate },
      },
    }),
    prisma.lead.findMany({ where: { businessId } }),
    prisma.lead.findMany({
      where: {
        businessId,
        createdAt: { gte: startDate },
      },
    }),
    prisma.lead.findMany({
      where: {
        businessId,
        createdAt: { gte: prevStartDate, lt: startDate },
      },
    }),
    prisma.customerActivity.findMany({
      where: { businessId },
      orderBy: { timestamp: "desc" },
      take: 8,
    }),
    prisma.customerActivity.count({
      where: {
        businessId,
        timestamp: { gte: startDate },
      },
    }),
    prisma.customerActivity.count({
      where: {
        businessId,
        timestamp: { gte: prevStartDate, lt: startDate },
      },
    }),
    prisma.customerActivity.count({
      where: { businessId },
    }),
    prisma.broadcastCampaign.aggregate({
      where: {
        businessId,
        sentAt: { gte: startDate },
      },
      _sum: { recipientCount: true },
    }),
    prisma.broadcastCampaign.aggregate({
      where: {
        businessId,
        sentAt: { gte: prevStartDate, lt: startDate },
      },
      _sum: { recipientCount: true },
    }),
    prisma.customerService.findMany({
      where: { businessId },
      include: { customer: true },
    }),
    prisma.service.findMany({
      where: { businessId },
    }),
    calculateAdvancedStudioValuationService(businessId).catch(() => null),
  ]);

  const currencySymbol = getCurrencySymbol(business?.currency);

  // Compute Revenue
  const currentRevenue = periodInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((acc, inv) => acc + Number(inv.total), 0);

  const prevRevenue = prevInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((acc, inv) => acc + Number(inv.total), 0);

  const revGrowth =
    prevRevenue > 0
      ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
      : currentRevenue > 0
        ? 100
        : 0;

  const revProgress =
    prevRevenue > 0
      ? Math.min(
          100,
          Math.round(
            (currentRevenue / Math.max(prevRevenue, currentRevenue, 1)) * 100,
          ),
        )
      : currentRevenue > 0
        ? 100
        : 0;

  // Compute Expenses
  const currentExpenseTotal = periodExpenses.reduce(
    (acc, e) => acc + Number(e.amount),
    0,
  );
  const prevExpenseTotal = prevExpenses.reduce(
    (acc, e) => acc + Number(e.amount),
    0,
  );

  const expGrowth =
    prevExpenseTotal > 0
      ? ((currentExpenseTotal - prevExpenseTotal) / prevExpenseTotal) * 100
      : currentExpenseTotal > 0
        ? 100
        : 0;

  const expProgress =
    currentRevenue > 0
      ? Math.min(100, Math.round((currentExpenseTotal / currentRevenue) * 100))
      : currentExpenseTotal > 0
        ? 100
        : 0;

  // Compute Net Profit
  const netProfit = currentRevenue - currentExpenseTotal;
  const isProfitable = netProfit >= 0;
  const profitMargin =
    currentRevenue > 0 ? Math.round((netProfit / currentRevenue) * 100) : 0;

  // Compute Leads / Inquiries
  const totalLeadsCount = periodLeads.length;
  const prevLeadsCount = prevLeads.length;
  const convertedLeadsCount = periodLeads.filter(
    (l) => l.status === "converted",
  ).length;

  const conversionRate =
    totalLeadsCount > 0
      ? Math.round((convertedLeadsCount / totalLeadsCount) * 100)
      : 0;

  const leadGrowth =
    prevLeadsCount > 0
      ? ((totalLeadsCount - prevLeadsCount) / prevLeadsCount) * 100
      : totalLeadsCount > 0
        ? 100
        : 0;

  // Storefront Views & Engagement Telemetry
  const periodCampaignTotal = campaignRecipients._sum.recipientCount || 0;
  const prevCampaignTotal = prevCampaignRecipients._sum.recipientCount || 0;

  const currentPeriodViews =
    periodActivitiesCount + totalLeadsCount + periodCampaignTotal;
  const prevPeriodViews =
    prevActivitiesCount + prevLeadsCount + prevCampaignTotal;

  // If no period events, use all-time activity and lead interactions
  const totalViewsNumber =
    currentPeriodViews > 0
      ? currentPeriodViews
      : allActivitiesCount + allLeads.length;

  const viewsGrowth =
    prevPeriodViews > 0
      ? ((currentPeriodViews - prevPeriodViews) / prevPeriodViews) * 100
      : currentPeriodViews > 0
        ? 100
        : 0;

  // Spending Category Breakdown
  const expensesForBreakdown =
    periodExpenses.length > 0 ? periodExpenses : allExpenses;
  const expenseCategoryMap = new Map<string, number>();

  for (const exp of expensesForBreakdown) {
    const cat = exp.category || "General";
    expenseCategoryMap.set(
      cat,
      (expenseCategoryMap.get(cat) || 0) + Number(exp.amount),
    );
  }

  const breakdownTotal = Array.from(expenseCategoryMap.values()).reduce(
    (acc, amt) => acc + amt,
    0,
  );

  const expenseCategoryBreakdown: ExpenseCategorySummaryDto[] = Array.from(
    expenseCategoryMap.entries(),
  )
    .map(([category, amount]) => ({
      category,
      label: category,
      amount,
      percentage:
        breakdownTotal > 0 ? Math.round((amount / breakdownTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Top Trending Services strictly from Database
  const serviceStatsMap = new Map<
    string,
    { price: number; volume: number; category: string }
  >();

  // Aggregate CustomerServices
  for (const cs of customerServices) {
    const key = cs.name;
    const existing = serviceStatsMap.get(key) || {
      price: Number(cs.amount),
      volume: 0,
      category: cs.service || "",
    };
    existing.volume += 1;
    serviceStatsMap.set(key, existing);
  }

  // Include configured business services if not yet populated
  for (const s of services) {
    if (!serviceStatsMap.has(s.name)) {
      serviceStatsMap.set(s.name, {
        price: Number(s.price || 0),
        volume: 0,
        category: s.category || "Service",
      });
    }
  }

  const trendingServices: TrendingServiceDto[] = Array.from(
    serviceStatsMap.entries(),
  )
    .map(([name, stats]) => ({
      name,
      category: stats.category,
      price: stats.price,
      volume: stats.volume,
    }))
    .sort((a, b) => {
      if (b.volume !== a.volume) return b.volume - a.volume;
      return b.price - a.price;
    });

  // Dynamic Sales & Cashflow Chart
  const buckets = generateTimeBuckets(timeframe, startDate, now);
  const bucketValues: number[] = [];

  for (const bucket of buckets) {
    const bucketInvoices = periodInvoices.filter((inv) => {
      if (inv.status !== "paid") return false;
      const invDate = new Date(inv.createdAt);
      return invDate >= bucket.start && invDate <= bucket.end;
    });
    const bucketRev = bucketInvoices.reduce(
      (acc, inv) => acc + Number(inv.total),
      0,
    );
    bucketValues.push(bucketRev);
  }

  const maxVal = Math.max(...bucketValues, 0);
  const gridMax = calculateNiceCeiling(maxVal);

  const startX = 40;
  const endX = 800;
  const bottomY = 240;
  const topY = 40;
  const heightRange = bottomY - topY;

  const points = buckets.map((_, idx) => {
    const x =
      buckets.length > 1
        ? startX + (idx / (buckets.length - 1)) * (endX - startX)
        : (startX + endX) / 2;
    const val = bucketValues[idx] || 0;
    const y =
      maxVal > 0
        ? Math.round(bottomY - (val / gridMax) * heightRange)
        : bottomY;
    return { x: Math.round(x), y, val };
  });

  const { linePath, areaPath } = generateSvgChartPaths(
    points,
    startX,
    endX,
    bottomY,
  );

  let peakIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].val > points[peakIdx].val) {
      peakIdx = i;
    }
  }

  const peakPoint = points[peakIdx] || {
    x: (startX + endX) / 2,
    y: bottomY,
    val: 0,
  };

  const yLabels = [
    formatCompact(gridMax),
    formatCompact(gridMax * 0.8),
    formatCompact(gridMax * 0.6),
    formatCompact(gridMax * 0.4),
    formatCompact(gridMax * 0.2),
    "0",
  ];

  // Invoices counts
  const paidInvoices = allInvoices.filter((inv) => inv.status === "paid");
  const pendingInvoices = allInvoices.filter(
    (inv) => inv.status === "sent" || inv.status === "draft",
  );
  const pendingAmount = pendingInvoices.reduce(
    (acc, inv) => acc + Number(inv.total),
    0,
  );

  return {
    timeframe,
    timeframeLabel,
    views: {
      value: totalViewsNumber.toLocaleString(),
      rawNumber: totalViewsNumber,
      change: `${viewsGrowth >= 0 ? "+" : ""}${viewsGrowth.toFixed(1)}%`,
      isPositive: viewsGrowth >= 0,
      progressPercent:
        prevPeriodViews > 0
          ? Math.min(
              100,
              Math.round(
                (currentPeriodViews / Math.max(prevPeriodViews, 1)) * 100,
              ),
            )
          : currentPeriodViews > 0
            ? 100
            : 0,
    },
    leads: {
      value: String(totalLeadsCount),
      rawNumber: totalLeadsCount,
      change:
        conversionRate > 0
          ? `+${conversionRate}% conv.`
          : `${leadGrowth >= 0 ? "+" : ""}${leadGrowth.toFixed(0)}% vs prev`,
      isPositive: totalLeadsCount >= prevLeadsCount,
      progressPercent: Math.min(100, conversionRate),
    },
    revenue: {
      value: `${currencySymbol}${currentRevenue.toLocaleString()}`,
      rawNumber: currentRevenue,
      change: `${revGrowth >= 0 ? "+" : ""}${revGrowth.toFixed(1)}%`,
      isPositive: currentRevenue >= prevRevenue,
      progressPercent: revProgress,
    },
    expenses: {
      value: `${currencySymbol}${currentExpenseTotal.toLocaleString()}`,
      rawNumber: currentExpenseTotal,
      change: `${expGrowth >= 0 ? "+" : ""}${expGrowth.toFixed(1)}%`,
      isPositive: currentExpenseTotal <= prevExpenseTotal,
      progressPercent: expProgress,
    },
    netProfit: {
      value: `${currencySymbol}${netProfit.toLocaleString()}`,
      rawNumber: netProfit,
      change: isProfitable
        ? `+${profitMargin}% margin`
        : `-${Math.abs(profitMargin)}% deficit`,
      isPositive: isProfitable,
      progressPercent: Math.min(100, Math.max(0, profitMargin)),
    },
    expenseCategoryBreakdown,
    chart: {
      peakValue: formatCompact(peakPoint.val),
      peakCoord: { cx: peakPoint.x, cy: peakPoint.y },
      linePath,
      areaPath,
      xLabels: buckets.map((b) => b.label),
      yLabels,
    },
    trendingServices,
    recentActivities: recentActivities.map((a) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      timestamp: a.timestamp.toISOString(),
    })),
    invoices: {
      paidCount: paidInvoices.length,
      pendingCount: pendingInvoices.length,
      pendingAmount,
    },
    valuation: valuationData
      ? {
          multiple: valuationData.multiple,
          estimatedValuation: valuationData.midpoint,
        }
      : undefined,
  };
}
