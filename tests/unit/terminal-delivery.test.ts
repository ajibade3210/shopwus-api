import { prisma } from "../../src/lib/prisma";
import * as terminalClientModule from "../../src/lib/terminal.client";
import {
  applyDeliveryBuffer,
  getStorefrontDeliveryQuotesService,
} from "../../src/modules/delivery/services/terminal.service";

jest.mock("../../src/lib/prisma", () => ({
  prisma: {
    business: {
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
  },
}));

describe("Terminal Delivery Service - Quoting & Fallbacks", () => {
  const mockFindUnique = prisma.business.findUnique as jest.Mock;
  const mockFindMany = prisma.product.findMany as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return fallback shipping quote if merchant origin address is missing", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "biz_1",
      name: "Atelier Mode",
      email: "atelier@shopwus.com",
      phone: "+2348011112222",
      senderPhone: null,
      addressLine1: null, // Missing address
      city: null,
      state: null,
      postalCode: null,
      country: "Nigeria",
      fallbackShippingFee: 3500,
    });

    const quotes = await getStorefrontDeliveryQuotesService("atelier-mode", {
      destination: {
        recipientName: "Emeka Okafor",
        phone: "+2348099998888",
        addressLine1: "15 Admiralty Way",
        addressLine2: null,
        city: "Lekki",
        state: "Lagos",
        postalCode: null,
      },
      items: [{ productId: "prod_1", quantity: 1 }],
    });

    expect(quotes).toHaveLength(1);
    expect(quotes[0].rateId).toBe("fallback_standard");
    expect(quotes[0].fee).toBe(3500);
    expect(quotes[0].feeKobo).toBe(350000);
    expect(quotes[0].carrierName).toBe("Standard Delivery");
  });

  it("should fallback gracefully if Terminal Africa API throws an error", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "biz_1",
      name: "Atelier Mode",
      email: "atelier@shopwus.com",
      phone: "+2348011112222",
      senderPhone: "+2348011112222",
      addressLine1: "12 Allen Avenue",
      city: "Ikeja",
      state: "Lagos",
      postalCode: "100001",
      country: "Nigeria",
      fallbackShippingFee: 3000,
    });

    mockFindMany.mockResolvedValueOnce([
      { id: "prod_1", name: "Silk Dress", price: 25000, weightKg: 0.5 },
    ]);

    const mockPost = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network Timeout (4000ms exceeded)"));
    jest.spyOn(terminalClientModule, "getTerminalClient").mockReturnValueOnce({
      post: mockPost,
    } as unknown as ReturnType<typeof terminalClientModule.getTerminalClient>);

    const quotes = await getStorefrontDeliveryQuotesService("atelier-mode", {
      destination: {
        recipientName: "Amara Kalu",
        phone: "+2348099998888",
        addressLine1: "10 Broad Street",
        addressLine2: null,
        city: "Lagos Island",
        state: "Lagos",
        postalCode: null,
      },
      items: [{ productId: "prod_1", quantity: 2 }],
    });

    expect(quotes).toHaveLength(1);
    expect(quotes[0].rateId).toBe("fallback_standard");
    expect(quotes[0].fee).toBe(3000);
    expect(quotes[0].feeKobo).toBe(300000);
  });

  it("should normalize Terminal Africa carrier rates with dual-unit financial amounts", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "biz_1",
      name: "Atelier Mode",
      email: "atelier@shopwus.com",
      phone: "+2348011112222",
      senderPhone: "+2348011112222",
      addressLine1: "12 Allen Avenue",
      city: "Ikeja",
      state: "Lagos",
      postalCode: "100001",
      country: "Nigeria",
      fallbackShippingFee: 3000,
    });

    mockFindMany.mockResolvedValueOnce([
      { id: "prod_1", name: "Silk Dress", price: 25000, weightKg: 0.8 },
    ]);

    const mockPost = jest.fn().mockResolvedValueOnce({
      data: {
        status: true,
        data: [
          {
            id: "rate_terminal_dhl",
            carrier_name: "DHL Express",
            carrier_slug: "dhl",
            carrier_logo: "https://example.com/dhl.png",
            delivery_eta: 1440,
            delivery_time: "Within 24 hours",
            amount: 4500,
            currency: "NGN",
          },
          {
            id: "rate_terminal_fez",
            carrier_name: "Fez Delivery",
            carrier_slug: "fez",
            carrier_logo: "https://example.com/fez.png",
            delivery_eta: 2880,
            delivery_time: "Within 2 days",
            amount: 2200,
            currency: "NGN",
          },
        ],
      },
    });

    jest.spyOn(terminalClientModule, "getTerminalClient").mockReturnValueOnce({
      post: mockPost,
    } as unknown as ReturnType<typeof terminalClientModule.getTerminalClient>);

    const quotes = await getStorefrontDeliveryQuotesService("atelier-mode", {
      destination: {
        recipientName: "Amara Kalu",
        phone: "+2348099998888",
        addressLine1: "10 Broad Street",
        addressLine2: null,
        city: "Lagos Island",
        state: "Lagos",
        postalCode: null,
      },
      items: [{ productId: "prod_1", quantity: 1 }],
    });

    expect(quotes).toHaveLength(2);
    expect(quotes[0].carrierName).toBe("DHL Express");
    expect(quotes[0].fee).toBe(4750);
    expect(quotes[0].feeKobo).toBe(475000);

    expect(quotes[1].carrierName).toBe("Fez Delivery");
    expect(quotes[1].fee).toBe(2400);
    expect(quotes[1].feeKobo).toBe(240000);
  });

  describe("applyDeliveryBuffer", () => {
    it("should apply minimum buffer of ₦200 when 5% is lower", () => {
      expect(applyDeliveryBuffer(2000)).toBe(2200);
    });

    it("should apply 5% percentage buffer when higher than ₦200", () => {
      expect(applyDeliveryBuffer(6000)).toBe(6300);
    });

    it("should round up to nearest ₦50", () => {
      expect(applyDeliveryBuffer(2340)).toBe(2550);
    });

    it("should return 0 for non-positive rates", () => {
      expect(applyDeliveryBuffer(0)).toBe(0);
      expect(applyDeliveryBuffer(-500)).toBe(0);
    });
  });
});
