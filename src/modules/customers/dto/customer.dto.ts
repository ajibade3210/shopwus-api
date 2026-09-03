import type { CustomerServiceStatus } from "@prisma/client";

export interface CustomerServiceDto {
  id: string;
  businessId: string;
  customerId: string;
  name: string;
  service?: string | null;
  amount: number;
  amountKobo?: number;
  status: CustomerServiceStatus;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerActivityDto {
  id: string;
  businessId: string;
  customerId: string;
  type: string;
  description: string;
  metadata?: unknown;
  timestamp: string;
}

export interface CustomerAttributeDto {
  key: string;
  value: string;
}

export interface CustomerDto {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  totalRevenue: number;
  totalRevenueKobo?: number;
  notes?: string | null;
  attributes?: CustomerAttributeDto[] | null;
  isActive: boolean;
  services: CustomerServiceDto[];
  activities?: CustomerActivityDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponseDto {
  items: CustomerDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
