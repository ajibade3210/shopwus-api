import {
  VALUATION_GROWTH_LEVERS,
  VALUATION_TIER_CONFIG,
} from "../../../config/constants/valuation";
import { prisma } from "../../../lib/prisma";
import {
  determinePublicValuationTier,
  determineStudioValuationTier,
  getCurrencySymbol,
} from "../../../utils";
import type {
  BusinessValuationDto,
  PublicValuationResultDto,
  ValuationDriverDto,
} from "../dto/valuation.dto";
import type { PublicValuationInputs } from "../schema/valuation.schema";

export async function calculatePublicValuationService(
  inputs: PublicValuationInputs,
): Promise<PublicValuationResultDto> {
  const {
    currency,
    industry,
    annualRevenue,
    annualExpenses,
    netAssets,
    customerRetentionRate,
    email,
    phone,
  } = inputs;

  const averageNetProfit = Math.max(0, annualRevenue - annualExpenses);
  const profitMargin =
    annualRevenue > 0
      ? Math.round((averageNetProfit / annualRevenue) * 100)
      : 0;

  let baseMultiple = 3.2;
  if (industry === "digital_tech") baseMultiple = 4.2;
  else if (industry === "fashion_apparel") baseMultiple = 2.8;
  else if (industry === "hospitality_events") baseMultiple = 3.0;

  if (profitMargin >= 40) baseMultiple += 0.4;
  else if (profitMargin >= 20) baseMultiple += 0.2;
  else if (profitMargin < 10 && profitMargin > 0) baseMultiple -= 0.3;

  const retentionBoost = (customerRetentionRate / 100) * 0.8;
  baseMultiple += retentionBoost;

  const maxCap = industry === "digital_tech" ? 6.0 : 4.8;
  const multiple = Number(
    Math.min(maxCap, Math.max(1.5, baseMultiple)).toFixed(1),
  );

  const earningsValue = averageNetProfit * multiple;
  const approximateValue = Math.round(earningsValue + netAssets);

  const valuationRangeLow =
    averageNetProfit > 0
      ? Math.round(averageNetProfit * (multiple * 0.88) + netAssets * 0.95)
      : Math.round(netAssets * 0.9);

  const valuationRangeHigh =
    averageNetProfit > 0
      ? Math.round(averageNetProfit * (multiple * 1.15) + netAssets * 1.05)
      : Math.round(netAssets * 1.1);

  const tier = determinePublicValuationTier(
    averageNetProfit,
    profitMargin,
    customerRetentionRate,
  );

  const tierConfig = VALUATION_TIER_CONFIG[tier];

  const drivers: ValuationDriverDto[] = [
    {
      id: "net_profit",
      name: "Annual Net Profit",
      value: `${profitMargin}% Margin`,
      impact: profitMargin >= 30 ? "high" : "positive",
      detail: "Annual cashflow after deducting all operating expenses",
    },
    {
      id: "sde_multiple",
      name: "Profit Multiple",
      value: `${multiple}x`,
      impact: multiple >= 3.0 ? "high" : "neutral",
      detail: "Industry baseline + client retention equity score",
    },
    {
      id: "net_assets",
      name: "Net Assets",
      value: "Balance Sheet",
      impact: netAssets > 0 ? "positive" : "neutral",
      detail: "Tangible business assets, inventory, and equipment",
    },
    {
      id: "retention",
      name: "Repeat Customer Rate",
      value: `${customerRetentionRate}% Repeat`,
      impact: customerRetentionRate >= 40 ? "high" : "positive",
      detail: "Repeat purchase velocity and customer loyalty",
    },
  ];

  const growthOpportunities = [
    `Increasing repeat customer rate from ${customerRetentionRate}% to ${Math.min(100, customerRetentionRate + 20)}% could add up to +0.3x to your valuation multiple.`,
    "Centralizing customer records into an exportable CRM eliminates buyer risk during due diligence.",
    "Categorizing operating expenses and issuing digital receipts protects your valuation from tax penalties.",
    "Broadcasting seasonal drops via WhatsApp to past buyers generates high-margin repeat revenue.",
  ];

  // Optionally persist record
  if (email || phone) {
    prisma.valuationRecord
      .create({
        data: {
          email: email?.toLowerCase().trim(),
          phone: phone?.trim(),
          monthlyRevenue: Math.round(annualRevenue / 12),
          clientCount: Math.round(customerRetentionRate),
          studioType: industry,
          valuationScore: approximateValue,
        },
      })
      .catch(() => {});
  }

  return {
    currency,
    annualRevenue,
    annualExpenses,
    averageNetProfit,
    netAssets,
    multiple,
    approximateValue,
    valuationRangeLow,
    valuationRangeHigh,
    tier,
    tierLabel: tierConfig.label,
    tierDescription: tierConfig.description,
    profitMargin,
    calculatedAt: new Date().toISOString(),
    drivers,
    growthOpportunities,
  };
}

export async function calculateAdvancedStudioValuationService(
  businessId: string,
  options?: { monthlyRevenueOverride?: number },
): Promise<BusinessValuationDto> {
  const [business, customers, expenses, leads, invoices] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.customer.findMany({ where: { businessId } }),
    prisma.expense.findMany({ where: { businessId } }),
    prisma.lead.findMany({ where: { businessId } }),
    prisma.invoice.findMany({ where: { businessId, status: "paid" } }),
  ]);

  const activeCustomers = customers.filter((c) => c.isActive);
  const totalCustomerRevenue = customers.reduce(
    (acc, c) => acc + Number(c.totalRevenue),
    0,
  );
  const totalPaidInvoices = invoices.reduce(
    (acc, inv) => acc + Number(inv.total),
    0,
  );

  const baselineRev = Math.max(totalPaidInvoices, totalCustomerRevenue);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

  const annualRunRate =
    options?.monthlyRevenueOverride !== undefined
      ? options.monthlyRevenueOverride * 12
      : baselineRev;
  const annualExpenses = totalExpenses;
  const annualNetProfit = Math.max(0, annualRunRate - annualExpenses);
  const profitMargin =
    annualRunRate > 0 ? Math.round((annualNetProfit / annualRunRate) * 100) : 0;

  const tier = determineStudioValuationTier(
    annualRunRate,
    activeCustomers.length,
  );

  const currencySymbol = getCurrencySymbol(business?.currency);

  const tierConfig = VALUATION_TIER_CONFIG[tier];

  let multiple = 0;
  let estimatedLow = 0;
  let estimatedHigh = 0;
  let midpoint = 0;

  if (annualRunRate > 0 || activeCustomers.length > 0) {
    let baseMultiple = (tierConfig.minMultiple + tierConfig.maxMultiple) / 2;
    if (profitMargin >= 50) baseMultiple += 0.3;
    if (activeCustomers.length >= 5) baseMultiple += 0.2;

    multiple = Number(baseMultiple.toFixed(1));
    const clientEquity = activeCustomers.length * 25000;

    const rawEstimatedLow = Math.max(
      0,
      annualNetProfit * (multiple * 0.88) + clientEquity * 0.8,
    );
    const rawEstimatedHigh = Math.max(
      0,
      annualNetProfit * (multiple * 1.15) + clientEquity * 1.4,
    );

    estimatedLow = Math.round(rawEstimatedLow / 1000) * 1000;
    estimatedHigh = Math.round(rawEstimatedHigh / 1000) * 1000;
    midpoint = Math.round((estimatedLow + estimatedHigh) / 2 / 1000) * 1000;
  }

  const formattedArr =
    annualRunRate >= 1000000
      ? `${currencySymbol}${(annualRunRate / 1000000).toFixed(2)}M`
      : annualRunRate >= 1000
        ? `${currencySymbol}${(annualRunRate / 1000).toFixed(1)}k`
        : `${currencySymbol}${annualRunRate}`;

  const drivers: ValuationDriverDto[] = [
    {
      id: "arr",
      name: "Annual Revenue Run-Rate",
      value: formattedArr,
      impact: annualRunRate > 0 ? "high" : "neutral",
      detail: "Annualized gross inflow from paid invoices & client retainers",
    },
    {
      id: "sde",
      name: "SDE Net Profit Multiple",
      value: `${multiple}x`,
      impact: profitMargin > 45 ? "high" : "neutral",
      detail: `${profitMargin}% net take-home margin after all logged expenses`,
    },
    {
      id: "clients",
      name: "Active Client Base",
      value: `${activeCustomers.length} Active`,
      impact: activeCustomers.length > 3 ? "positive" : "neutral",
      detail: "Repeat recurring relationships and service history",
    },
    {
      id: "pipeline",
      name: "Lead Conversion Pipeline",
      value: `${leads.length} Inquiries`,
      impact: leads.length > 0 ? "positive" : "neutral",
      detail: "Inbound quote demand from public storefront and 3D card",
    },
  ];

  const growthLevers = [...VALUATION_GROWTH_LEVERS];

  return {
    estimatedLow,
    estimatedHigh,
    midpoint,
    multiple,
    tier,
    tierLabel: tierConfig.label,
    tierDescription: tierConfig.description,
    annualRunRate,
    annualNetProfit,
    profitMargin,
    activeCustomerCount: activeCustomers.length,
    drivers,
    growthLevers,
    calculatedAt: new Date().toISOString(),
  };
}
