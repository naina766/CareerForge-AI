import { ApiResponse, ApiErrorResponse } from '@careerforge/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // If body is NOT FormData and Content-Type not set, default to application/json
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Ensures HTTP-only refresh cookies are sent/received
    });

    let data: ApiResponse<T> | ApiErrorResponse;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Server returned HTTP ${response.status} with invalid JSON response.`);
    }

    if (!response.ok || !data.success) {
      const errorMsg = (data as ApiErrorResponse).error?.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg) as Error & { code?: string; status?: number; details?: unknown };
      err.code = (data as ApiErrorResponse).error?.code;
      err.status = response.status;
      err.details = (data as ApiErrorResponse).error?.details;
      throw err;
    }

    return data as ApiResponse<T>;
  }

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  }

  upload<T>(endpoint: string, formData: FormData, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
