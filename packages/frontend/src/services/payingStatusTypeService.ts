import { apiClient } from './api';
import type { ApiResponse } from './api';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface PayingStatusType {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface CreatePayingStatusTypeRequest {
  name: string;
  display_name: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

export interface UpdatePayingStatusTypeRequest {
  name?: string;
  display_name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

export interface PayingStatusTypeFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

class PayingStatusTypeService {
  async getPayingStatusTypes(filters?: PayingStatusTypeFilters): Promise<PaginatedResponse<PayingStatusType>> {
    const response = await apiClient.get<ApiResponse<PayingStatusType[]>>('/paying-status-types', filters);
    
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
    
    throw new Error(response.message || 'Failed to fetch paying status types');
  }

  async getPayingStatusTypeById(id: number): Promise<PayingStatusType> {
    const response = await apiClient.get<ApiResponse<PayingStatusType>>(`/paying-status-types/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch paying status type');
  }

  async createPayingStatusType(data: CreatePayingStatusTypeRequest): Promise<PayingStatusType> {
    const response = await apiClient.post<ApiResponse<PayingStatusType>>('/paying-status-types', data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to create paying status type');
  }

  async updatePayingStatusType(id: number, data: UpdatePayingStatusTypeRequest): Promise<PayingStatusType> {
    const response = await apiClient.put<ApiResponse<PayingStatusType>>(`/paying-status-types/${id}`, data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update paying status type');
  }

  async deletePayingStatusType(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/paying-status-types/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete paying status type');
    }
  }
}

export const payingStatusTypeService = new PayingStatusTypeService(); 