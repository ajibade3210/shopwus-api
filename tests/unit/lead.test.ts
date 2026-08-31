import { describe, expect, it } from "@jest/globals";
import {
  convertLeadSchema,
  createLeadInputSchema,
  listLeadsQuerySchema,
  publicInquiryInputSchema,
  updateLeadStatusSchema,
} from "../../src/modules/leads/schema/lead.schema";
import { getBusinessTypeSubjectPrefix } from "../../src/utils/studio.utils";

describe("Leads Module Unit Tests", () => {
  describe("Leads Validation Schemas", () => {
    it("validates public storefront inquiry payload", () => {
      const valid = publicInquiryInputSchema.safeParse({
        name: "Sofia Laurent",
        email: "sofia.laurent@aethel.com",
        phone: "+234 802 555 0142",
        service: "Brand Identity & Guidelines",
        services: [
          "Brand Identity & Guidelines",
          "Packaging & Print Architecture",
        ],
        eventDate: "2026-10-18",
        budget: 85000,
        message:
          "We are launching our luxury beauty line and need an end-to-end visual identity.",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid emails on public inquiries", () => {
      const invalid = publicInquiryInputSchema.safeParse({
        name: "Sofia Laurent",
        email: "not-an-email",
        service: "Brand Identity",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates query params with pagination defaults", () => {
      const query = listLeadsQuerySchema.parse({
        status: "new",
        page: "2",
        limit: "15",
      });
      expect(query.status).toBe("new");
      expect(query.page).toBe(2);
      expect(query.limit).toBe(15);
    });

    it("validates status updates strictly", () => {
      expect(
        updateLeadStatusSchema.safeParse({ status: "qualified" }).success,
      ).toBe(true);
      expect(
        updateLeadStatusSchema.safeParse({ status: "invalid_status" }).success,
      ).toBe(false);
    });

    it("validates manual admin lead creation input", () => {
      const manualLead = createLeadInputSchema.safeParse({
        name: "Kenji Sato",
        email: "kenji@soraprotocol.io",
        service: "Digital Product Architecture",
        budget: "120000",
        status: "contacted",
      });
      expect(manualLead.success).toBe(true);
    });

    it("validates lead conversion payload", () => {
      const convert = convertLeadSchema.safeParse({
        serviceName: "Aethel Luxury Rebrand",
        amount: 96000,
        createDraftInvoice: true,
      });
      expect(convert.success).toBe(true);
    });
  });

  describe("getBusinessTypeSubjectPrefix", () => {
    it("returns correct prefix for each business type", () => {
      expect(getBusinessTypeSubjectPrefix("service")).toBe(
        "New Consultation Request",
      );
      expect(getBusinessTypeSubjectPrefix("retail")).toBe(
        "New Purchase Request",
      );
      expect(getBusinessTypeSubjectPrefix("ecommerce")).toBe("New Store Order");
      expect(getBusinessTypeSubjectPrefix("sales")).toBe("New Order Request");
      expect(getBusinessTypeSubjectPrefix(null)).toBe("New Order Request");
      expect(getBusinessTypeSubjectPrefix(undefined)).toBe("New Order Request");
    });
  });
});
