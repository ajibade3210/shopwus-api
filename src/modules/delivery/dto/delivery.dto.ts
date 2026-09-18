export interface DeliveryQuoteDto {
  rateId: string;
  carrierName: string;
  carrierSlug?: string | null;
  carrierLogo?: string | null;
  deliveryEta?: number | null;
  deliveryTime?: string | null;
  currency: string;
  fee: number;
  feeKobo: number;
}

export interface StorefrontDeliveryConfigDto {
  enableStorePickup: boolean;
  enableHomeDelivery: boolean;
  freeDeliveryThreshold?: number | null;
  freeDeliveryThresholdKobo?: number | null;
  fallbackShippingFee?: number | null;
  fallbackShippingFeeKobo?: number | null;
  pickupLocation?: string | null;
  pickupInstructions?: string | null;
}

export interface DeliverySettingsDto {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  senderPhone?: string | null;
  enableStorePickup: boolean;
  pickupInstructions?: string | null;
  enableHomeDelivery: boolean;
  freeDeliveryThreshold?: number | null;
  freeDeliveryThresholdKobo?: number | null;
  fallbackShippingFee?: number | null;
  fallbackShippingFeeKobo?: number | null;
}

export interface TerminalQuoteResponse {
  status: boolean;
  message?: string;
  data?: Array<{
    id: string;
    carrier_name: string;
    carrier_slug?: string;
    carrier_logo?: string;
    delivery_eta?: number;
    delivery_time?: string;
    amount: number;
    currency?: string;
  }>;
}
