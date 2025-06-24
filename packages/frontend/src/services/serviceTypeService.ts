import { apiClient } from './api';
import type { ApiResponse } from './api';

export interface ServiceType {
  id: number;
  name: string;
  cost: number;
  currency: 'EGP' | 'GBP';
  description?: string;
  default_assignee_id?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  default_assignee?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  created_by_user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface CreateServiceTypeRequest {
  name: string;
  cost: number;
  currency: 'EGP' | 'GBP';
  description?: string;
  default_assignee_id?: number;
}

export interface UpdateServiceTypeRequest {
  name?: string;
  cost?: number;
  currency?: 'EGP' | 'GBP';
  description?: string;
  default_assignee_id?: number;
}

export interface ServiceTypeFilters {
  search?: string;
  currency?: 'EGP' | 'GBP';
  min_cost?: number;
  max_cost?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedServiceTypeResponse {
  data: ServiceType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

class ServiceTypeService {
  async getServiceTypes(filters: ServiceTypeFilters = {}): Promise<PaginatedServiceTypeResponse> {
    const response = await apiClient.get<ApiResponse<ServiceType[]>>('/service-types', filters);
    
    console.log('Service Types API Response:', response);
    
    if (response.success && response.data) {
      const result = {
        data: response.data,
        pagination: response.pagination || {
          page: 1,
          limit: filters.limit || 12,
          total: response.data.length,
          total_pages: 1
        }
      };
      
      console.log('Returning service types result:', result);
      return result;
    }
    
    throw new Error(response.message || 'Failed to fetch service types');
  }

  async getServiceTypeById(id: number): Promise<ServiceType> {
    const response = await apiClient.get<ApiResponse<ServiceType>>(`/service-types/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch service type');
  }

  async createServiceType(data: CreateServiceTypeRequest): Promise<ServiceType> {
    console.log('Creating service type with data:', data);
    const response = await apiClient.post<ApiResponse<ServiceType>>('/service-types', data);
    
    console.log('Service type creation response:', response);
    
    if (response.success && response.data) {
      console.log('Successfully created service type:', response.data);
      return response.data;
    }
    
    console.error('Service type creation failed:', response);
    throw new Error(response.message || 'Failed to create service type');
  }

  async updateServiceType(id: number, data: UpdateServiceTypeRequest): Promise<ServiceType> {
    const response = await apiClient.put<ApiResponse<ServiceType>>(`/service-types/${id}`, data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update service type');
  }

  async deleteServiceType(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/service-types/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete service type');
    }
  }
}

export const serviceTypeService = new ServiceTypeService();
export default serviceTypeService; 