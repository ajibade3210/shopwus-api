import { z } from "zod";
import type { JobPayloadMap } from "../types";

export const JOB_NAMES = {
  SEND_EMAIL: "send-email",
  SEND_WHATSAPP: "send-whatsapp",
  GENERATE_INVOICE_PDF: "generate-invoice-pdf",
  SEND_BROADCAST_MESSAGE: "admin-send-broadcast-message",
  CLEANUP_EXPIRED_SESSIONS: "auth-cleanup-expired-sessions",
  CLEANUP_CHECKOUT_SESSIONS: "cleanup-checkout-sessions",
  GENERATE_HEADER_BANNER: "generate-header-banner",
  LOGISTICS_WEEKLY_SWEEP: "logistics-weekly-sweep",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export const sendEmailPayloadSchema = z.object({
  to: z.email(),
  subject: z.string(),
  template: z.string(),
  context: z.record(z.string(), z.unknown()),
});

export type SendEmailPayload = z.infer<typeof sendEmailPayloadSchema>;

export const sendWhatsappPayloadSchema = z
  .object({
    to: z.string(),
    body: z.string().optional(),
    contentSid: z.string().optional(),
    contentVariables: z.record(z.string(), z.string()).optional(),
  })
  .refine((data) => data.body || data.contentSid, {
    message: "Either body or contentSid must be provided",
    path: ["body"],
  });

export type SendWhatsappPayload = z.infer<typeof sendWhatsappPayloadSchema>;

export const generateInvoicePdfPayloadSchema = z.object({
  invoiceId: z.string(),
  businessId: z.string(),
});

export type GenerateInvoicePdfPayload = z.infer<
  typeof generateInvoicePdfPayloadSchema
>;

export const sendBroadcastMessagePayloadSchema = z.object({
  broadcastCampaignId: z.string(),
});

export type SendBroadcastMessagePayload = z.infer<
  typeof sendBroadcastMessagePayloadSchema
>;

export const generateHeaderBannerPayloadSchema = z.object({
  businessId: z.string(),
});

export type GenerateHeaderBannerPayload = z.infer<
  typeof generateHeaderBannerPayloadSchema
>;

// JobPayloadMap is defined in src/types/utils.ts, re-exported via src/types/index.ts
export type { JobPayloadMap };
