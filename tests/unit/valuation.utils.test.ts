import { describe, expect, it } from "@jest/globals";
import {
  determinePublicValuationTier,
  determineStudioValuationTier,
} from "../../src/utils/valuation.utils";

describe("Valuation Utility Tests", () => {
  describe("determineStudioValuationTier", () => {
    it("assigns 'haute' tier when revenue >= 10M or active customers >= 25", () => {
      expect(determineStudioValuationTier(10000000, 2)).toBe("haute");
      expect(determineStudioValuationTier(1000000, 25)).toBe("haute");
      expect(determineStudioValuationTier(15000000, 30)).toBe("haute");
    });

    it("assigns 'flagship' tier when revenue >= 5M or active customers >= 10", () => {
      expect(determineStudioValuationTier(5000000, 3)).toBe("flagship");
      expect(determineStudioValuationTier(2000000, 10)).toBe("flagship");
      expect(determineStudioValuationTier(7500000, 12)).toBe("flagship");
    });

    it("assigns 'established' tier when revenue >= 2M or active customers >= 5", () => {
      expect(determineStudioValuationTier(2000000, 1)).toBe("established");
      expect(determineStudioValuationTier(500000, 5)).toBe("established");
      expect(determineStudioValuationTier(3000000, 6)).toBe("established");
    });

    it("defaults to 'emerging' tier for early stage studios", () => {
      expect(determineStudioValuationTier(0, 0)).toBe("emerging");
      expect(determineStudioValuationTier(1000000, 3)).toBe("emerging");
    });
  });

  describe("determinePublicValuationTier", () => {
    it("assigns 'haute' tier when profit margin >= 40% and retention >= 60%", () => {
      expect(determinePublicValuationTier(5000000, 45, 65)).toBe("haute");
    });

    it("assigns 'flagship' tier when profit margin >= 25% and retention >= 40%", () => {
      expect(determinePublicValuationTier(3000000, 30, 45)).toBe("flagship");
    });

    it("assigns 'established' tier when profit margin >= 10% or retention >= 25%", () => {
      expect(determinePublicValuationTier(1000000, 15, 20)).toBe("established");
      expect(determinePublicValuationTier(1000000, 5, 25)).toBe("established");
    });

    it("assigns 'emerging' tier when profit is 0 and retention is low", () => {
      expect(determinePublicValuationTier(0, 0, 15)).toBe("emerging");
    });
  });
});
