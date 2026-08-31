import { describe, expect, it } from "@jest/globals";
import {
  generateOtp,
  generatePassword,
  generateRefreshToken,
  hashToken,
  parseRefreshExpiryMs,
} from "../../src/utils/auth.utils";
import { normalizePhoneNumber } from "../../src/utils/phone.utils";
import {
  formatEnumToLabel,
  generateUserAlias,
  getIndefiniteArticle,
  slugify,
} from "../../src/utils/string.utils";

describe("Sanitized Studio Core Utilities", () => {
  describe("slugify", () => {
    it("converts studio names to url-safe slugs", () => {
      expect(slugify("Atelier Forma & Design")).toBe("atelier-forma-design");
      expect(slugify("Elena's Photography Studio")).toBe(
        "elenas-photography-studio",
      );
      expect(slugify("  Spaces   &   Special! Characters   ")).toBe(
        "spaces-special-characters",
      );
    });
  });

  describe("generateUserAlias", () => {
    it("creates clean handle aliases", () => {
      const alias = generateUserAlias("Sarah", "Connor");
      expect(alias.startsWith("sarah_connor_")).toBe(true);
      expect(alias.length).toBe("sarah_connor_".length + 4);
    });
  });

  describe("formatEnumToLabel & getIndefiniteArticle", () => {
    it("formats uppercase enum keys into readable title case", () => {
      expect(formatEnumToLabel("BRAND_IDENTITY")).toBe("Brand Identity");
      expect(formatEnumToLabel("DIGITAL_PRODUCT")).toBe("Digital Product");
    });

    it("determines correct indefinite article", () => {
      expect(getIndefiniteArticle("Agency")).toBe("an");
      expect(getIndefiniteArticle("Studio")).toBe("a");
    });
  });

  describe("normalizePhoneNumber", () => {
    it("formats local nigerian numbers to E.164 standard", () => {
      expect(normalizePhoneNumber("08012345678")).toBe("+2348012345678");
      expect(normalizePhoneNumber("+2348012345678")).toBe("+2348012345678");
    });
  });

  describe("Auth Crypto & Token Utils", () => {
    it("generates random numeric OTPs with specified length", () => {
      const otp6 = generateOtp(6);
      expect(otp6).toMatch(/^\d{6}$/);

      const otp4 = generateOtp(4);
      expect(otp4).toMatch(/^\d{4}$/);
    });

    it("generates high-entropy refresh tokens and SHA-256 hashes", () => {
      const token = generateRefreshToken();
      expect(typeof token).toBe("string");
      expect(token.length).toBe(80); // 40 bytes hex

      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // sha256 hex
    });

    it("parses refresh expiry times correctly", () => {
      const standardExpiry = parseRefreshExpiryMs(false);
      const rememberMeExpiry = parseRefreshExpiryMs(true);
      expect(rememberMeExpiry).toBeGreaterThan(standardExpiry);
    });

    it("generates strong passwords", () => {
      const pwd = generatePassword(12);
      expect(pwd.length).toBe(12);
    });
  });

  describe("Studio Auth Schemas", () => {
    it("validates standard signup input with studio details", async () => {
      const { signupSchema } = await import(
        "../../src/modules/auth/schema/auth.schema"
      );
      const valid = signupSchema.safeParse({
        email: "elena@atelierforma.design",
        password: "Password123!",
        fullName: "Elena Vance",
        studioName: "Atelier Forma",
        slug: "atelier-forma",
      });
      expect(valid.success).toBe(true);
    });

    it("validates Google OAuth signin input with optional claimSlug", async () => {
      const { socialSignInSchema } = await import(
        "../../src/modules/auth/schema/auth.schema"
      );
      const valid = socialSignInSchema.safeParse({
        idToken: "google-mock-jwt-id-token",
        claimSlug: "atelier-forma",
      });
      expect(valid.success).toBe(true);
    });
  });
});
