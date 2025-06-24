import { apiClient } from './api';
import type { ApiResponse } from './api';

// Backend types (based on backend/src/types/index.ts)
export interface Village {
  id: number;
  name: string;
  electricity_price: number;
  water_price: number;
  phases: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  role: 'super_admin' | 'admin' | 'owner' | 'renter';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  apartment_id: number;
  user_id: number;
  user_type: 'owner' | 'renter';
  arrival_date: string;
  leaving_date: string;
  status: 'not_arrived' | 'in_village' | 'left';
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Apartment {
  id: number;
  name: string;
  village_id: number;
  phase: number;
  owner_id: number;
  purchase_date?: string;
  paying_status: 'transfer' | 'rent' | 'non-payer';
  created_at: string;
  updated_at: string;
  
  // Computed/joined fields
  village?: {
    id: number;
    name: string;
  };
  owner?: {
    id: number;
    name: string;
    email: string;
  };
  status?: 'Available' | 'Occupied by Owner' | 'Occupied By Renter';
  current_booking?: Booking;
}

export interface ApartmentFilters {
  village_id?: number;
  phase?: number;
  status?: string;
  paying_status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateApartmentRequest {
  name: string;
  village_id: number;
  phase: number;
  owner_id: number;
  purchase_date?: string;
  paying_status: 'transfer' | 'rent' | 'non-payer';
}

export interface UpdateApartmentRequest {
  name?: string;
  village_id?: number;
  phase?: number;
  owner_id?: number;
  purchase_date?: string;
  paying_status?: 'transfer' | 'rent' | 'non-payer';
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

class ApartmentService {
  async getApartments(filters?: ApartmentFilters): Promise<PaginatedResponse<Apartment>> {
    const response = await apiClient.get<ApiResponse<Apartment[]>>('/apartments', filters);
    
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
    
    throw new Error(response.message || 'Failed to fetch apartments');
  }

  async getApartmentById(id: number): Promise<Apartment> {
    const response = await apiClient.get<ApiResponse<Apartment>>(`/apartments/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch apartment');
  }

  async createApartment(apartmentData: CreateApartmentRequest): Promise<Apartment> {
    const response = await apiClient.post<ApiResponse<Apartment>>('/apartments', apartmentData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to create apartment');
  }

  async updateApartment(id: number, apartmentData: UpdateApartmentRequest): Promise<Apartment> {
    const response = await apiClient.put<ApiResponse<Apartment>>(`/apartments/${id}`, apartmentData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update apartment');
  }

  async deleteApartment(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/apartments/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete apartment');
    }
  }

  async getApartmentStats(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/apartments/stats');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch apartment statistics');
  }

  async getApartmentFinancialSummary(id: number): Promise<{
    apartment_id: number;
    total_money_spent: { EGP: number; GBP: number };
    total_money_requested: { EGP: number; GBP: number };
    net_money: { EGP: number; GBP: number };
  }> {
    const response = await apiClient.get<ApiResponse<{
      apartment_id: number;
      total_money_spent: { EGP: number; GBP: number };
      total_money_requested: { EGP: number; GBP: number };
      net_money: { EGP: number; GBP: number };
    }>>(`/apartments/${id}/financial-summary`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch apartment financial summary');
  }

  // Helper methods to convert between frontend and backend formats
  convertToFrontendApartment(backendApartment: Apartment): any {
    return {
      id: backendApartment.id.toString(),
      name: backendApartment.name,
      ownerId: backendApartment.owner_id.toString(),
      ownerName: backendApartment.owner?.name,
      village: backendApartment.village?.name || 'Unknown',
      phase: `Phase ${backendApartment.phase}`,
      status: backendApartment.status || 'Available',
      payingStatus: this.convertPayingStatus(backendApartment.paying_status),
      purchaseDate: backendApartment.purchase_date || '',
      description: '', // Not in backend model
      images: [], // Not in backend model
      amenities: [], // Not in backend model
      city: '', // Not in backend model
      address: '', // Not in backend model
      size: undefined, // Not in backend model
      bedrooms: undefined, // Not in backend model
      bathrooms: undefined, // Not in backend model
    };
  }

  private convertPayingStatus(status: 'transfer' | 'rent' | 'non-payer'): string {
    switch (status) {
      case 'transfer':
        return 'Payed By Transfer';
      case 'rent':
        return 'Payed By Rent';
      case 'non-payer':
        return 'Non-Payer';
      default:
        return 'Unknown';
    }
  }

  convertFromFrontendPayingStatus(status: string): 'transfer' | 'rent' | 'non-payer' {
    switch (status) {
      case 'Payed By Transfer':
        return 'transfer';
      case 'Payed By Rent':
        return 'rent';
      case 'Non-Payer':
        return 'non-payer';
      default:
        return 'non-payer';
    }
  }
}

export const apartmentService = new ApartmentService(); 