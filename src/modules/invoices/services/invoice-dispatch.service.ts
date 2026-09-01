import { EmailTemplateNames } from "../../../config/constants/emailTemplateInputs";
import { env } from "../../../config/env";
import { JOB_NAMES } from "../../../jobs/job.types";
import { NotFoundError } from "../../../lib/errors";
import { getBoss } from "../../../lib/pgboss";
import { prisma } from "../../../lib/prisma";
import { toFinancialAmount } from "../../../utils/currency.utils";
import { sendEmailHandler } from "../../../utils/email.utils";
import { generateNextInvoiceNumber } from "./invoice.service";

export async function sendInvoiceService(
  invoiceId: string,
  businessId: string,
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: {
      customer: true,
      business: true,
      items: true,
    },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "sent",
      sentAt: new Date(),
    },
  });

  // Log activity
  await prisma.customerActivity.create({
    data: {
      businessId,
      customerId: invoice.customerId,
      type: "invoice_sent",
      description: `Invoice '${invoice.invoiceNumber}' sent to ${invoice.customerEmail} (₦${Number(invoice.total).toLocaleString()}).`,
    },
  });

  // Enqueue background PDF generation
  try {
    const boss = getBoss();
    if (boss) {
      await boss.send(JOB_NAMES.GENERATE_INVOICE_PDF, {
        invoiceId: invoice.id,
        businessId,
      });
    }
  } catch (_err) {
    // Non-blocking: background job queue error should not fail dispatch response
  }

  const studioEmailHeaderUrl =
    invoice.business.includeHeaderInEmail !== false
      ? invoice.business.emailHeaderUrl || undefined
      : undefined;

  const invoiceUrl = `${env.FRONTEND_URL}/invoices/${invoice.invoiceNumber}`;

  // Send email notification to client
  sendEmailHandler({
    to: invoice.customerEmail,
    subject: `Invoice ${invoice.invoiceNumber} from ${invoice.business.name}`,
    template: EmailTemplateNames.STUDIO_INVOICE,
    context: {
      recipientName: invoice.customerName,
      studioName: invoice.business.name,
      studioHeaderUrl: studioEmailHeaderUrl,
      amount: Number(invoice.total).toLocaleString(),
      currency: invoice.currency || "NGN",
      invoiceNumber: invoice.invoiceNumber,
      dueDate: invoice.dueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      invoiceUrl,
      notes: invoice.notes || undefined,
      message: `Thank you for your business with ${invoice.business.name}. Please find your invoice summary below. You can view, download, or settle your invoice online.`,
    },
  }).catch(() => {});

  return {
    success: true,
    invoiceId: updatedInvoice.id,
    invoiceNumber: updatedInvoice.invoiceNumber,
    recipient: updatedInvoice.customerEmail,
    ...toFinancialAmount(updatedInvoice.total, "amount"),
    status: updatedInvoice.status,
  };
}

export async function resendInvoiceService(
  invoiceId: string,
  businessId: string,
) {
  return sendInvoiceService(invoiceId, businessId);
}

export async function sendQuickCustomerInvoiceService(
  customerId: string,
  businessId: string,
  options?: { serviceId?: string; amount?: string | number },
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
    include: {
      services: true,
      business: true,
    },
  });

  if (!customer) {
    throw new NotFoundError("Customer not found");
  }

  const targetService = options?.serviceId
    ? customer.services.find((s) => s.id === options.serviceId)
    : customer.services[0];

  const rawAmount =
    options?.amount !== undefined
      ? Number(options.amount)
      : targetService
        ? Number(targetService.amount)
        : Number(customer.totalRevenue) || 0;

  const invoiceNumber = await generateNextInvoiceNumber(businessId);
  const serviceTitle = targetService?.name || "";

  const invoice = await prisma.invoice.create({
    data: {
      businessId,
      customerId: customer.id,
      invoiceNumber,
      customerName: customer.name,
      customerEmail: customer.email,
      subtotal: rawAmount,
      total: rawAmount,
      status: "sent",
      sentAt: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            description: serviceTitle,
            quantity: 1,
            unitPrice: rawAmount,
            amount: rawAmount,
          },
        ],
      },
    },
  });

  // Log activity
  await prisma.customerActivity.create({
    data: {
      businessId,
      customerId: customer.id,
      type: "invoice_sent",
      description: `Quick invoice '${invoice.invoiceNumber}' created & dispatched to ${customer.email} (₦${rawAmount.toLocaleString()}).`,
    },
  });

  // Enqueue background PDF generation
  try {
    const boss = getBoss();
    if (boss) {
      await boss.send(JOB_NAMES.GENERATE_INVOICE_PDF, {
        invoiceId: invoice.id,
        businessId,
      });
    }
  } catch (_err) {
    // Non-blocking
  }

  return {
    success: true,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    recipient: customer.email,
    ...toFinancialAmount(rawAmount, "amount"),
  };
}
