import type { Job, PgBoss } from "pg-boss";
import { logger } from "../../lib/logger";
import { executeLogisticsSweep } from "../../modules/delivery/services/logistics-sweep.service";
import { JOB_NAMES } from "../job.types";

export async function logisticsSweepWorker(
  _jobs: Job<Record<string, never>>[],
): Promise<void> {
  try {
    logger.info("Executing scheduled Friday logistics fee sweep");
    const result = await executeLogisticsSweep("SCHEDULED");
    logger.info({ result }, "Completed scheduled Friday logistics fee sweep");
  } catch (error) {
    logger.error({ error }, "Failed to execute scheduled logistics fee sweep");
    throw error;
  }
}

export async function registerLogisticsSweepWorker(
  boss: PgBoss,
): Promise<void> {
  await boss.work(JOB_NAMES.LOGISTICS_WEEKLY_SWEEP, logisticsSweepWorker);

  await boss.schedule(
    JOB_NAMES.LOGISTICS_WEEKLY_SWEEP,
    "0 9 * * 5",
    {},
    { tz: "UTC" },
  );
}
