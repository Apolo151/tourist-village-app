import { apiClient } from './api';
import type { ApiResponse } from './api';

export interface Village {
  id: number;
  name: string;
  electricity_price: number;
  water_price: number;
  phases: number;
  created_at: string;
  updated_at: string;
}

export interface VillageFilters {
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateVillageRequest {
  name: string;
  electricity_price: number;
  water_price: number;
  phases: number;
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

class VillageService {
  async getVillages(filters?: VillageFilters): Promise<PaginatedResponse<Village>> {
    const response = await apiClient.get<ApiResponse<Village[]>>('/villages', filters);
    
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
    
    throw new Error(response.message || 'Failed to fetch villages');
  }

  async getVillageById(id: number): Promise<Village> {
    const response = await apiClient.get<ApiResponse<Village>>(`/villages/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch village');
  }

  async createVillage(villageData: CreateVillageRequest): Promise<Village> {
    const response = await apiClient.post<ApiResponse<Village>>('/villages', villageData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to create village');
  }

  async updateVillage(id: number, villageData: Partial<CreateVillageRequest>): Promise<Village> {
    const response = await apiClient.put<ApiResponse<Village>>(`/villages/${id}`, villageData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update village');
  }

  async deleteVillage(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/villages/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete village');
    }
  }

  // Helper method to get village name by ID
  async getVillageName(id: number): Promise<string> {
    try {
      const village = await this.getVillageById(id);
      return village.name;
    } catch (error) {
      return 'Unknown Village';
    }
  }

  // Helper method to get phases for a village
  async getVillagePhases(villageId: number): Promise<number[]> {
    try {
      const village = await this.getVillageById(villageId);
      return Array.from({ length: village.phases }, (_, i) => i + 1);
    } catch (error) {
      return [];
    }
  }
}

export const villageService = new VillageService();
