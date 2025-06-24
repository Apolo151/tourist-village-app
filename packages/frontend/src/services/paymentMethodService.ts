import { apiClient } from './api';
import type { ApiResponse } from './api';

// Backend types (based on backend/src/types/index.ts)
export interface PaymentMethod {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
  };
}

export interface PaymentMethodFilters {
  search?: string;
  created_by?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreatePaymentMethodRequest {
  name: string;
  description?: string;
}

export interface UpdatePaymentMethodRequest {
  name?: string;
  description?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

class PaymentMethodService {
  async getPaymentMethods(filters?: PaymentMethodFilters): Promise<PaginatedResponse<PaymentMethod>> {
    const response = await apiClient.get<ApiResponse<PaymentMethod[]>>('/payment-methods', filters);
    
    if (response.success && response.data) {
      return {
        data: response.data,
        pagination: response.pagination || {
          page: 1,
          limit: 10,
          total: response.data.length,
          total_pages: 1
        }
      };
    }
    
    throw new Error(response.message || 'Failed to fetch payment methods');
  }

  async getPaymentMethodById(id: number): Promise<PaymentMethod> {
    const response = await apiClient.get<ApiResponse<PaymentMethod>>(`/payment-methods/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch payment method');
  }

  async createPaymentMethod(methodData: CreatePaymentMethodRequest): Promise<PaymentMethod> {
    const response = await apiClient.post<ApiResponse<PaymentMethod>>('/payment-methods', methodData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to create payment method');
  }

  async updatePaymentMethod(id: number, methodData: UpdatePaymentMethodRequest): Promise<PaymentMethod> {
    const response = await apiClient.put<ApiResponse<PaymentMethod>>(`/payment-methods/${id}`, methodData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update payment method');
  }

  async deletePaymentMethod(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/payment-methods/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete payment method');
    }
  }

  async getPaymentMethodStats(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/payment-methods/stats');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch payment method statistics');
  }
}

export const paymentMethodService = new PaymentMethodService();
