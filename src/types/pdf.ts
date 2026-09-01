export type InvoicePdfItem = {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: string;
  amount: string;
};

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  studioName: string;
  studioEmail?: string;
  studioPhone?: string;
  studioAddress?: string;
  studioLogoUrl?: string;
  studioEmailHeaderUrl?: string;
  customerName: string;
  customerEmail: string;
  billingAddress?: string;
  items: InvoicePdfItem[];
  subtotal: string;
  discount?: string;
  taxRate?: string;
  taxAmount?: string;
  total: string;
  notes?: string;
  currency: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
};

export type PdfTemplateDataMap = {
  invoice: InvoicePdfData;
};
