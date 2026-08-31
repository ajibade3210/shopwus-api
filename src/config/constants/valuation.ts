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
} as const;

export const VALUATION_GROWTH_LEVERS = [
  {
    title: "Turn One-Time Clients into Monthly Retainers",
    description:
      "Turn one-off jobs into predictable monthly payment plans to lock in reliable cashflow.",
    impactMultiple: "+0.4x Multiple",
  },
  {
    title: "Put Invoicing & Client Tracking on Autopilot",
    description:
      "Send automatic digital invoices and organize customer history in one place to save time and get paid faster.",
    impactMultiple: "+0.3x Multiple",
  },
  {
    title: "Launch Premium VIP Packages",
    description:
      "Bundle your top services into high-value signature packages that command higher prices.",
    impactMultiple: "+0.5x Multiple",
  },
] as const;
