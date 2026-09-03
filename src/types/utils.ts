import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  ExtendedPrismaClient,
  PrismaTransactionClient,
} from "../lib/prisma";

/**
 * Shared utility-layer TypeScript interfaces.
 * Declared here to satisfy the AGENTS.md rule: all exported interfaces
 * must live in src/types/, including those used in utils/, lib/, and jobs/.
 */

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface TimeBucket {
  label: string;
  start: Date;
  end: Date;
}

// ─── Sequences ────────────────────────────────────────────────────────────────

/**
 * SequenceDbClient is the union of all Prisma client variants accepted by
 * sequence helpers. Defined here so SequenceOptions can remain a proper
 * exported interface in src/types/.
 */
export type SequenceDbClient =
  | ExtendedPrismaClient
  | PrismaTransactionClient
  | PrismaClient
  | Prisma.TransactionClient;

export interface SequenceOptions {
  type?: string;
  year?: number;
  client?: SequenceDbClient;
}

// ─── Cookie Auth ──────────────────────────────────────────────────────────────

export interface SetAuthCookiesOptions {
  accessToken: string;
  refreshToken: string;
  rememberMe?: boolean;
}

// ─── Background Jobs ──────────────────────────────────────────────────────────

export interface JobPayloadMap {
  "send-email": {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
  };
  "send-whatsapp": {
    to: string;
    body?: string;
    contentSid?: string;
    contentVariables?: Record<string, string>;
  };
  "generate-invoice-pdf": {
    invoiceId: string;
    businessId: string;
  };
  "admin-send-broadcast-message": {
    broadcastCampaignId: string;
  };
  "auth-cleanup-expired-sessions": Record<string, never>;
  "generate-header-banner": {
    businessId: string;
  };
}
