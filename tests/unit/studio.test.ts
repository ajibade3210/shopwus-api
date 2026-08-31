import { describe, expect, it } from "@jest/globals";
import {
  checkSlugSchema,
  colorSchemeSchema,
  portfolioProjectInputSchema,
  serviceItemInputSchema,
  submitReviewSchema,
  updateStudioProfileSchema,
} from "../../src/modules/studios/schema/studio.schema";

describe("Studio Module Unit Tests", () => {
  describe("Studio Validation Schemas", () => {
    it("validates slug checking schema", () => {
      expect(checkSlugSchema.safeParse({ slug: "atelier-forma" }).success).toBe(
        true,
      );
      expect(checkSlugSchema.safeParse({ slug: "" }).success).toBe(false);
    });

    it("validates review submission schema", () => {
      const valid = submitReviewSchema.safeParse({
        author: "Claire Beaumont",
        role: "Marketing Director",
        eventType: "Brand Identity",
        rating: 5,
        comment: "Flawless attention to typography and layout.",
      });
      expect(valid.success).toBe(true);

      const invalidRating = submitReviewSchema.safeParse({
        author: "Claire",
        rating: 6,
        comment: "Great",
      });
      expect(invalidRating.success).toBe(false);
    });

    it("validates color scheme and appearance schema", () => {
      const colors = colorSchemeSchema.safeParse({
        primary: "#1A1A1A",
        secondary: "#E5E5E5",
        button: "#2C3E50",
        pageBackground: "#FAFAFA",
        cardBackground: "#FFFFFF",
        text: "#111111",
      });
      expect(colors.success).toBe(true);
    });

    it("validates service and portfolio input schemas", () => {
      const service = serviceItemInputSchema.safeParse({
        name: "Brand Identity & Guidelines",
        category: "Identity",
        description: "Complete design system and typography manual.",
        price: 96000,
        isFeatured: true,
      });
      expect(service.success).toBe(true);

      const project = portfolioProjectInputSchema.safeParse({
        title: "Aethel Luxury Rebrand",
        category: "Brand Identity",
        location: "London & Lagos",
        description: "Comprehensive brand identity redesign.",
        image: "https://example.com/cover.webp",
        gallery: [
          "https://example.com/img1.webp",
          "https://example.com/img2.webp",
        ],
        stats: "48-Page Brand Book",
        client: "Aethel Heritage",
        year: "2026",
      });
      expect(project.success).toBe(true);
    });

    it("validates full studio profile update payload", () => {
      const profileUpdate = updateStudioProfileSchema.safeParse({
        businessName: "Atelier Forma Rebranded",
        tagline: "Haute Visual Systems & Brand Architecture",
        location: "Mayfair, London",
        currency: "GBP",
        colors: {
          primary: "#000000",
          secondary: "#0058BE",
          button: "#000000",
          text: "#191C1D",
        },
        buttonRadius: "rounded-lg",
        services: [
          {
            name: "Digital Product Architecture",
            category: "Product",
            price: 120000,
          },
        ],
      });
      expect(profileUpdate.success).toBe(true);
    });
  });

  describe("Cache Store Utility", () => {
    it("stores and retrieves cached values with TTL", async () => {
      const { cacheStore } = await import("../../src/utils/cache.utils");
      cacheStore.set("test-key", { hello: "world" }, 10_000);

      const cached = cacheStore.get<{ hello: string }>("test-key");
      expect(cached?.hello).toBe("world");

      cacheStore.delete("test-key");
      expect(cacheStore.get("test-key")).toBeNull();
    });
  });
});
