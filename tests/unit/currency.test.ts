import { describe, expect, it } from "@jest/globals";
import {
  getCurrencySymbol,
  koboToNaira,
  nairaToKobo,
  toFinancialAmount,
} from "../../src/utils/currency.utils";

describe("Currency & Financial Amount Utility Tests", () => {
  describe("koboToNaira & nairaToKobo", () => {
    it("converts kobo to naira accurately", () => {
      expect(koboToNaira(10000)).toBe(100);
      expect(koboToNaira(5000000n)).toBe(50000);
      expect(koboToNaira(0)).toBe(0);
      expect(koboToNaira(null)).toBe(0);
    });

    it("converts naira to kobo accurately", () => {
      expect(nairaToKobo(100)).toBe(10000n);
      expect(nairaToKobo("50000")).toBe(5000000n);
      expect(nairaToKobo(103200.5)).toBe(10320050n);
      expect(nairaToKobo(null)).toBe(0n);
    });
  });

  describe("toFinancialAmount", () => {
    it("produces standardized dual-unit object with default prefix 'amount'", () => {
      const result = toFinancialAmount(50000);
      expect(result).toEqual({
        amount: 50000,
        amountKobo: 5000000,
      });
    });

    it("supports custom prefix", () => {
      const result = toFinancialAmount(96000, "subtotal");
      expect(result).toEqual({
        subtotal: 96000,
        subtotalKobo: 9600000,
      });
    });

    it("handles total fee, discount, and tax prefixes", () => {
      expect(toFinancialAmount(7200, "taxAmount")).toEqual({
        taxAmount: 7200,
        taxAmountKobo: 720000,
      });

      expect(toFinancialAmount(0, "discount")).toEqual({
        discount: 0,
        discountKobo: 0,
      });
    });

    it("handles bigint kobo inputs", () => {
      const result = toFinancialAmount(5000000n, "totalRevenue");
      expect(result).toEqual({
        totalRevenue: 50000,
        totalRevenueKobo: 5000000,
      });
    });

    it("handles null and undefined safely", () => {
      expect(toFinancialAmount(null)).toEqual({
        amount: 0,
        amountKobo: 0,
      });
      expect(toFinancialAmount(undefined, "total")).toEqual({
        total: 0,
        totalKobo: 0,
      });
    });
  });

  describe("getCurrencySymbol", () => {
    it("returns correct symbols for standard currencies", () => {
      expect(getCurrencySymbol("USD")).toBe("$");
      expect(getCurrencySymbol("GBP")).toBe("£");
      expect(getCurrencySymbol("EUR")).toBe("€");
      expect(getCurrencySymbol("NGN")).toBe("₦");
    });

    it("handles lowercase, whitespace, and defaults to ₦ for null/unrecognized", () => {
      expect(getCurrencySymbol("usd")).toBe("$");
      expect(getCurrencySymbol(" gbp ")).toBe("£");
      expect(getCurrencySymbol(null)).toBe("₦");
      expect(getCurrencySymbol(undefined)).toBe("₦");
      expect(getCurrencySymbol("UNKNOWN")).toBe("₦");
    });
  });
});
