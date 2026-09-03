import { Prisma } from "@prisma/client";
import { NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import type {
  DeliveryZoneInput,
  UpdateDeliverySettingsInput,
  UpdateDeliveryZoneInput,
} from "../schema/delivery.schema";

// ---------------------------------------------------------------------------
// VENDOR DELIVERY ZONES
// ---------------------------------------------------------------------------

export async function listDeliveryZonesService(businessId: string) {
  return prisma.deliveryZone.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createDeliveryZoneService(
  businessId: string,
  input: DeliveryZoneInput,
) {
  return prisma.deliveryZone.create({
    data: {
      businessId,
      name: input.name,
      states: input.states,
      fee: new Prisma.Decimal(input.fee),
      estimatedDays: input.estimatedDays || null,
      isActive: input.isActive,
    },
  });
}

export async function updateDeliveryZoneService(
  zoneId: string,
  businessId: string,
  input: UpdateDeliveryZoneInput,
) {
  const zone = await prisma.deliveryZone.findFirst({
    where: { id: zoneId, businessId },
  });

  if (!zone) {
    throw new NotFoundError("Delivery zone not found");
  }

  const data: Prisma.DeliveryZoneUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.states !== undefined) data.states = input.states;
  if (input.fee !== undefined) data.fee = new Prisma.Decimal(input.fee);
  if (input.estimatedDays !== undefined)
    data.estimatedDays = input.estimatedDays;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return prisma.deliveryZone.update({
    where: { id: zoneId },
    data,
  });
}

export async function deleteDeliveryZoneService(
  zoneId: string,
  businessId: string,
) {
  const zone = await prisma.deliveryZone.findFirst({
    where: { id: zoneId, businessId },
  });

  if (!zone) {
    throw new NotFoundError("Delivery zone not found");
  }

  return prisma.deliveryZone.delete({
    where: { id: zoneId },
  });
}

// ---------------------------------------------------------------------------
// VENDOR STORE ORIGIN ADDRESS & DELIVERY SETTINGS
// ---------------------------------------------------------------------------

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
      enableStorePickup: true,
      pickupInstructions: true,
      enableHomeDelivery: true,
      freeDeliveryThreshold: true,
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
      enableStorePickup: true,
      pickupInstructions: true,
      enableHomeDelivery: true,
      freeDeliveryThreshold: true,
    },
  });
}

// ---------------------------------------------------------------------------
// PUBLIC STOREFRONT DELIVERY CONFIG
// ---------------------------------------------------------------------------

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
      deliveryZones: {
        where: { isActive: true },
        orderBy: { fee: "asc" },
      },
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
    deliveryZones: business.deliveryZones.map((z) => ({
      id: z.id,
      name: z.name,
      states: z.states,
      fee: Number(z.fee),
      estimatedDays: z.estimatedDays,
    })),
  };
}
