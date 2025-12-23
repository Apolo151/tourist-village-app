import { apiClient } from './api';
import type { ApiResponse } from './api';

export interface UtilityReading {
  id: number;
  booking_id?: number;
  apartment_id: number;
  water_start_reading?: number;
  water_end_reading?: number;
  electricity_start_reading?: number;
  electricity_end_reading?: number;
  start_date: string;
  end_date: string;
  who_pays: 'owner' | 'renter' | 'company';
  created_by: number;
  created_at: string;
  updated_at: string;
  water_cost?: number;
  electricity_cost?: number;
  
  // Joined fields
  apartment?: {
    id: number;
    name: string;
    village_id: number;
    phase: number;
    owner_id: number;
    paying_status: string;
    village?: {
      id: number;
      name: string;
      electricity_price: number;
      water_price: number;
      phases: number;
    };
    owner?: {
      id: number;
      name: string;
      email: string;
      phone_number?: string;
      role: string;
      is_active: boolean;
    };
  };
  booking?: {
    id: number;
    apartment_id: number;
    user_id: number;
    user_type: string;
    number_of_people: number;
    arrival_date: string;
    leaving_date: string;
    status: string;
    notes?: string;
    created_by: number;
    created_at: string;
    updated_at: string;
    user?: {
      id: number;
      name: string;
      email: string;
      phone_number?: string;
      role: string;
      is_active: boolean;
    };
  };
  created_by_user?: {
    id: number;
    name: string;
    email: string;
    phone_number?: string;
    role: string;
    is_active: boolean;
  };
}

export interface CreateUtilityReadingRequest {
  booking_id?: number;
  apartment_id: number;
  water_start_reading?: number;
  water_end_reading?: number;
  electricity_start_reading?: number;
  electricity_end_reading?: number;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  who_pays: 'owner' | 'renter' | 'company';
}

export interface UpdateUtilityReadingRequest {
  booking_id?: number;
  apartment_id?: number;
  water_start_reading?: number;
  water_end_reading?: number;
  electricity_start_reading?: number;
  electricity_end_reading?: number;
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  who_pays?: 'owner' | 'renter' | 'company';
}

export interface UtilityReadingFilters {
  village_id?: number;
  phase?: number;
  apartment_id?: number;
  booking_id?: number;
  who_pays?: 'owner' | 'renter' | 'company';
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  has_water_readings?: boolean;
  has_electricity_readings?: boolean;
  created_by?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
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

class UtilityReadingService {
  async getUtilityReadings(filters?: UtilityReadingFilters): Promise<PaginatedResponse<UtilityReading>> {
    const response = await apiClient.get<ApiResponse<UtilityReading[]>>('/utility-readings', filters);
    
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
    
    throw new Error(response.message || 'Failed to fetch utility readings');
  }

  async exportUtilityReadings(filters?: UtilityReadingFilters): Promise<Blob> {
    return apiClient.download('/utility-readings/export', filters);
  }

  async exportUtilityReadingsData(filters?: UtilityReadingFilters): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>('/utility-readings/export', {
      ...(filters || {}),
      format: 'json'
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to export utility readings');
  }

  async getUtilityReadingById(id: number): Promise<UtilityReading> {
    const response = await apiClient.get<ApiResponse<UtilityReading>>(`/utility-readings/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch utility reading');
  }

  async createUtilityReading(readingData: CreateUtilityReadingRequest): Promise<UtilityReading> {
    const response = await apiClient.post<ApiResponse<UtilityReading>>('/utility-readings', readingData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to create utility reading');
  }

  async updateUtilityReading(id: number, readingData: UpdateUtilityReadingRequest): Promise<UtilityReading> {
    const response = await apiClient.put<ApiResponse<UtilityReading>>(`/utility-readings/${id}`, readingData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update utility reading');
  }

  async deleteUtilityReading(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/utility-readings/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete utility reading');
    }
  }

  // Helper methods
  getWhoPaysBadgeColor(whoPays: 'owner' | 'renter' | 'company'): 'primary' | 'secondary' | 'default' {
    switch (whoPays) {
      case 'owner': return 'primary';
      case 'renter': return 'secondary';
      case 'company': return 'default';
      default: return 'default';
    }
  }

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  formatDateTime(dateString: string): string {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  calculateUtilityCost(
    startReading: number,
    endReading: number,
    utilityType: 'water' | 'electricity',
    villageElectricityPrice: number,
    villageWaterPrice: number
  ): { consumption: number; cost: number } | null {
    if (endReading <= startReading) return null;
    
    const consumption = endReading - startReading;
    const unitPrice = utilityType === 'water' ? villageWaterPrice : villageElectricityPrice;
    
    return {
      consumption,
      cost: consumption * unitPrice
    };
  }

  getUtilityType(reading: UtilityReading): ('water' | 'electricity')[] {
    const types: ('water' | 'electricity')[] = [];
    
    if (reading.water_start_reading !== undefined || reading.water_end_reading !== undefined) {
      types.push('water');
    }
    
    if (reading.electricity_start_reading !== undefined || reading.electricity_end_reading !== undefined) {
      types.push('electricity');
    }
    
    return types;
  }

  isReadingComplete(reading: UtilityReading): boolean {
    const hasWaterReadings = reading.water_start_reading !== undefined && reading.water_end_reading !== undefined;
    const hasElectricityReadings = reading.electricity_start_reading !== undefined && reading.electricity_end_reading !== undefined;
    
    // Reading is complete if it has both start and end readings for at least one utility type
    return hasWaterReadings || hasElectricityReadings;
  }
}

export const utilityReadingService = new UtilityReadingService();