import { prisma } from "../../../lib/prisma";
import type {
  BusinessValuationDto,
  PublicValuationResultDto,
  ValuationDriverDto,
} from "../dto/valuation.dto";
import type { PublicValuationInputs } from "../schema/valuation.schema";

const VALUATION_TIER_CONFIG = {
  emerging: {
    label: "Emerging Studio",
    description:
      "Early-stage creative workshop establishing market presence and core client relationships.",
    minMultiple: 1.8,
    maxMultiple: 2.6,
  },
  established: {
    label: "Established Atelier",
    description:
      "Proven studio with steady contract volume, predictable cashflow, and strong repeat client retention.",
    minMultiple: 2.7,
    maxMultiple: 3.6,
  },
  flagship: {
    label: "Flagship Agency",
    description:
      "High-margin creative powerhouse commanding premium project fees and executive brand trust.",
    minMultiple: 3.7,
    maxMultiple: 4.8,
  },
  haute: {
    label: "Haute Maison",
    description:
      "Iconic luxury studio with elite VIP exclusivity, diversified revenue, and institutional enterprise value.",
    minMultiple: 4.9,
    maxMultiple: 6.2,
  },
};

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

  let tier: "emerging" | "established" | "flagship" | "haute" = "emerging";
  if (averageNetProfit === 0 && customerRetentionRate < 30) {
    tier = "emerging";
  } else if (profitMargin >= 40 && customerRetentionRate >= 60) {
    tier = "haute";
  } else if (profitMargin >= 25 && customerRetentionRate >= 40) {
    tier = "flagship";
  } else if (profitMargin >= 10 || customerRetentionRate >= 25) {
    tier = "established";
  }

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
      detail: "Tangible studio assets, inventory, and equipment",
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
  const [customers, expenses, leads, invoices] = await Promise.all([
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
  const monthlyRevenue =
    options?.monthlyRevenueOverride ||
    (baselineRev > 0 ? Math.round(baselineRev / 2) : 250000);

  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const monthlyExpenses =
    totalExpenses > 0 ? Math.round(totalExpenses / 2) : 85000;

  const annualRunRate = monthlyRevenue * 12;
  const annualExpenses = monthlyExpenses * 12;
  const annualNetProfit = Math.max(
    annualRunRate - annualExpenses,
    Math.round(annualRunRate * 0.4),
  );
  const profitMargin = Math.round(
    (annualNetProfit / Math.max(annualRunRate, 1)) * 100,
  );

  let tier: "emerging" | "established" | "flagship" | "haute" = "emerging";
  if (annualRunRate >= 10000000 || activeCustomers.length >= 25) {
    tier = "haute";
  } else if (annualRunRate >= 5000000 || activeCustomers.length >= 10) {
    tier = "flagship";
  } else if (annualRunRate >= 2000000 || activeCustomers.length >= 5) {
    tier = "established";
  }

  const tierConfig = VALUATION_TIER_CONFIG[tier];

  let baseMultiple = (tierConfig.minMultiple + tierConfig.maxMultiple) / 2;
  if (profitMargin > 50) baseMultiple += 0.3;
  if (activeCustomers.length > 5) baseMultiple += 0.2;

  const multiple = Number(baseMultiple.toFixed(1));
  const clientEquity = activeCustomers.length * 25000;

  const rawEstimatedLow = Math.max(
    annualNetProfit * (multiple * 0.88) + clientEquity * 0.8,
    1500000,
  );
  const rawEstimatedHigh = Math.max(
    annualNetProfit * (multiple * 1.15) + clientEquity * 1.4,
    2500000,
  );

  const estimatedLow = Math.round(rawEstimatedLow / 10000) * 10000;
  const estimatedHigh = Math.round(rawEstimatedHigh / 10000) * 10000;
  const midpoint =
    Math.round((estimatedLow + estimatedHigh) / 2 / 10000) * 10000;

  const drivers: ValuationDriverDto[] = [
    {
      id: "arr",
      name: "Annual Revenue Run-Rate",
      value: `₦${(annualRunRate / 1000000).toFixed(2)}M`,
      impact: "high",
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
      impact: "positive",
      detail: "Inbound quote demand from public storefront and 3D card",
    },
  ];

  const growthLevers = [
    {
      title: "Establish Structured Recurring Retainers",
      description:
        "Convert ad-hoc project scopes into contractual recurring monthly retainer agreements.",
      impactMultiple: "+0.4x Multiple",
    },
    {
      title: "Automate Client Onboarding & Invoicing",
      description:
        "Systematize delivery workflows to reduce overhead and enhance client retention.",
      impactMultiple: "+0.3x Multiple",
    },
    {
      title: "Expand High-Yield Bespoke Packages",
      description:
        "Package signature identity and scenography engagements at premium price tiers.",
      impactMultiple: "+0.5x Multiple",
    },
  ];

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
