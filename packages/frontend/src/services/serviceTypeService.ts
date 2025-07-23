import { apiClient } from './api';
import type { ApiResponse } from './api';

export interface ServiceTypeVillagePrice {
  id: number;
  service_type_id: number;
  village_id: number;
  cost: number;
  currency: 'EGP' | 'GBP';
  created_at: string;
  updated_at: string;
  village?: {
    id: number;
    name: string;
  };
}

export interface ServiceType {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  
  // Village-specific pricing
  village_prices?: ServiceTypeVillagePrice[];
  
  // Computed fields for backward compatibility (populated based on context)
  cost?: number;
  currency?: 'EGP' | 'GBP';
  
  // Joined fields
  created_by_user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface CreateServiceTypeRequest {
  name: string;
  description?: string;
  village_prices: {
    village_id: number;
    cost: number;
    currency: 'EGP' | 'GBP';
  }[];
}

export interface UpdateServiceTypeRequest {
  name?: string;
  description?: string;
  village_prices?: {
    village_id: number;
    cost: number;
    currency: 'EGP' | 'GBP';
  }[];
}

export interface ServiceTypeFilters {
  search?: string;
  village_id?: number; // Filter by village to get appropriate pricing
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
    
    if (response.success && response.data) {
      return {
        data: response.data,
        pagination: response.pagination || {
          page: 1,
          limit: filters.limit || 12,
          total: response.data.length,
          total_pages: 1
        }
      };
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
    const response = await apiClient.post<ApiResponse<ServiceType>>('/service-types', data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
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

  // Helper methods
  getServiceTypeCostForVillage(serviceType: ServiceType, villageId: number): { cost: number; currency: 'EGP' | 'GBP' } | null {
    if (!serviceType.village_prices || serviceType.village_prices.length === 0) {
      return serviceType.cost && serviceType.currency ? { cost: serviceType.cost, currency: serviceType.currency } : null;
    }
    
    const villagePrice = serviceType.village_prices.find(vp => vp.village_id === villageId);
    return villagePrice ? { cost: villagePrice.cost, currency: villagePrice.currency } : null;
  }

  formatCurrency(amount: number, currency: 'EGP' | 'GBP'): string {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export const serviceTypeService = new ServiceTypeService();
export default serviceTypeService; 