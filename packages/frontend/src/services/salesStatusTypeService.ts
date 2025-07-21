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

export interface SalesStatusType {
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

export interface CreateSalesStatusTypeRequest {
  name: string;
  display_name: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

export interface UpdateSalesStatusTypeRequest {
  name?: string;
  display_name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

export interface SalesStatusTypeFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

class SalesStatusTypeService {
  async getSalesStatusTypes(filters?: SalesStatusTypeFilters): Promise<PaginatedResponse<SalesStatusType>> {
    const response = await apiClient.get<ApiResponse<SalesStatusType[]>>('/sales-status-types', filters);
    
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
    
    throw new Error(response.message || 'Failed to fetch sales status types');
  }

  async getSalesStatusTypeById(id: number): Promise<SalesStatusType> {
    const response = await apiClient.get<ApiResponse<SalesStatusType>>(`/sales-status-types/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch sales status type');
  }

  async createSalesStatusType(data: CreateSalesStatusTypeRequest): Promise<SalesStatusType> {
    const response = await apiClient.post<ApiResponse<SalesStatusType>>('/sales-status-types', data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to create sales status type');
  }

  async updateSalesStatusType(id: number, data: UpdateSalesStatusTypeRequest): Promise<SalesStatusType> {
    const response = await apiClient.put<ApiResponse<SalesStatusType>>(`/sales-status-types/${id}`, data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update sales status type');
  }

  async deleteSalesStatusType(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/sales-status-types/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete sales status type');
    }
  }
}

export const salesStatusTypeService = new SalesStatusTypeService(); 