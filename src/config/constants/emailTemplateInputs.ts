export enum EmailTemplateNames {
  WELCOME_OTP = "otp",
  PASSWORD_RESET = "password_reset",
  INVITE_STAFF = "invite_staff",
  WELCOME = "welcome",
  ACTION_CONFIRMATION = "action_confirmation",
  BROADCAST_MESSAGE = "broadcast_message",
  NEW_LEAD = "new_lead",

  // Studio-related templates (located in assets/templates/emails/studio/)
  STUDIO_MANUAL_EMAIL = "studio/manual_email",
  STUDIO_INVOICE = "studio/invoice",
}

export const APPNAME = "Shopwus";

export enum DeliveryChannel {
  EMAIL = "email",
  SMS = "sms",
  WHATSAPP = "whatsapp",
}

import { env } from "../env";

export const DEFAULT_EMAIL_ASSETS = {
  FALLBACK_R2_URL: "https://pub-d89922cb03b54e33ae779d915f49c77f.r2.dev",
  FALLBACK_FRONTEND_URL: "https://shopwus.com",
  DEFAULT_HEADER_BANNER_PATH:
    "test/accessa/cmtgyit0u00006g9ko2ifxfh3/images/48cb6dca8f7327b62ed89883ef9f535d.png",
  DEFAULT_LOGO_PATH:
    "test/shopwus/cmthmkmof0028xh9kg6nu5t4y/images/dbd8a9b9329635870455adebb7e17f3b.png",
} as const;

export function getEmailAssetUrls() {
  const r2PublicUrl =
    env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/+$/, "") ||
    DEFAULT_EMAIL_ASSETS.FALLBACK_R2_URL;
  const frontendUrl =
    env.FRONTEND_URL?.replace(/\/+$/, "") ||
    DEFAULT_EMAIL_ASSETS.FALLBACK_FRONTEND_URL;

  return {
    r2PublicUrl,
    frontendUrl,
    headerBannerUrl: `${r2PublicUrl}/${DEFAULT_EMAIL_ASSETS.DEFAULT_HEADER_BANNER_PATH}`,
    logoUrl: `${r2PublicUrl}/${DEFAULT_EMAIL_ASSETS.DEFAULT_LOGO_PATH}`,
  };
}
