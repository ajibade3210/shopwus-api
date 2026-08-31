import { describe, expect, it } from "@jest/globals";
import {
  createInvoiceSchema,
  listInvoicesQuerySchema,
  quickCustomerInvoiceBodySchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "../../src/modules/invoices/schema/invoice.schema";

describe("Invoices Module Unit Tests", () => {
  describe("Invoice Validation Schemas", () => {
    it("validates invoice creation schema with line items", () => {
      const valid = createInvoiceSchema.safeParse({
        customerId: "cust-123",
        customerName: "Aethel Heritage Maison",
        customerEmail: "claire@aethel.com",
        billingAddress: "14 Mayfair High St, London",
        issueDate: "2026-08-20",
        dueDate: "2026-09-15",
        paymentTerms: "Net 30",
        currency: "NGN",
        items: [
          {
            description: "Aethel Luxury Rebrand & Guideline Bible",
            quantity: 1,
            unitPrice: 96000,
            amount: 96000,
          },
        ],
        subtotal: 96000,
        discount: 0,
        taxRate: 7.5,
        taxAmount: 7200,
        total: 103200,
        notes: "Deposit paid. Balance due upon delivery.",
        status: "draft",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invoice creation without line items", () => {
      const invalid = createInvoiceSchema.safeParse({
        customerId: "cust-123",
        dueDate: "2026-09-15",
        items: [],
      });
      expect(invalid.success).toBe(false);
    });

    it("validates invoice update schema", () => {
      const valid = updateInvoiceSchema.safeParse({
        customerName: "Aethel Group PLC",
        notes: "Updated billing entity.",
        status: "sent",
      });
      expect(valid.success).toBe(true);
    });

    it("validates status updates strictly", () => {
      expect(
        updateInvoiceStatusSchema.safeParse({ status: "paid" }).success,
      ).toBe(true);
      expect(
        updateInvoiceStatusSchema.safeParse({ status: "invalid_status" })
          .success,
      ).toBe(false);
    });

    it("validates list invoices query parameters and pagination", () => {
      const parsed = listInvoicesQuerySchema.parse({
        status: "draft",
        customerId: "cust-101",
        page: "2",
        limit: "10",
      });
      expect(parsed.status).toBe("draft");
      expect(parsed.customerId).toBe("cust-101");
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(10);
    });

    it("validates quick invoice body schema", () => {
      const valid = quickCustomerInvoiceBodySchema.safeParse({
        serviceId: "svc-101",
        amount: 50000,
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("Invoice Financial Decimal Calculations", () => {
    it("calculates exact line item amounts and subtotals with high precision", () => {
      const {
        calculateInvoiceFinancials,
      } = require("../../src/modules/invoices/services/invoice.service");
      const result = calculateInvoiceFinancials({
        items: [
          { description: "Item 1", quantity: 3, unitPrice: 0.1 },
          { description: "Item 2", quantity: 2, unitPrice: 0.2 },
        ],
        discount: 0,
        taxRate: 7.5,
      });

      // 3 * 0.1 = 0.30, 2 * 0.2 = 0.40 -> subtotal = 0.70
      expect(result.subtotal.toString()).toBe("0.7");
      // Tax: 0.70 * 7.5% = 0.0525 -> rounded to 0.05
      expect(result.taxAmount.toString()).toBe("0.05");
      // Total: 0.70 + 0.05 = 0.75
      expect(result.total.toString()).toBe("0.75");
    });

    it("handles complex discounts and line item rounding without float drift", () => {
      const {
        calculateInvoiceFinancials,
      } = require("../../src/modules/invoices/services/invoice.service");
      const result = calculateInvoiceFinancials({
        items: [
          { description: "Branding", quantity: 1, unitPrice: 999.99 },
          { description: "Hosting", quantity: 12, unitPrice: 19.99 },
        ],
        discount: 50.5,
        taxRate: 5,
      });

      // Subtotal: 999.99 + 239.88 = 1239.87
      expect(result.subtotal.toString()).toBe("1239.87");
      // Taxable base: 1239.87 - 50.50 = 1189.37
      // Tax: 1189.37 * 0.05 = 59.4685 -> 59.47
      expect(result.taxAmount.toString()).toBe("59.47");
      // Total: 1189.37 + 59.47 = 1248.84
      expect(result.total.toString()).toBe("1248.84");
    });
  });
});
