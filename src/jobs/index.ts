import type { PgBoss } from "pg-boss";
import { logger } from "../lib/logger";
import { Sentry } from "../lib/monitor";
import { JOB_NAMES } from "./job.types";
import { registerBroadcastWorker } from "./workers/broadcast.worker";
import { registerEmailWorker } from "./workers/email.worker";
import { registerInvoiceWorker } from "./workers/invoice.worker";

/**
 * Registers all background job workers.
 * Call this once during server startup, after boss.start().
 */
export async function registerAllWorkers(boss: PgBoss): Promise<void> {
  // v10+ requires queues to exist for certain operations (like scheduling or fetch loops)
  await Promise.all(
    Object.values(JOB_NAMES).map((name) => boss.createQueue(name)),
  );

  await Promise.all([
    registerEmailWorker(boss),
    registerInvoiceWorker(boss),
    registerBroadcastWorker(boss),
  ]);

  // Global monitoring: Alert if any job fails permanently after all retries
  boss.on("failed", (job) => {
    const error = new Error(
      `Job ${job.name} failed permanently after all retries`,
    );

    logger.error(
      { jobId: job.id, name: job.name, payload: job.data },
      "🔥 CRITICAL: Background job failed permanently!",
    );

    if (Sentry.isInitialized()) {
      Sentry.captureException(error, {
        extra: {
          jobId: job.id,
          payload: job.data,
          jobName: job.name,
        },
        tags: {
          jobType: job.name,
        },
      });
    }
  });
}
