import { describe, expect, it } from "@jest/globals";
import {
  createExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from "../../src/modules/expenses/schema/expense.schema";

describe("Expenses Module Unit Tests", () => {
  describe("Expense Validation Schemas", () => {
    it("validates expense creation schema with description", () => {
      const valid = createExpenseSchema.safeParse({
        description: "Specialty Fine Art Paper & Foiling Blocks",
        category: "materials",
        amount: 450000,
        date: "2026-08-25",
        paymentMethod: "transfer",
        vendor: "GF Smith Paper Mills",
        taxDeductible: true,
      });
      expect(valid.success).toBe(true);
    });

    it("validates expense creation schema with title alias", () => {
      const valid = createExpenseSchema.safeParse({
        title: "Adobe Creative Cloud Annual Subscription",
        category: "software",
        amount: "185000",
        paymentMethod: "card",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects expense creation without title or description", () => {
      const invalid = createExpenseSchema.safeParse({
        category: "software",
        amount: 50000,
      });
      expect(invalid.success).toBe(false);
    });

    it("validates expense update schema", () => {
      const valid = updateExpenseSchema.safeParse({
        description: "Studio Workspace High-Speed Fiber Internet",
        amount: 85000,
        vendor: "MainOne Cable",
      });
      expect(valid.success).toBe(true);
    });

    it("validates list expenses query parameters", () => {
      const parsed = listExpensesQuerySchema.parse({
        category: "materials",
        vendor: "GF Smith",
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        page: "1",
        limit: "25",
      });
      expect(parsed.category).toBe("materials");
      expect(parsed.vendor).toBe("GF Smith");
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(25);
    });
  });
});
