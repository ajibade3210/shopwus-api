import { JOB_NAMES } from "../../../jobs/job.types";
import { NotFoundError } from "../../../lib/errors";
import { logger } from "../../../lib/logger";
import { uploadToR2 } from "../../../lib/mediaUpload";
import { generatePdf } from "../../../lib/pdf";
import { getBoss } from "../../../lib/pgboss";
import { prisma } from "../../../lib/prisma";
import type { InvoicePdfData } from "../../../types";

export interface InvoicePdfStatusResult {
  ready: boolean;
  status: "pending" | "ready";
  downloadUrl?: string;
  pdfUrl?: string;
  filename: string;
  invoiceNumber: string;
}

export async function generateAndUploadInvoicePdf(
  invoiceId: string,
): Promise<{ pdfKey: string; pdfUrl: string } | null> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        business: true,
        items: true,
      },
    });

    if (!invoice) return null;

    const pdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      dueDate: invoice.dueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      studioName: invoice.business.name,
      studioEmail: invoice.business.email || undefined,
      studioPhone: invoice.business.phone || undefined,
      studioAddress: invoice.business.location || undefined,
      studioLogoUrl: invoice.business.logoUrl || undefined,
      studioEmailHeaderUrl:
        invoice.business.includeHeaderInInvoice !== false
          ? invoice.business.emailHeaderUrl || undefined
          : undefined,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      billingAddress: invoice.billingAddress || undefined,
      items: invoice.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit || undefined,
        unitPrice: Number(i.unitPrice).toLocaleString("en-US", {
          minimumFractionDigits: 2,
        }),
        amount: Number(i.amount).toLocaleString("en-US", {
          minimumFractionDigits: 2,
        }),
      })),
      subtotal: Number(invoice.subtotal).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      discount:
        Number(invoice.discount) > 0
          ? Number(invoice.discount).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })
          : undefined,
      taxRate:
        Number(invoice.taxRate) > 0 ? String(invoice.taxRate) : undefined,
      taxAmount:
        Number(invoice.taxAmount) > 0
          ? Number(invoice.taxAmount).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })
          : undefined,
      total: Number(invoice.total).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      }),
      notes: invoice.notes || undefined,
      currency: invoice.currency,
    };

    const pdfBuffer = await generatePdf("invoice", pdfData);
    const uploadFolder = `invoices/${invoice.businessId}`;
    const uploadResult = await uploadToR2(pdfBuffer, {
      folder: uploadFolder,
      public_id: invoice.invoiceNumber,
      mimetype: "application/pdf",
      resource_type: "auto",
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        pdfKey: uploadResult.public_id,
        pdfUrl: uploadResult.url,
        pdfGeneratedAt: new Date(),
      },
    });

    return {
      pdfKey: uploadResult.public_id,
      pdfUrl: uploadResult.url,
    };
  } catch (err) {
    logger.warn({ err, invoiceId }, "Direct PDF generation failed");
    return null;
  }
}

/**
 * Checks if the PDF is already rendered and uploaded to R2.
 * If ready, generates a fresh presigned URL for secure download (expires in 1h).
 * If not ready, generates synchronously on-demand or triggers background worker.
 */
export async function getInvoicePdfDownloadService(
  invoiceId: string,
  businessId: string,
): Promise<InvoicePdfStatusResult> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    select: {
      id: true,
      businessId: true,
      invoiceNumber: true,
      pdfKey: true,
      pdfUrl: true,
      pdfGeneratedAt: true,
      updatedAt: true,
    },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }

  const filename = `${invoice.invoiceNumber}.pdf`;

  let pdfKey = invoice.pdfKey;
  let pdfUrl = invoice.pdfUrl;

  const isStale =
    !pdfKey ||
    !invoice.pdfGeneratedAt ||
    (invoice.updatedAt &&
      invoice.pdfGeneratedAt &&
      invoice.updatedAt.getTime() > invoice.pdfGeneratedAt.getTime());

  if (isStale) {
    const generated = await generateAndUploadInvoicePdf(invoice.id);
    if (generated) {
      pdfKey = generated.pdfKey;
      pdfUrl = generated.pdfUrl;
    }
  }

  // If already generated and stored in R2, return the saved pdfUrl directly
  if (pdfUrl) {
    return {
      ready: true,
      status: "ready",
      downloadUrl: pdfUrl,
      pdfUrl,
      filename,
      invoiceNumber: invoice.invoiceNumber,
    };
  }

  // Not ready yet: enqueue background job if not already processing
  try {
    const boss = getBoss();
    if (boss) {
      await boss.send(JOB_NAMES.GENERATE_INVOICE_PDF, {
        invoiceId: invoice.id,
        businessId: invoice.businessId,
      });
    }
  } catch (_err) {
    // Non-blocking
  }

  return {
    ready: false,
    status: "pending",
    filename,
    invoiceNumber: invoice.invoiceNumber,
  };
}

/**
 * Triggers re-generation of the invoice PDF in the background.
 */
export async function triggerInvoicePdfRegenerationService(
  invoiceId: string,
  businessId: string,
): Promise<{ success: boolean; message: string; invoiceNumber: string }> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    select: { id: true, invoiceNumber: true },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }

  // Clear existing PDF metadata so clients know it's regenerating
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      pdfKey: null,
      pdfUrl: null,
      pdfGeneratedAt: null,
    },
  });

  // Enqueue fresh background job
  const boss = getBoss();
  if (boss) {
    await boss.send(JOB_NAMES.GENERATE_INVOICE_PDF, {
      invoiceId: invoice.id,
      businessId,
    });
  }

  return {
    success: true,
    message: "Invoice PDF generation initiated in background",
    invoiceNumber: invoice.invoiceNumber,
  };
}
