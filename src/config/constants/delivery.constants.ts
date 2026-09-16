export const TERMINAL_CONFIG = {
  SANDBOX_BASE_URL: "https://sandbox.terminal.africa/v1",
  LIVE_BASE_URL: "https://api.terminal.africa/v1",
  TIMEOUT_MS: 4000,
  DEFAULT_PARCEL_WEIGHT_KG: 0.5,
  DEFAULT_POSTAL_CODE: "100001",
  DEFAULT_COUNTRY_CODE: "NG",
  DEFAULT_CURRENCY: "NGN",
} as const;

export const DELIVERY_FALLBACK_CONFIG = {
  DEFAULT_FALLBACK_FEE: 3000,
  DEFAULT_CARRIER_NAME: "Standard Delivery",
  DEFAULT_ESTIMATED_DAYS: "2 - 4 business days",
} as const;

export const DELIVERY_BUFFER_CONFIG = {
  BUFFER_PERCENT: 5,
  MIN_BUFFER_NAIRA: 200,
  ROUND_TO_NEAREST: 50,
} as const;

export const DELIVERY_ERROR_MESSAGES = {
  ORIGIN_ADDRESS_INCOMPLETE: "Merchant store origin address is not configured.",
  DESTINATION_ADDRESS_INCOMPLETE:
    "Customer delivery destination address is incomplete.",
  QUOTE_FETCH_FAILED:
    "Unable to retrieve real-time courier quotes at this time.",
  TERMINAL_INSUFFICIENT_FUNDS:
    "Terminal Africa wallet balance is insufficient for courier dispatch.",
  TERMINAL_DISPATCH_FAILED: "Failed to dispatch courier with Terminal Africa.",
} as const;
