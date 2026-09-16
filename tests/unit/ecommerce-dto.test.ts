import { Prisma } from "@prisma/client";
import {
  serializeBusinessBilling,
  serializePaymentTransaction,
} from "../../src/modules/billing/dto/billing.dto";
import {
  serializeOrder,
  serializeOrderItem,
} from "../../src/modules/orders/dto/order.dto";
import {
  serializeProduct,
  serializeProductVariant,
} from "../../src/modules/products/dto/product.dto";

describe("E-commerce DTO Serializers & Financial Precision", () => {
  describe("Product DTOs", () => {
    it("should serialize product with dual-unit financial amounts (Naira and Kobo)", () => {
      const now = new Date();
      const product = {
        id: "prod_1",
        businessId: "biz_1",
        categoryId: "cat_1",
        name: "Artisan Leather Bag",
        slug: "artisan-leather-bag",
        description: "Handmade",
        sku: "ALB-001",
        price: new Prisma.Decimal(45000.5),
        compareAtPrice: new Prisma.Decimal(50000),
        costPrice: new Prisma.Decimal(30000),
        trackInventory: true,
        inventoryCount: 10,
        lowStockThreshold: 2,
        allowBackorder: false,
        hasVariants: false,
        options: null,
        images: ["https://example.com/bag.jpg"],
        status: "ACTIVE" as const,
        isFeatured: true,
        attributes: null,
        requiresShipping: true,
        weightKg: new Prisma.Decimal(0.5),
        createdAt: now,
        updatedAt: now,
        category: {
          id: "cat_1",
          businessId: "biz_1",
          name: "Bags",
          slug: "bags",
          description: null,
          imageUrl: null,
          createdAt: now,
          updatedAt: now,
        },
      };

      const dto = serializeProduct(product);
      expect(dto.price).toBe(45000.5);
      expect(dto.priceKobo).toBe(4500050);
      expect(dto.compareAtPrice).toBe(50000);
      expect(dto.compareAtPriceKobo).toBe(5000000);
      expect(dto.costPrice).toBe(30000);
      expect(dto.costPriceKobo).toBe(3000000);
      expect(dto.category?.name).toBe("Bags");
      expect(dto.createdAt).toBe(now.toISOString());
    });

    it("should serialize product variants correctly", () => {
      const now = new Date();
      const variant = {
        id: "var_1",
        productId: "prod_1",
        title: "Large / Black",
        sku: "ALB-BLK-L",
        price: new Prisma.Decimal(48000),
        compareAtPrice: null,
        costPrice: null,
        inventoryCount: 5,
        options: { Size: "Large", Color: "Black" },
        imageUrl: null,
        createdAt: now,
        updatedAt: now,
      };

      const dto = serializeProductVariant(variant);
      expect(dto.price).toBe(48000);
      expect(dto.priceKobo).toBe(4800000);
      expect(dto.options).toEqual({ Size: "Large", Color: "Black" });
    });
  });

  describe("Order DTOs", () => {
    it("should serialize order and line items with financial amount fields", () => {
      const now = new Date();
      const item = {
        id: "item_1",
        orderId: "ord_1",
        productId: "prod_1",
        variantId: null,
        productName: "Artisan Leather Bag",
        variantTitle: null,
        productSku: "ALB-001",
        productImage: "https://example.com/bag.jpg",
        unitPrice: new Prisma.Decimal(45000),
        quantity: 2,
        totalPrice: new Prisma.Decimal(90000),
        selectedOptions: null,
        createdAt: now,
      };

      const itemDto = serializeOrderItem(item);
      expect(itemDto.unitPrice).toBe(45000);
      expect(itemDto.unitPriceKobo).toBe(4500000);
      expect(itemDto.totalPrice).toBe(90000);
      expect(itemDto.totalPriceKobo).toBe(9000000);

      const order = {
        id: "ord_1",
        businessId: "biz_1",
        customerId: "cust_1",
        orderNumber: "ORD-1001",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        customerPhone: "+2348012345678",
        notes: null,
        currency: "NGN",
        subtotal: new Prisma.Decimal(90000),
        discountAmount: new Prisma.Decimal(0),
        deliveryFee: new Prisma.Decimal(2500),
        platformFee: new Prisma.Decimal(2250),
        merchantEarnings: new Prisma.Decimal(90250),
        total: new Prisma.Decimal(92500),
        status: "OPEN" as const,
        paymentStatus: "UNPAID" as const,
        fulfillmentStatus: "UNFULFILLED" as const,
        deliveryType: "HOME_DELIVERY" as const,
        shippingAddress: null,
        pickupLocation: null,
        trackingNumber: null,
        courierName: null,
        terminalRateId: null,
        terminalShipmentId: null,
        trackingUrl: null,
        estimatedDelivery: null,
        fulfilledAt: null,
        paymentReference: "ref_123",
        paystackSubaccount: "sub_123",
        paidAt: null,
        createdAt: now,
        updatedAt: now,
        items: [item],
      };

      const orderDto = serializeOrder(order);
      expect(orderDto.subtotal).toBe(90000);
      expect(orderDto.subtotalKobo).toBe(9000000);
      expect(orderDto.deliveryFee).toBe(2500);
      expect(orderDto.deliveryFeeKobo).toBe(250000);
      expect(orderDto.platformFee).toBe(2250);
      expect(orderDto.platformFeeKobo).toBe(225000);
      expect(orderDto.total).toBe(92500);
      expect(orderDto.totalKobo).toBe(9250000);
      expect(orderDto.items?.length).toBe(1);
    });
  });

  describe("Delivery & Billing DTOs", () => {
    it("should serialize billing and payment transactions", () => {
      const now = new Date();
      const billing = {
        id: "bill_1",
        businessId: "biz_1",
        paystackSubaccount: "ACCT_xxx",
        bankCode: "058",
        bankName: "Guaranty Trust Bank",
        accountNumber: "0123456789",
        accountName: "Jane Doe Store",
        isVerified: true,
        planTier: "FREE",
        platformFeePercent: new Prisma.Decimal(2.5),
        subscriptionStatus: "ACTIVE",
        subscriptionCode: null,
        currentPeriodEnd: null,
        createdAt: now,
        updatedAt: now,
      };

      const billingDto = serializeBusinessBilling(billing);
      expect(billingDto.platformFeePercent).toBe(2.5);
      expect(billingDto.accountNumber).toBe("0123456789");

      const tx = {
        id: "tx_1",
        orderId: "ord_1",
        businessId: "biz_1",
        orderNumber: "ORD-1001",
        customerName: "Jane Doe",
        reference: "ref_123",
        amount: new Prisma.Decimal(92500),
        platformFee: new Prisma.Decimal(2250),
        gatewayFee: new Prisma.Decimal(1500),
        merchantSettlement: new Prisma.Decimal(88750),
        currency: "NGN",
        channel: "card",
        status: "SUCCESS" as const,
        paidAt: now,
        createdAt: now,
      };

      const txDto = serializePaymentTransaction(tx);
      expect(txDto.amount).toBe(92500);
      expect(txDto.amountKobo).toBe(9250000);
      expect(txDto.platformFee).toBe(2250);
      expect(txDto.platformFeeKobo).toBe(225000);
      expect(txDto.merchantSettlement).toBe(88750);
      expect(txDto.merchantSettlementKobo).toBe(8875000);
    });
  });
});
