import type { Job, PgBoss } from "pg-boss";
import { logger } from "../../lib/logger";
import { uploadToR2 } from "../../lib/mediaUpload";
import { generatePdf } from "../../lib/pdf";
import { prisma } from "../../lib/prisma";
import type { InvoicePdfData } from "../../types";
import {
  type GenerateInvoicePdfPayload,
  generateInvoicePdfPayloadSchema,
  JOB_NAMES,
} from "../job.types";

export async function invoicePdfWorker(
  jobs: Job<GenerateInvoicePdfPayload>[],
): Promise<void> {
  await Promise.all(
    jobs.map(async (job) => {
      const { data } = job;

      try {
        const validated = generateInvoicePdfPayloadSchema.parse(data);
        logger.info(
          { invoiceId: validated.invoiceId },
          "Generating invoice PDF in background",
        );

        const invoice = await prisma.invoice.findUnique({
          where: { id: validated.invoiceId },
          include: {
            business: true,
            items: true,
          },
        });

        if (!invoice) {
          logger.warn(
            { invoiceId: validated.invoiceId },
            "Invoice not found for PDF generation",
          );
          return;
        }

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

        // Generates the PDF buffer using Puppeteer
        const pdfBuffer = await generatePdf("invoice", pdfData);

        // Upload to Cloudflare R2
        const uploadFolder = `invoices/${invoice.businessId}`;
        const uploadResult = await uploadToR2(pdfBuffer, {
          folder: uploadFolder,
          public_id: invoice.invoiceNumber,
          mimetype: "application/pdf",
          resource_type: "auto",
        });

        // Update database with pdfKey and public pdfUrl
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            pdfKey: uploadResult.public_id,
            pdfUrl: uploadResult.url,
            pdfGeneratedAt: new Date(),
          },
        });

        logger.info(
          {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            pdfKey: uploadResult.public_id,
            pdfUrl: uploadResult.url,
          },
          "Invoice PDF generated and stored to R2 successfully",
        );
      } catch (error) {
        logger.error({ error, data }, "Failed to generate invoice PDF");
        throw error;
      }
    }),
  );
}

export async function registerInvoiceWorker(boss: PgBoss): Promise<void> {
  await boss.work<GenerateInvoicePdfPayload>(
    JOB_NAMES.GENERATE_INVOICE_PDF,
    invoicePdfWorker,
  );
}
