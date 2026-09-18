export const VALUATION_BASELINE_RANGES: Record<
  string,
  { low: number; high: number }
> = {
  USD: { low: 10000, high: 25000 },
  GBP: { low: 8000, high: 20000 },
  EUR: { low: 9000, high: 22000 },
  NGN: { low: 1500000, high: 2500000 },
};

export const DEFAULT_VALUATION_BASELINE = VALUATION_BASELINE_RANGES.NGN;

export const VALUATION_TIER_CONFIG = {
  emerging: {
    label: "Emerging Business",
    description:
      "Early-stage business building initial market presence, steady customer orders, and lean operating costs.",
    minMultiple: 1.8,
    maxMultiple: 2.6,
  },
  established: {
    label: "Growing Business",
    description:
      "Proven market traction with consistent monthly cashflow, healthy profit margins, and loyal repeat buyers.",
    minMultiple: 2.7,
    maxMultiple: 3.6,
  },
  flagship: {
    label: "Established Brand",
    description:
      "Strong brand equity commanding premium pricing, defensible profit margins, and high customer retention.",
    minMultiple: 3.7,
    maxMultiple: 4.8,
  },
  haute: {
    label: "Scaled Enterprise",
    description:
      "High recurring revenue, established market authority, and premium valuation multiples.",
    minMultiple: 4.9,
    maxMultiple: 6.2,
  },
} as const;

export const VALUATION_GROWTH_LEVERS = [
  {
    title: "Drive Repeat Orders & Client Retention",
    description:
      "Turn one-time buyers and clients into repeat shoppers to boost customer lifetime value and cashflow.",
    impactMultiple: "+0.4x Multiple",
  },
  {
    title: "Put Invoicing & Bookkeeping on Autopilot",
    description:
      "Keep clean digital receipts, invoices, and settlement records for an audit-ready financial statement.",
    impactMultiple: "+0.3x Multiple",
  },
  {
    title: "Protect Net Margins with High-Value Offers",
    description:
      "Bundle high-margin products and signature services to increase average order value and net profit.",
    impactMultiple: "+0.5x Multiple",
  },
] as const;
