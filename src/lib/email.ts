import { Resend } from "resend";
import { env } from "../config/env";
import type { SendEmailOptions } from "../types";
import { logger } from "./logger";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail(options: SendEmailOptions) {
  try {
    const { to, subject, html, text, from, attachments, tags, cc, bcc } =
      options;

    const defaultFrom = from
      ? from.includes("<")
        ? from
        : `Shopwus <${from}>`
      : `Shopwus <${env.RESEND_FROM_EMAIL}>`;

    const { data, error } = await resend.emails.send({
      from: defaultFrom,
      to,
      subject,
      cc,
      bcc,
      html: html || "",
      text: text || "",
      attachments,
      tags,
    });

    if (error) {
      logger.error(error, "Resend error");
      throw error;
    }
    logger.info(`Email sent to ${to} successfully.`);

    return data;
  } catch (error) {
    console.error("Email service error:", error);
    throw error;
  }
}
