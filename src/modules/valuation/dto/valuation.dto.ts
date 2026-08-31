export interface ValuationDriverDto {
  id: string;
  name: string;
  value: string;
  impact: "high" | "positive" | "neutral" | "negative";
  detail: string;
}

export interface ValuationTierConfigDto {
  label: string;
  description: string;
}

export interface PublicValuationResultDto {
  currency: string;
  annualRevenue: number;
  annualExpenses: number;
  averageNetProfit: number;
  netAssets: number;
  multiple: number;
  approximateValue: number;
  valuationRangeLow: number;
  valuationRangeHigh: number;
  tier: "emerging" | "established" | "flagship" | "haute";
  tierLabel: string;
  tierDescription: string;
  profitMargin: number;
  calculatedAt: string;
  drivers: ValuationDriverDto[];
  growthOpportunities: string[];
}

export interface BusinessValuationDto {
  estimatedLow: number;
  estimatedHigh: number;
  midpoint: number;
  multiple: number;
  tier: "emerging" | "established" | "flagship" | "haute";
  tierLabel: string;
  tierDescription: string;
  annualRunRate: number;
  annualNetProfit: number;
  profitMargin: number;
  activeCustomerCount: number;
  drivers: ValuationDriverDto[];
  growthLevers: Array<{
    title: string;
    description: string;
    impactMultiple: string;
  }>;
  calculatedAt: string;
}
