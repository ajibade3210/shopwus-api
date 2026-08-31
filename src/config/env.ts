import dotenv from "dotenv";
import { z } from "zod";

// Load .env file but NEVER override variables already set in the environment.
// This is critical for tests: Testcontainers injects DATABASE_URL before
// test workers start, and we must not let dotenv clobber it with a dev value.
dotenv.config({ override: false });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  HOST: z.string().default("0.0.0.0"),

  DATABASE_URL: z
    .url("DATABASE_URL must be a valid URL")
    .min(1, "DATABASE_URL is required"),
  BOSS_DATABASE_URL: z.url().optional(),
  DIRECT_URL: z.string("DIRECT_URL must be a valid"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  NOTIFICATION_BATCH_SIZE: z.coerce.number().int().positive().default(200),
  RATE_LIMIT_TIME_WINDOW: z.string().default("1 minute"),
  CLOUDFLARE_R2_ACCESS_KEY: z.string(),
  CLOUDFLARE_R2_SECRET_KEY: z.string(),
  CLOUDFLARE_R2_ACCOUNT_ID: z.string(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string(),
  CLOUDFLARE_R2_PUBLIC_URL: z.url(),
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.email().default("onboarding@resend.dev"),
  ADMIN_EMAIL: z.email().optional(),
  MANUAL_EMAIL_PASSWORD: z
    .string()
    .min(8, "MANUAL_EMAIL_PASSWORD must be at least 8 characters"),
  MAX_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB default
  MAX_VIDEO_SIZE: z.coerce.number().default(50 * 1024 * 1024), // 50MB default
  FRONTEND_URL: z.url(),
  CORS: z.string().default(""),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("1d"),
  JWT_REMEMBER_ME_EXPIRES_IN: z.string().default("30d"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_API_KEY_SID: z.string().optional(),
  TWILIO_API_KEY_SECRET: z.string().optional(),
  TWILIO_TEST_ACCOUNT_SID: z.string().optional(),
  TWILIO_TEST_AUTH_TOKEN: z.string().optional(),
  TWILIO_SMS_NUMBER: z.string().optional(),

  TWILIO_WHATSAPP_NUMBER: z.string().default("whatsapp:+14155238886"),
  TWILIO_WHATSAPP_OTP_TEMPLATE_SID: z
    .string()
    .default("HXb2beee08d937dbcfd50db8aa9fe833a3"),

  GEOAPIFY_API_KEY: z.string().optional(),
  APP_DEFAULT_TIMEZONE: z.string().default("Africa/Lagos"),
  BOOTSTRAP_SECRET: z
    .string()
    .min(32, "BOOTSTRAP_SECRET must be at least 32 characters long"),
  PUPPETEER_WS_ENDPOINT: z.string().optional(),
  PUPPETEER_WS_ENDPOINT_BACKUP: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const { fieldErrors } = z.flattenError(result.error);

  console.error("❌ Invalid environment variables:");

  for (const [key, errors] of Object.entries(fieldErrors)) {
    if (!errors) continue;
    console.error(`  ${key}: ${errors.join(", ")}`);
  }

  process.exit(1);
}

export const env = result.data;
