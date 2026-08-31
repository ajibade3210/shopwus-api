import {
  DEFAULT_VALUATION_BASELINE,
  VALUATION_BASELINE_RANGES,
} from "../config/constants/valuation";

export type ValuationTierType =
  | "emerging"
  | "established"
  | "flagship"
  | "haute";

/**
 * Returns the baseline valuation range for a given currency code.
 */
export function getValuationBaselineRange(currency?: string | null): {
  low: number;
  high: number;
} {
  if (!currency) return DEFAULT_VALUATION_BASELINE;
  const normalized = currency.toUpperCase().trim();
  return VALUATION_BASELINE_RANGES[normalized] || DEFAULT_VALUATION_BASELINE;
}

/**
 * Determines the live studio valuation tier based on annual run rate and active client relationships.
 */
export function determineStudioValuationTier(
  annualRunRate: number,
  activeCustomerCount: number,
): ValuationTierType {
  if (annualRunRate >= 10000000 || activeCustomerCount >= 25) {
    return "haute";
  }
  if (annualRunRate >= 5000000 || activeCustomerCount >= 10) {
    return "flagship";
  }
  if (annualRunRate >= 2000000 || activeCustomerCount >= 5) {
    return "established";
  }
  return "emerging";
}

/**
 * Determines the public calculator valuation tier based on profit, profit margin, and customer retention.
 */
export function determinePublicValuationTier(
  averageNetProfit: number,
  profitMargin: number,
  customerRetentionRate: number,
): ValuationTierType {
  if (averageNetProfit === 0 && customerRetentionRate < 30) {
    return "emerging";
  }
  if (profitMargin >= 40 && customerRetentionRate >= 60) {
    return "haute";
  }
  if (profitMargin >= 25 && customerRetentionRate >= 40) {
    return "flagship";
  }
  if (profitMargin >= 10 || customerRetentionRate >= 25) {
    return "established";
  }
  return "emerging";
}
