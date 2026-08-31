export interface ApiResponse<T = unknown> {
  status: boolean;
  code: number;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface BuildPaginationMetaParams {
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
