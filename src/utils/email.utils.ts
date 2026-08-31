import path from "node:path";
import pug from "pug";
import {
  APPNAME,
  EmailTemplateNames,
} from "../config/constants/emailTemplateInputs";
import { env } from "../config/env";
import { JOB_NAMES } from "../jobs/job.types";
import { sendEmail } from "../lib/email";
import { getBoss } from "../lib/pgboss";
import type {
  SendNewLeadNotificationOptions,
  SendTemplateOptions,
} from "../types";
import { getDateTime } from "./date.utils";
import { getBusinessTypeSubjectPrefix } from "./studio.utils";

/**
 * Enqueues an email to be sent asynchronously.
 */
export async function sendEmailHandler(options: SendTemplateOptions) {
  const boss = getBoss();
  return boss.send(JOB_NAMES.SEND_EMAIL, options);
}

/**
 * The actual execution logic used by the background worker.
 */
export async function processEmail(options: SendTemplateOptions) {
  // Security: Validate template against whitelist to prevent path traversal
  const allowedTemplates = Object.values(EmailTemplateNames) as string[];
  if (!allowedTemplates.includes(options.template)) {
    throw new Error(`Forbidden email template: ${options.template}`);
  }

  const templatePath = path.join(
    process.cwd(),
    "assets/templates/emails",
    `${options.template}.pug`,
  );
  const html = pug.renderFile(templatePath, {
    currentYear: getDateTime().year,
    getDateTime,
    ...options.context,
  });
  return sendEmail({
    ...options,
    html,
  });
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  studioName?: string,
) {
  return sendEmailHandler({
    to,
    subject: "Welcome to Shopwus!",
    template: "welcome",
    context: {
      name,
      email: to,
      studioName,
      url: `${env.FRONTEND_URL}/login`,
    },
  });
}

export async function sendNewLeadNotificationEmail(
  options: SendNewLeadNotificationOptions,
) {
  const subjectPrefix = getBusinessTypeSubjectPrefix(options.businessType);

  return sendEmailHandler({
    to: options.vendorEmail,
    subject: `${subjectPrefix}: ${options.customerName} on ${options.studioName || APPNAME}`,
    template: EmailTemplateNames.NEW_LEAD,
    context: {
      ...options,
      url: `${env.FRONTEND_URL}/vendor/leads`,
    },
  });
}
