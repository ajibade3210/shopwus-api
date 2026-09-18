import { Prisma } from "@prisma/client";
import { NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import type { UpdateDeliverySettingsInput } from "../schema/delivery.schema";

export async function getDeliverySettingsService(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      senderPhone: true,
      enableStorePickup: true,
      pickupInstructions: true,
      enableHomeDelivery: true,
      freeDeliveryThreshold: true,
      fallbackShippingFee: true,
    },
  });

  if (!business) {
    throw new NotFoundError("Business not found");
  }

  return business;
}

export async function updateDeliverySettingsService(
  businessId: string,
  input: UpdateDeliverySettingsInput,
) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    throw new NotFoundError("Business not found");
  }

  const updateData: Prisma.BusinessUpdateInput = {};
  if (input.addressLine1 !== undefined)
    updateData.addressLine1 = input.addressLine1;
  if (input.addressLine2 !== undefined)
    updateData.addressLine2 = input.addressLine2;
  if (input.city !== undefined) updateData.city = input.city;
  if (input.state !== undefined) updateData.state = input.state;
  if (input.postalCode !== undefined) updateData.postalCode = input.postalCode;
  if (input.senderPhone !== undefined)
    updateData.senderPhone = input.senderPhone;
  if (input.enableStorePickup !== undefined)
    updateData.enableStorePickup = input.enableStorePickup;
  if (input.pickupInstructions !== undefined)
    updateData.pickupInstructions = input.pickupInstructions;
  if (input.enableHomeDelivery !== undefined)
    updateData.enableHomeDelivery = input.enableHomeDelivery;
  if (input.freeDeliveryThreshold !== undefined) {
    updateData.freeDeliveryThreshold =
      input.freeDeliveryThreshold !== null
        ? new Prisma.Decimal(input.freeDeliveryThreshold)
        : null;
  }
  if (input.fallbackShippingFee !== undefined) {
    updateData.fallbackShippingFee =
      input.fallbackShippingFee !== null
        ? new Prisma.Decimal(input.fallbackShippingFee)
        : new Prisma.Decimal(3000);
  }

  return prisma.business.update({
    where: { id: businessId },
    data: updateData,
    select: {
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      senderPhone: true,
      enableStorePickup: true,
      pickupInstructions: true,
      enableHomeDelivery: true,
      freeDeliveryThreshold: true,
      fallbackShippingFee: true,
    },
  });
}

export async function getStorefrontDeliveryConfigService(studioSlug: string) {
  const business = await prisma.business.findUnique({
    where: { slug: studioSlug },
    select: {
      id: true,
      name: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      enableStorePickup: true,
      pickupInstructions: true,
      enableHomeDelivery: true,
      freeDeliveryThreshold: true,
      fallbackShippingFee: true,
    },
  });

  if (!business) {
    throw new NotFoundError("Storefront not found");
  }

  const storeAddressParts = [
    business.addressLine1,
    business.addressLine2,
    business.city,
    business.state,
  ].filter(Boolean);

  const formattedStoreAddress =
    storeAddressParts.length > 0 ? storeAddressParts.join(", ") : null;

  return {
    enableStorePickup: business.enableStorePickup,
    pickupLocation: formattedStoreAddress,
    pickupInstructions: business.pickupInstructions,
    enableHomeDelivery: business.enableHomeDelivery,
    freeDeliveryThreshold: business.freeDeliveryThreshold
      ? Number(business.freeDeliveryThreshold)
      : null,
    fallbackShippingFee: business.fallbackShippingFee
      ? Number(business.fallbackShippingFee)
      : 3000,
  };
}
