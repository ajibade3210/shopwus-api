import { NotFoundError } from "../../../lib/errors";
import { getBoss } from "../../../lib/pgboss";
import { prisma } from "../../../lib/prisma";
import { sendEmailHandler } from "../../../utils/email.utils";
import { queueWhatsappMessage } from "../../../utils/whatsapp.util";
import type {
  BroadcastHistoryItemDto,
  BroadcastResultDto,
} from "../dto/broadcast.dto";
import type { SendBroadcastInput } from "../schema/broadcast.schema";

export async function sendBroadcastService(
  businessId: string,
  data: SendBroadcastInput,
): Promise<BroadcastResultDto> {
  const customers = await prisma.customer.findMany({
    where: {
      businessId,
      id: { in: data.customerIds },
    },
    include: { business: true },
  });

  if (customers.length === 0) {
    throw new NotFoundError(
      "None of the selected customer recipients were found",
    );
  }

  const broadcastTitle =
    data.subject ||
    `Broadcast ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const campaign = await prisma.broadcastCampaign.create({
    data: {
      businessId,
      title: broadcastTitle,
      channel: data.channel.toUpperCase(),
      recipientCount: customers.length,
      status: "COMPLETED",
      sentAt: new Date(),
    },
  });

  let whatsAppRecipients = 0;
  let emailRecipients = 0;

  for (const c of customers) {
    // Dispatch Email
    if (
      (data.channel === "email" || data.channel === "both") &&
      c.email?.trim()
    ) {
      emailRecipients++;
      sendEmailHandler({
        to: c.email,
        subject: data.subject || "Message from your Studio",
        template: "otp",
        context: {
          recipientName: c.name,
          studioName: c.business.name,
          message: data.message,
          imageUrl: data.imageUrl,
        },
      }).catch(() => {});
    }

    // Dispatch WhatsApp
    if (
      (data.channel === "whatsapp" || data.channel === "both") &&
      c.phone?.trim()
    ) {
      whatsAppRecipients++;
      queueWhatsappMessage({
        to: c.phone,
        body: data.imageUrl
          ? `${data.message}\n\nMedia: ${data.imageUrl}`
          : data.message,
      }).catch(() => {});
    }

    // Log Activity on client profile
    prisma.customerActivity
      .create({
        data: {
          businessId,
          customerId: c.id,
          type: "broadcast_received",
          description: `Client received ${data.channel.toUpperCase()} broadcast: '${broadcastTitle}'.`,
        },
      })
      .catch(() => {});
  }

  // Trigger pg-boss broadcast campaign job for background telemetry
  const boss = getBoss();
  if (boss) {
    boss
      .send("admin-send-broadcast-message", {
        broadcastCampaignId: campaign.id,
      })
      .catch(() => {});
  }

  return {
    broadcastId: campaign.id,
    channel: data.channel,
    totalRecipients: customers.length,
    whatsAppRecipients,
    emailRecipients,
    deliveredCount: customers.length,
    timestamp: campaign.sentAt.toISOString(),
  };
}

export async function getBroadcastHistoryService(
  businessId: string,
): Promise<BroadcastHistoryItemDto[]> {
  const campaigns = await prisma.broadcastCampaign.findMany({
    where: { businessId },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  return campaigns.map((c) => ({
    id: c.id,
    businessId: c.businessId,
    title: c.title,
    channel: c.channel,
    recipientCount: c.recipientCount,
    status: c.status,
    sentAt: c.sentAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
  }));
}
