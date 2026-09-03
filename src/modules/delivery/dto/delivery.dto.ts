import type { DeliveryZone } from "@prisma/client";
import { toFinancialAmount } from "../../../utils/currency.utils";

export interface DeliveryZoneDto {
  id: string;
  businessId: string;
  name: string;
  states: string[];
  fee: number;
  feeKobo?: number;
  estimatedDays?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorefrontDeliveryConfigDto {
  enableStorePickup: boolean;
  enableHomeDelivery: boolean;
  freeDeliveryThreshold?: number | null;
  freeDeliveryThresholdKobo?: number | null;
  pickupLocation?: string | null;
  pickupInstructions?: string | null;
  deliveryZones: DeliveryZoneDto[];
}

// ── Serializers ───────────────────────────────────────────────────────────────

export function serializeDeliveryZone(zone: DeliveryZone): DeliveryZoneDto {
  return {
    id: zone.id,
    businessId: zone.businessId,
    name: zone.name,
    states: zone.states,
    ...toFinancialAmount(zone.fee, "fee"),
    estimatedDays: zone.estimatedDays,
    isActive: zone.isActive,
    createdAt: zone.createdAt.toISOString(),
    updatedAt: zone.updatedAt.toISOString(),
  };
}
