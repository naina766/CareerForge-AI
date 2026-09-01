/**
 * Standard API Response Envelope
 */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  meta?: ApiMeta;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

export interface ApiMeta {
  requestId?: string;
  correlationId?: string;
  timestamp?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
