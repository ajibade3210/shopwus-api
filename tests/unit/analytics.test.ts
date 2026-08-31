import { describe, expect, it } from "@jest/globals";
import { analyticsQuerySchema } from "../../src/modules/analytics/schema/analytics.schema";

describe("Analytics Module Unit Tests", () => {
  describe("Analytics Validation Schemas", () => {
    it("validates allowed timeframes", () => {
      const validMonthly = analyticsQuerySchema.safeParse({
        timeframe: "monthly",
      });
      expect(validMonthly.success).toBe(true);

      const validDaily = analyticsQuerySchema.safeParse({ timeframe: "daily" });
      expect(validDaily.success).toBe(true);

      const validYearly = analyticsQuerySchema.safeParse({
        timeframe: "yearly",
      });
      expect(validYearly.success).toBe(true);
    });

    it("defaults to monthly timeframe when omitted", () => {
      const parsed = analyticsQuerySchema.parse({});
      expect(parsed.timeframe).toBe("monthly");
    });

    it("rejects unsupported timeframe keys", () => {
      const invalid = analyticsQuerySchema.safeParse({ timeframe: "hourly" });
      expect(invalid.success).toBe(false);
    });
  });
});
