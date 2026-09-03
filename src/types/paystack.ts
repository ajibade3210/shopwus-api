// Paystack API type definitions

export interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  active: boolean;
}

export interface ResolvedBankAccount {
  account_number: string;
  account_name: string;
  bank_id: number;
}

export interface PaystackSubaccountResult {
  subaccount_code: string;
  account_name: string;
  settlement_bank: string;
  account_number: string;
}

export interface SplitPaymentResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface VerifiedTransactionData {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel: string;
  paid_at: string;
  [key: string]: unknown;
}

export interface PaystackWebhookPayload {
  event: string;
  data: {
    reference: string;
    amount: number;
    fees?: number;
    currency?: string;
    channel?: string;
    paid_at?: string;
    metadata?: {
      orderId?: string;
      businessId?: string;
      platformFee?: string | number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
