import { describe, expect, it } from "@jest/globals";
import {
  addCustomerActivitySchema,
  addCustomerServiceSchema,
  createCustomerSchema,
  importCustomersSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
  updateCustomerServiceStatusSchema,
} from "../../src/modules/customers/schema/customer.schema";

describe("Customers Module Unit Tests", () => {
  describe("Customer Validation Schemas", () => {
    it("validates customer creation schema with initial service", () => {
      const valid = createCustomerSchema.safeParse({
        name: "Claire Beaumont",
        email: "claire@aethel.com",
        phone: "+234 803 555 0177",
        company: "Aethel Group",
        notes: "Heritage luxury brand rebrand client.",
        serviceName: "Aethel Luxury Rebrand",
        service: "Brand Identity",
        amount: 96000,
        status: "active",
      });
      expect(valid.success).toBe(true);
    });

    it("validates customer creation schema without initial service", () => {
      const valid = createCustomerSchema.safeParse({
        name: "Kenji Sato",
        email: "kenji@soraprotocol.io",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects customer creation with invalid email", () => {
      const invalid = createCustomerSchema.safeParse({
        name: "Invalid Customer",
        email: "not-an-email",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates customer update payload", () => {
      const valid = updateCustomerSchema.safeParse({
        name: "Claire Beaumont Vance",
        company: "Aethel Maison London",
        notes: "Updated delivery address to Mayfair.",
      });
      expect(valid.success).toBe(true);
    });

    it("validates adding a service scope to customer", () => {
      const valid = addCustomerServiceSchema.safeParse({
        name: "Custom Dieline Packaging Suite",
        service: "Packaging & Print",
        amount: "35000",
        status: "pending",
      });
      expect(valid.success).toBe(true);
    });

    it("validates updating a service status", () => {
      expect(
        updateCustomerServiceStatusSchema.safeParse({ status: "completed" })
          .success,
      ).toBe(true);
      expect(
        updateCustomerServiceStatusSchema.safeParse({ status: "invalid" })
          .success,
      ).toBe(false);
    });

    it("validates logging an activity note", () => {
      const valid = addCustomerActivitySchema.safeParse({
        type: "note",
        description: "Sent foiled paper proof samples to London headquarters.",
        metadata: { courier: "DHL Express", tracking: "123456789" },
      });
      expect(valid.success).toBe(true);
    });

    it("validates bulk customer import schema (both array and object shapes)", () => {
      const arrayShape = importCustomersSchema.safeParse([
        {
          name: "Amara Sterling",
          email: "amara@sterling.com",
          phone: "+2348000000001",
          notes: "VIP Client",
        },
      ]);
      expect(arrayShape.success).toBe(true);

      const objectShape = importCustomersSchema.safeParse({
        records: [
          {
            name: "Kenji Sato",
            email: "kenji@soraprotocol.io",
            company: "Sora Labs",
          },
        ],
      });
      expect(objectShape.success).toBe(true);
    });

    it("transforms list customers query parameters correctly", () => {
      const parsed = listCustomersQuerySchema.parse({
        q: "Aethel",
        isActive: "true",
        page: "1",
        limit: "25",
      });
      expect(parsed.q).toBe("Aethel");
      expect(parsed.isActive).toBe(true);
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(25);
    });
  });
});
