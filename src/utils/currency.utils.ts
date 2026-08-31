export type FinancialAmountInput =
  | number
  | string
  | bigint
  | { toString(): string }
  | null
  | undefined;

export function koboToNaira(kobo: number | bigint | null | undefined): number {
  return Number(kobo ?? 0) / 100;
}

export function nairaToKobo(
  naira: number | string | { toString(): string } | null | undefined,
): bigint {
  return BigInt(Math.round(Number(naira ?? 0) * 100));
}

/**
 * Enforces the standardized dual-unit response for financial amounts.
 * Ensures both '[prefix]' (Naira) and '[prefix]Kobo' (integer minor units) are present.
 * Accepts Prisma Decimal, number, string, or bigint inputs.
 */
export function toFinancialAmount<T extends string = "amount">(
  value: FinancialAmountInput = 0,
  prefix: T = "amount" as T,
  isKobo = false,
) {
  let naira: number;
  let kobo: number;

  if (typeof value === "bigint" || isKobo) {
    kobo = Number(value ?? 0);
    naira = kobo / 100;
  } else {
    naira = Number(value ?? 0);
    kobo = Math.round(naira * 100);
  }

  return {
    [prefix]: naira,
    [`${prefix}Kobo`]: kobo,
  } as { [K in T]: number } & { [K in `${T}Kobo`]: number };
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  NGN: "₦",
};

export function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return "₦";
  const normalized = currency.toUpperCase().trim();
  return CURRENCY_SYMBOLS[normalized] || "₦";
}

