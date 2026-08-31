import type { PgBoss as PgBossType } from "pg-boss";
import { env } from "../config/env";
import { TechnicalError } from "./errors";
import { logger } from "./logger";

let bossInstance: PgBossType | null = null;

/**
 * Returns the running singleton PgBoss instance.
 * Throws if called before `startBoss()` has resolved.
 */
export function getBoss(): PgBossType {
  if (!bossInstance) {
    throw new TechnicalError(
      "PgBoss has not been started yet. Did you call startBoss() at server startup?",
    );
  }
  return bossInstance;
}

/**
 * Creates and starts the PgBoss singleton.
 * Calling it multiple times is safe — it returns the same instance.
 */
export async function startBoss(): Promise<PgBossType> {
  if (bossInstance) return bossInstance;

  const { PgBoss } = await import("pg-boss");

  const boss = new PgBoss({
    connectionString: env.BOSS_DATABASE_URL || env.DATABASE_URL,
  });

  boss.on("error", (err: Error) => {
    logger.error({ err }, "PgBoss internal error");
  });

  await boss.start();
  bossInstance = boss;

  return bossInstance;
}

/**
 * Gracefully stops the pg-boss instance.
 * Called automatically by the Fastify `onClose` hook.
 */
export async function stopBoss(): Promise<void> {
  if (!bossInstance) return;
  await bossInstance.stop();
  bossInstance = null;
  logger.info("🛑 pg-boss queue stopped");
}
