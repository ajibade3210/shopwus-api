/**
 * Sets dummy env vars so unit tests can import src modules without a real .env.
 * Only fills gaps — real values from .env (loaded by dotenv in env.ts) take precedence
 * because dotenv.config({ override: false }) is used there.
 */
const defaults: Record<string, string> = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/shopwus_test",
  DIRECT_URL: "postgresql://postgres:postgres@localhost:5432/shopwus_test",
  CLOUDFLARE_R2_ACCESS_KEY: "test-r2-access-key",
  CLOUDFLARE_R2_SECRET_KEY: "test-r2-secret-key",
  CLOUDFLARE_R2_ACCOUNT_ID: "test-r2-account-id",
  CLOUDFLARE_R2_BUCKET_NAME: "test-bucket",
  CLOUDFLARE_R2_PUBLIC_URL: "https://test.r2.example.com",
  RESEND_API_KEY: "re_test_key",
  MANUAL_EMAIL_PASSWORD: "test-manual-email-password-1234",
  FRONTEND_URL: "https://test.example.com",
  JWT_SECRET: "test-jwt-secret-for-unit-tests-only",
  BOOTSTRAP_SECRET: "btestp_X7kP9mQzL4nR2vW8jT6hY1cF3sDuE5",
  TWILIO_ACCOUNT_SID: "ACtest000000000000000000000000000",
  TWILIO_AUTH_TOKEN: "test-twilio-auth-token-00000000",
  GEOAPIFY_API_KEY: "test-geoapify-key",
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
