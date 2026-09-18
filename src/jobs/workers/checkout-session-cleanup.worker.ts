import type { Job, PgBoss } from "pg-boss";
import { logger } from "../../lib/logger";
import { prisma } from "../../lib/prisma";
import { JOB_NAMES } from "../job.types";

export async function checkoutSessionCleanupWorker(
  _jobs: Job<Record<string, never>>[],
): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    logger.info("Running 30-day TTL cleanup for abandoned checkout sessions");

    const deleted = await prisma.checkoutSession.deleteMany({
      where: {
        status: { in: ["ABANDONED", "IN_PROGRESS"] },
        createdAt: { lte: thirtyDaysAgo },
      },
    });

    logger.info(
      { deletedCount: deleted.count },
      "Cleaned up expired checkout sessions successfully",
    );
  } catch (error) {
    logger.error({ error }, "Failed to clean up expired checkout sessions");
    throw error;
  }
}

export async function registerCheckoutSessionCleanupWorker(
  boss: PgBoss,
): Promise<void> {
  await boss.work(
    JOB_NAMES.CLEANUP_CHECKOUT_SESSIONS,
    checkoutSessionCleanupWorker,
  );

  // Schedule daily maintenance cron at 3:00 AM UTC
  await boss.schedule(
    JOB_NAMES.CLEANUP_CHECKOUT_SESSIONS,
    "0 3 * * *",
    {},
    { tz: "UTC" },
  );
}
