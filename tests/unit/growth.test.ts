import { describe, expect, it } from "@jest/globals";
import { blogCategoryEnum } from "../../src/modules/blog/schema/blog.schema";
import { sendBroadcastSchema } from "../../src/modules/broadcasts/schema/broadcast.schema";
import { submitFeedbackSchema } from "../../src/modules/feedback/schema/feedback.schema";
import {
  advancedValuationInputsSchema,
  publicValuationInputsSchema,
} from "../../src/modules/valuation/schema/valuation.schema";

describe("Growth & Engagement Modules Unit Tests", () => {
  describe("Valuation Schemas", () => {
    it("validates public valuation inputs with numeric coercion", () => {
      const parsed = publicValuationInputsSchema.parse({
        annualRevenue: "84000000",
        annualExpenses: "14000000",
        netAssets: "12000000",
        customerRetentionRate: "65",
        email: "elena@atelierforma.com",
      });
      expect(parsed.annualRevenue).toBe(84000000);
      expect(parsed.annualExpenses).toBe(14000000);
      expect(parsed.customerRetentionRate).toBe(65);
    });

    it("validates advanced valuation schema", () => {
      const parsed = advancedValuationInputsSchema.parse({
        monthlyRevenueOverride: "4500000",
      });
      expect(parsed.monthlyRevenueOverride).toBe(4500000);
    });
  });

  describe("Broadcast Schemas", () => {
    it("validates broadcast campaign payload for email", () => {
      const valid = sendBroadcastSchema.safeParse({
        channel: "email",
        customerIds: ["cust-1", "cust-2"],
        subject: "Private Autumn Capsule Collection Preview",
        message:
          "Exclusive priority booking for our signature atelier clients.",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects email broadcast without subject line", () => {
      const invalid = sendBroadcastSchema.safeParse({
        channel: "email",
        customerIds: ["cust-1"],
        message: "Missing subject line.",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates whatsapp broadcast without subject", () => {
      const valid = sendBroadcastSchema.safeParse({
        channel: "whatsapp",
        customerIds: ["cust-1"],
        message: "Hello, your customized proposal is ready.",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("Feedback & Blog Schemas", () => {
    it("validates feedback submission schema", () => {
      const valid = submitFeedbackSchema.safeParse({
        title: "Custom CNAME Domain Mapping",
        description:
          "Allow mapping our bespoke domain directly to the 3D card.",
        category: "storefront",
      });
      expect(valid.success).toBe(true);
    });

    it("validates blog categories", () => {
      expect(blogCategoryEnum.safeParse("pricing-strategy").success).toBe(true);
      expect(blogCategoryEnum.safeParse("operations").success).toBe(true);
      expect(blogCategoryEnum.safeParse("unsupported_category").success).toBe(
        false,
      );
    });
  });
});
