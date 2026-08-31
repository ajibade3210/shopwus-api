import type { Job, PgBoss } from "pg-boss";
import { logger } from "../../lib/logger";
import { processEmail } from "../../utils/email.utils";
import {
  JOB_NAMES,
  type SendEmailPayload,
  sendEmailPayloadSchema,
} from "../job.types";

export async function emailWorker(
  jobs: Job<SendEmailPayload>[],
): Promise<void> {
  await Promise.all(
    jobs.map(async (job) => {
      const { data } = job;

      try {
        const validatedData = sendEmailPayloadSchema.parse(data);
        logger.info(
          { to: validatedData.to, template: validatedData.template },
          "Processing background email",
        );

        await processEmail(validatedData);

        logger.info(
          { to: validatedData.to },
          "Background email sent successfully",
        );
      } catch (error) {
        logger.error({ error, data }, "Failed to process background email");
        throw error;
      }
    }),
  );
}

export async function registerEmailWorker(boss: PgBoss): Promise<void> {
  await boss.work<SendEmailPayload>(JOB_NAMES.SEND_EMAIL, emailWorker);
}
