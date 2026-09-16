import { Prisma } from "@prisma/client";
import { serializeOrder } from "../../src/modules/orders/dto/order.dto";
import { createManualOrderSchema } from "../../src/modules/orders/schema/order.schema";

describe("Manual Vendor Order Schema & Processing", () => {
  describe("createManualOrderSchema validation", () => {
    it("should accept valid manual order input for direct sale", () => {
      const valid = createManualOrderSchema.safeParse({
        customerName: "Adaobi Okonkwo",
        customerEmail: "adaobi@example.com",
        customerPhone: "08012345678",
        items: [
          {
            productId: "prod_1",
            quantity: 2,
            unitPrice: 15000,
          },
        ],
        fulfillmentMode: "DIRECT_SALE",
        paymentStatus: "PAID",
        paymentMethod: "POS",
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.fulfillmentMode).toBe("DIRECT_SALE");
        expect(valid.data.deliveryFee).toBe(0);
        expect(valid.data.paymentMethod).toBe("POS");
      }
    });

    it("should accept valid manual order input for home delivery with shipping fee", () => {
      const valid = createManualOrderSchema.safeParse({
        customerName: "Emeka Okafor",
        customerEmail: "emeka@example.com",
        customerPhone: "+2348099887766",
        items: [
          {
            productId: "prod_2",
            variantId: "var_1",
            quantity: 1,
          },
        ],
        fulfillmentMode: "SHIP_TO_CUSTOMER",
        shippingAddress: {
          recipientName: "Emeka Okafor",
          phone: "+2348099887766",
          addressLine1: "12 Admiralty Way, Lekki Phase 1",
          city: "Lekki",
          state: "Lagos",
        },
        deliveryFee: 2500,
        paymentStatus: "PENDING",
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.fulfillmentMode).toBe("SHIP_TO_CUSTOMER");
        expect(valid.data.deliveryFee).toBe(2500);
        expect(valid.data.shippingAddress?.city).toBe("Lekki");
      }
    });

    it("should reject order with empty items list", () => {
      const invalid = createManualOrderSchema.safeParse({
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "08011112222",
        items: [],
        fulfillmentMode: "STORE_PICKUP",
      });

      expect(invalid.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const invalid = createManualOrderSchema.safeParse({
        customerName: "John Doe",
        customerEmail: "not-an-email",
        customerPhone: "08011112222",
        items: [{ productId: "p1", quantity: 1 }],
        fulfillmentMode: "STORE_PICKUP",
      });

      expect(invalid.success).toBe(false);
    });
  });

  describe("Manual Order Serialization", () => {
    it("should serialize manual order with dual financial amounts and transaction details", () => {
      const now = new Date();
      const order = {
        id: "order_manual_1",
        businessId: "biz_1",
        customerId: "cust_1",
        orderNumber: "ORD-0001",
        customerName: "Ngozi Obi",
        customerEmail: "ngozi@example.com",
        customerPhone: "+2348011223344",
        notes: "Paid via GTBank transfer",
        currency: "NGN",
        subtotal: new Prisma.Decimal(30000),
        discountAmount: new Prisma.Decimal(0),
        deliveryFee: new Prisma.Decimal(0),
        platformFee: new Prisma.Decimal(0),
        merchantEarnings: new Prisma.Decimal(30000),
        total: new Prisma.Decimal(30000),
        status: "COMPLETED" as const,
        paymentStatus: "PAID" as const,
        fulfillmentStatus: "DELIVERED" as const,
        deliveryType: "STORE_PICKUP" as const,
        pickupLocation: "Shop 4, Ikeja Mall, Lagos",
        shippingAddress: null,
        terminalRateId: null,
        terminalShipmentId: null,
        trackingUrl: null,
        courierName: null,
        trackingNumber: null,
        paystackSubaccount: null,
        estimatedDelivery: null,
        paymentReference: "ORD-MANUAL-ORD0001-12345",
        paidAt: now,
        fulfilledAt: now,
        createdAt: now,
        updatedAt: now,
        items: [
          {
            id: "item_1",
            orderId: "order_manual_1",
            productId: "prod_1",
            variantId: null,
            productName: "Sneakers",
            variantTitle: null,
            productSku: "SNK-01",
            productImage: "https://example.com/snk.jpg",
            unitPrice: new Prisma.Decimal(15000),
            quantity: 2,
            totalPrice: new Prisma.Decimal(30000),
            selectedOptions: null,
            createdAt: now,
          },
        ],
      };

      const serialized = serializeOrder(order);
      expect(serialized.orderNumber).toBe("ORD-0001");
      expect(serialized.total).toBe(30000);
      expect(serialized.totalKobo).toBe(3000000);
      expect(serialized.platformFee).toBe(0);
      expect(serialized.merchantEarnings).toBe(30000);
      expect(serialized.status).toBe("COMPLETED");
      expect(serialized.paymentStatus).toBe("PAID");
      expect(serialized.fulfillmentStatus).toBe("DELIVERED");
      expect(serialized.items).toHaveLength(1);
    });
  });
});
