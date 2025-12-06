import { apiClient } from './api';
import type { ApiResponse } from './api';
import { formatCurrency as formatCurrencyUtil } from '../utils/numberUtils';

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

export interface ServiceRequest {
  id: number;
  type_id: number;
  apartment_id: number;
  booking_id?: number;
  requester_id: number;
  date_action: string;
  date_created: string;
  status: 'Created' | 'In Progress' | 'Done';
  who_pays: 'owner' | 'renter' | 'company';
  notes?: string;
  assignee_id?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  cost: number;
  currency: 'EGP' | 'GBP';
  
  // Joined fields
  type?: ServiceType;
  apartment?: {
    id: number;
    name: string;
    village?: {
      id: number;
      name: string;
    };
  };
  booking?: {
    id: number;
    arrival_date: string;
    leaving_date: string;
    user?: {
      id: number;
      name: string;
    };
  };
  requester?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  assignee?: {
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

export interface CreateServiceRequestRequest {
  type_id: number;
  apartment_id: number;
  booking_id?: number;
  requester_id: number;
  date_action: string;
  status?: 'Created' | 'In Progress' | 'Done';
  who_pays: 'owner' | 'renter' | 'company';
  notes?: string;
  assignee_id?: number;
  // Cost fields - if not provided, will default to village-specific pricing
  cost?: number;
  currency?: 'EGP' | 'GBP';
}

export interface UpdateServiceRequestRequest {
  type_id?: number;
  apartment_id?: number;
  booking_id?: number;
  requester_id?: number;
  date_action?: string;
  status?: 'Created' | 'In Progress' | 'Done';
  who_pays?: 'owner' | 'renter' | 'company';
  notes?: string;
  assignee_id?: number;
  // Cost fields - can be updated to override default pricing
  cost?: number;
  currency?: 'EGP' | 'GBP';
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

export interface ServiceRequestFilters {
  type_id?: number;
  apartment_id?: number;
  booking_id?: number;
  requester_id?: number;
  assignee_id?: number;
  status?: 'Created' | 'In Progress' | 'Done';
  who_pays?: 'owner' | 'renter' | 'company';
  date_action_start?: string;
  date_action_end?: string;
  date_created_start?: string;
  date_created_end?: string;
  village_id?: number;
  search?: string;
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

export interface PaginatedServiceRequestResponse {
  data: ServiceRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

class ServiceRequestService {
  // Service Types
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

  // Service Requests
  async getServiceRequests(filters: ServiceRequestFilters = {}): Promise<PaginatedServiceRequestResponse> {
    const response = await apiClient.get<ApiResponse<ServiceRequest[]>>('/service-requests', filters);
    
    if (response.success && response.data) {
      return {
        data: response.data,
        pagination: response.pagination || {
          page: 1,
          limit: filters.limit || 20,
          total: response.data.length,
          total_pages: 1
        }
      };
    }
    
    throw new Error(response.message || 'Failed to fetch service requests');
  }

  async getServiceRequestById(id: number): Promise<ServiceRequest> {
    const response = await apiClient.get<ApiResponse<ServiceRequest>>(`/service-requests/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch service request');
  }

  async createServiceRequest(data: CreateServiceRequestRequest): Promise<ServiceRequest> {
    const response = await apiClient.post<ApiResponse<ServiceRequest>>('/service-requests', data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to create service request');
  }

  async updateServiceRequest(id: number, data: UpdateServiceRequestRequest): Promise<ServiceRequest> {
    const response = await apiClient.put<ApiResponse<ServiceRequest>>(`/service-requests/${id}`, data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update service request');
  }

  async deleteServiceRequest(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/service-requests/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete service request');
    }
  }

  // Helper methods
  getStatusColor(status: 'Created' | 'In Progress' | 'Done'): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (status) {
      case 'Done':
        return 'success';
      case 'In Progress':
        return 'warning';
      case 'Created':
        return 'info';
      default:
        return 'default';
    }
  }

  formatCurrency(amount: number, currency: 'EGP' | 'GBP'): string {
    return formatCurrencyUtil(amount, currency);
  }

  formatWhoPayType(whoPays: 'owner' | 'renter' | 'company'): string {
    return whoPays.charAt(0).toUpperCase() + whoPays.slice(1);
  }
}

export const serviceRequestService = new ServiceRequestService();
export default serviceRequestService; 