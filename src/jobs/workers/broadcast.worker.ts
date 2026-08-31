import type { Job, PgBoss } from "pg-boss";
import { logger } from "../../lib/logger";
import { prisma } from "../../lib/prisma";
import {
  JOB_NAMES,
  type SendBroadcastMessagePayload,
  sendBroadcastMessagePayloadSchema,
} from "../job.types";

export async function broadcastWorker(
  jobs: Job<SendBroadcastMessagePayload>[],
): Promise<void> {
  await Promise.all(
    jobs.map(async (job) => {
      const { data } = job;

      try {
        const validated = sendBroadcastMessagePayloadSchema.parse(data);
        logger.info(
          { broadcastCampaignId: validated.broadcastCampaignId },
          "Processing broadcast campaign background worker",
        );

        const campaign = await prisma.broadcastCampaign.findUnique({
          where: { id: validated.broadcastCampaignId },
        });

        if (!campaign) {
          logger.warn(
            { broadcastCampaignId: validated.broadcastCampaignId },
            "Broadcast campaign not found",
          );
          return;
        }

        logger.info(
          {
            id: campaign.id,
            title: campaign.title,
            recipients: campaign.recipientCount,
          },
          "Broadcast campaign telemetry recorded successfully",
        );
      } catch (error) {
        logger.error(
          { error, data },
          "Failed to process broadcast campaign worker",
        );
        throw error;
      }
    }),
  );
}

export async function registerBroadcastWorker(boss: PgBoss): Promise<void> {
  await boss.work<SendBroadcastMessagePayload>(
    JOB_NAMES.SEND_BROADCAST_MESSAGE,
    broadcastWorker,
  );
}
