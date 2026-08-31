import type { LeadStatus } from "@prisma/client";

export interface LeadDto {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone?: string | null;
  service?: string | null;
  services: string[];
  eventDate?: string | null;
  budget?: string | null;
  message?: string | null;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LeadListResponseDto {
  items: LeadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
