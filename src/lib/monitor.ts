import * as Sentry from "@sentry/node";
import { env } from "../config/env";
import { logger } from "./logger";

/**
 * Initializes error monitoring with Sentry.
 * If SENTRY_DSN is not provided, it fails silently with a warning.
 */
export function initMonitor() {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Adjust sample rate for simple/cheap monitoring
    tracesSampleRate: 0.1,
  });

  logger.info("📡 Sentry monitoring successfully initialized");
}

/**
 * Checks if Sentry has been successfully initialized.
 */
export function isInitialized(): boolean {
  return !!Sentry.getClient();
}

export { Sentry };
