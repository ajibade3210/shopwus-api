export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface CustomerExport {
  name: string;
  email: string;
  phone: string;
  company: string;
  totalRevenue: number | string;
  status: string;
  createdAt: string;
}

export interface LeadExport {
  name: string;
  email: string;
  phone: string;
  service: string;
  budget: string;
  status: string;
  createdAt: string;
}

export interface InvoiceExport {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  total: number | string;
  status: string;
}

export interface ExpenseExport {
  description: string;
  category: string;
  amount: number | string;
  date: string;
  paymentMethod: string;
  vendor: string;
}

export interface BroadcastMessageExport {
  title: string;
  channel: string;
  recipientCount: number;
  status: string;
  sentAt: string;
  createdAt: string;
}

export type ExcelRowData =
  | CustomerExport
  | LeadExport
  | InvoiceExport
  | ExpenseExport
  | BroadcastMessageExport;
