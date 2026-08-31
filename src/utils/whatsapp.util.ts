import twilio from "twilio";
import { env } from "../config/env";
import { JOB_NAMES } from "../jobs/job.types";
import { logger } from "../lib/logger";
import { getBoss } from "../lib/pgboss";

let twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio | null {
  if (twilioClient) return twilioClient;
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return twilioClient;
}

export async function queueWhatsappMessage(options: {
  to: string;
  body?: string;
  contentSid?: string;
  contentVariables?: Record<string, string>;
}): Promise<void> {
  try {
    const boss = getBoss();
    await boss.send(JOB_NAMES.SEND_WHATSAPP, options);
  } catch (error) {
    logger.warn(
      { error, options },
      "Failed to enqueue WhatsApp job; sending directly",
    );
    await sendWhatsappMessage(options);
  }
}

export async function sendWhatsappMessage(options: {
  to: string;
  body?: string;
  contentSid?: string;
  contentVariables?: Record<string, string>;
}): Promise<void> {
  const client = getTwilioClient();
  const formattedTo = options.to.startsWith("whatsapp:")
    ? options.to
    : `whatsapp:${options.to}`;

  if (!client) {
    logger.info(
      { formattedTo, options },
      "[WhatsApp Mock] Twilio message dispatched",
    );
    return;
  }

  try {
    if (options.contentSid) {
      await client.messages.create({
        from: env.TWILIO_WHATSAPP_NUMBER,
        to: formattedTo,
        contentSid: options.contentSid,
        contentVariables: JSON.stringify(options.contentVariables || {}),
      });
    } else if (options.body) {
      await client.messages.create({
        from: env.TWILIO_WHATSAPP_NUMBER,
        to: formattedTo,
        body: options.body,
      });
    }
  } catch (error) {
    logger.error({ error, options }, "Failed to send WhatsApp message");
    throw error;
  }
}
