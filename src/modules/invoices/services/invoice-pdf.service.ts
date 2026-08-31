import { JOB_NAMES } from "../../../jobs/job.types";
import { NotFoundError } from "../../../lib/errors";
import { getPresignedDownloadUrl } from "../../../lib/mediaUpload";
import { getBoss } from "../../../lib/pgboss";
import { prisma } from "../../../lib/prisma";

export interface InvoicePdfStatusResult {
  ready: boolean;
  status: "pending" | "ready";
  downloadUrl?: string;
  pdfUrl?: string;
  filename: string;
  invoiceNumber: string;
}

/**
 * Checks if the PDF is already rendered and uploaded to R2.
 * If ready, generates a fresh presigned URL for secure download (expires in 1h).
 * If not ready, triggers the background worker and returns pending status.
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
    },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }

  const filename = `${invoice.invoiceNumber}.pdf`;

  // If already generated and stored in R2, generate a presigned download URL
  if (invoice.pdfKey) {
    const downloadUrl = await getPresignedDownloadUrl(
      invoice.pdfKey,
      3600, // 1 hour expiration
      filename,
    );

    return {
      ready: true,
      status: "ready",
      downloadUrl,
      pdfUrl: invoice.pdfUrl || downloadUrl,
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
