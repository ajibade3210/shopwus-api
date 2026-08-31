export interface BroadcastResultDto {
  broadcastId: string;
  channel: "whatsapp" | "email" | "both";
  totalRecipients: number;
  whatsAppRecipients: number;
  emailRecipients: number;
  deliveredCount: number;
  timestamp: string;
}

export interface BroadcastHistoryItemDto {
  id: string;
  businessId: string;
  title: string;
  channel: string;
  recipientCount: number;
  status: string;
  sentAt: string;
  createdAt: string;
}
