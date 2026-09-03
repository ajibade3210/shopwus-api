import { describe, expect, it } from "@jest/globals";
import {
  addCustomerActivitySchema,
  addCustomerServiceSchema,
  createCustomerSchema,
  importCustomersSchema,
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

    it("validates customer with custom attributes", () => {
      const valid = createCustomerSchema.safeParse({
        name: "Claire Beaumont",
        email: "claire@aethel.com",
        attributes: [
          { key: "Waist", value: "32" },
          { key: "Preferred Delivery Time", value: "10:30 AM" },
        ],
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.attributes).toEqual([
          { key: "Waist", value: "32" },
          { key: "Preferred Delivery Time", value: "10:30 AM" },
        ]);
      }
    });

    it("silently prunes completely empty attribute rows before max 25 check", () => {
      const attributesWithBlanks = [
        { key: "Waist", value: "32" },
        { key: "", value: "" },
        { key: "   ", value: "   " },
        { key: "Chest", value: "40" },
      ];
      const result = createCustomerSchema.safeParse({
        name: "Claire Beaumont",
        email: "claire@aethel.com",
        attributes: attributesWithBlanks,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.attributes).toEqual([
          { key: "Waist", value: "32" },
          { key: "Chest", value: "40" },
        ]);
      }
    });

    it("rejects attributes containing pipe (|) character", () => {
      const invalidKey = createCustomerSchema.safeParse({
        name: "Claire Beaumont",
        email: "claire@aethel.com",
        attributes: [{ key: "Waist | Size", value: "32" }],
      });
      expect(invalidKey.success).toBe(false);

      const invalidVal = createCustomerSchema.safeParse({
        name: "Claire Beaumont",
        email: "claire@aethel.com",
        attributes: [{ key: "Waist", value: "32 | 34" }],
      });
      expect(invalidVal.success).toBe(false);
    });

    it("rejects duplicate attribute keys case-insensitively", () => {
      const duplicate = createCustomerSchema.safeParse({
        name: "Claire Beaumont",
        email: "claire@aethel.com",
        attributes: [
          { key: "Waist", value: "32" },
          { key: "waist", value: "34" },
        ],
      });
      expect(duplicate.success).toBe(false);
    });

    it("rejects more than 25 non-blank attributes", () => {
      const twentySixAttrs = Array.from({ length: 26 }, (_, i) => ({
        key: `Attr${i}`,
        value: `Val${i}`,
      }));
      const result = createCustomerSchema.safeParse({
        name: "Claire Beaumont",
        email: "claire@aethel.com",
        attributes: twentySixAttrs,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Customer Attributes CSV Parser", () => {
    it("parses valid formatted string and handles first colon split", () => {
      const {
        parseCustomerAttributes,
      } = require("../../src/modules/customers/services/customer-bulk.service");
      const parsed = parseCustomerAttributes(
        "Waist: 32 | Delivery: 10:30 AM | Shoe Size: 10.5",
      );
      expect(parsed).toEqual([
        { key: "Waist", value: "32" },
        { key: "Delivery", value: "10:30 AM" },
        { key: "Shoe Size", value: "10.5" },
      ]);
    });

    it("silently prunes empty pairs from string", () => {
      const {
        parseCustomerAttributes,
      } = require("../../src/modules/customers/services/customer-bulk.service");
      const parsed = parseCustomerAttributes("Waist: 32 | | Chest: 40 | ");
      expect(parsed).toEqual([
        { key: "Waist", value: "32" },
        { key: "Chest", value: "40" },
      ]);
    });

    it("throws on missing colon in attribute string", () => {
      const {
        parseCustomerAttributes,
      } = require("../../src/modules/customers/services/customer-bulk.service");
      expect(() => parseCustomerAttributes("Waist 32")).toThrow(
        'Expected "Key: Value"',
      );
    });
  });
});
