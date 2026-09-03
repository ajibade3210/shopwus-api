import crypto from "node:crypto";
import { env } from "../config/env";
import type {
  PaystackBank,
  PaystackSubaccountResult,
  ResolvedBankAccount,
  SplitPaymentResult,
  VerifiedTransactionData,
} from "../types/paystack";
import { PaymentError, TechnicalError, ValidationError } from "./errors";

export type {
  PaystackBank,
  PaystackSubaccountResult,
  PaystackWebhookPayload,
  ResolvedBankAccount,
  SplitPaymentResult,
  VerifiedTransactionData,
} from "../types/paystack";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface PaystackResponse<T> {
  status: boolean;
  message?: string;
  data: T;
}

function getHeaders() {
  const secretKey =
    env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || "";
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };
}

export async function listPaystackBanks(): Promise<PaystackBank[]> {
  try {
    const res = await fetch(`${PAYSTACK_BASE_URL}/bank?country=nigeria`, {
      headers: getHeaders(),
    });
    const data = (await res.json()) as PaystackResponse<PaystackBank[]>;
    if (!data.status) {
      throw new TechnicalError(
        data.message || "Failed to fetch banks from Paystack",
      );
    }
    return data.data;
  } catch (_err) {
    // Return fallback popular banks list if external API call fails
    return [
      {
        id: 1,
        name: "Access Bank",
        slug: "access-bank",
        code: "044",
        active: true,
      },
      {
        id: 2,
        name: "Guaranty Trust Bank",
        slug: "gtbank",
        code: "058",
        active: true,
      },
      {
        id: 3,
        name: "Zenith Bank",
        slug: "zenith-bank",
        code: "057",
        active: true,
      },
      {
        id: 4,
        name: "First Bank of Nigeria",
        slug: "first-bank",
        code: "011",
        active: true,
      },
      {
        id: 5,
        name: "United Bank For Africa",
        slug: "uba",
        code: "033",
        active: true,
      },
      {
        id: 6,
        name: "Kuda Bank",
        slug: "kuda-bank",
        code: "50211",
        active: true,
      },
      { id: 7, name: "OPay", slug: "opay", code: "999992", active: true },
      { id: 8, name: "Palmpay", slug: "palmpay", code: "999991", active: true },
      {
        id: 9,
        name: "Stanbic IBTC Bank",
        slug: "stanbic-ibtc",
        code: "221",
        active: true,
      },
      {
        id: 10,
        name: "Sterling Bank",
        slug: "sterling-bank",
        code: "232",
        active: true,
      },
      {
        id: 11,
        name: "Wema Bank",
        slug: "wema-bank",
        code: "035",
        active: true,
      },
      {
        id: 12,
        name: "Fidelity Bank",
        slug: "fidelity-bank",
        code: "070",
        active: true,
      },
    ];
  }
}

export async function resolveBankAccount(
  accountNumber: string,
  bankCode: string,
): Promise<ResolvedBankAccount> {
  const secretKey = env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    // Development demo fallback
    return {
      account_number: accountNumber,
      account_name: "VERIFIED MERCHANT ACCOUNT",
      bank_id: 1,
    };
  }

  const res = await fetch(
    `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${encodeURIComponent(
      accountNumber,
    )}&bank_code=${encodeURIComponent(bankCode)}`,
    {
      headers: getHeaders(),
    },
  );

  const data = (await res.json()) as PaystackResponse<ResolvedBankAccount>;
  if (!data.status) {
    throw new ValidationError(
      data.message || "Invalid account number or bank code",
    );
  }

  return data.data;
}

export async function createPaystackSubaccount(params: {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
  description?: string;
}): Promise<PaystackSubaccountResult> {
  const secretKey = env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    // Development mock
    return {
      subaccount_code: `ACCT_${Date.now()}`,
      account_name: params.business_name,
      settlement_bank: params.settlement_bank,
      account_number: params.account_number,
    };
  }

  const res = await fetch(`${PAYSTACK_BASE_URL}/subaccount`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      business_name: params.business_name,
      settlement_bank: params.settlement_bank,
      account_number: params.account_number,
      percentage_charge: params.percentage_charge,
      description:
        params.description || `Subaccount for ${params.business_name}`,
    }),
  });

  const data = (await res.json()) as PaystackResponse<PaystackSubaccountResult>;
  if (!data.status) {
    throw new PaymentError(
      data.message || "Failed to create Paystack subaccount",
    );
  }

  return data.data;
}

export async function initializeSplitPayment(params: {
  email: string;
  amountInKobo: number;
  subaccountCode: string;
  platformFeeInKobo: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<SplitPaymentResult> {
  const secretKey = env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    // Development mock checkout URL
    return {
      authorization_url: `${params.callbackUrl || "http://localhost:3000"}?reference=${params.reference}&paid=true`,
      access_code: `mock_acc_${Date.now()}`,
      reference: params.reference,
    };
  }

  const body = {
    email: params.email,
    amount: params.amountInKobo,
    reference: params.reference,
    subaccount: params.subaccountCode,
    transaction_charge: params.platformFeeInKobo,
    bearer: "subaccount", // Merchant absorbs gateway charge
    callback_url: params.callbackUrl,
    metadata: params.metadata,
  };

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as PaystackResponse<SplitPaymentResult>;
  if (!data.status) {
    throw new PaymentError(
      data.message || "Failed to initialize split transaction",
    );
  }

  return data.data;
}

export async function verifyPaystackTransaction(
  reference: string,
): Promise<VerifiedTransactionData> {
  const secretKey = env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return {
      status: "success",
      reference,
      amount: 100000,
      currency: "NGN",
      channel: "card",
      paid_at: new Date().toISOString(),
    };
  }

  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: getHeaders(),
    },
  );

  const data = (await res.json()) as PaystackResponse<VerifiedTransactionData>;
  if (!data.status) {
    throw new PaymentError(data.message || "Failed to verify transaction");
  }

  return data.data;
}

export function verifyPaystackWebhookSignature(
  rawBody: string | Buffer,
  signature: string | undefined,
): boolean {
  if (!signature) return false;
  const secretKey =
    env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || "";
  if (!secretKey) return true; // Accept during test/dev if secret not set

  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"))
    .digest("hex");

  return hash === signature;
}
