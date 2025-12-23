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
}

export interface Booking {
  id: number;
  apartment_id: number;
  user_id: number;
  user_type: 'owner' | 'renter';
  arrival_date: string;
  leaving_date: string;
  status: 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled';
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
  paying_status_id: number;
  sales_status_id: number;
  created_at: string;
  updated_at: string;
  
  // Backward compatibility fields
  paying_status: 'transfer' | 'rent' | 'non-payer';
  sales_status: 'for sale' | 'not for sale';
  
  // Computed/joined fields
  village?: Village;
  owner?: User;
  created_by_user?: User;
  paying_status_type?: PayingStatusType;
  sales_status_type?: SalesStatusType;
  status?: 'Available' | 'Occupied by Owner' | 'Occupied By Renter' | 'Booked';
  current_booking?: Booking;
}

export interface ApartmentFilters {
  village_id?: number;
  phase?: number;
  status?: string;
  paying_status?: string;
  sales_status?: string;
  paying_status_id?: number;
  sales_status_id?: number;
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
  
  // New ID-based fields (preferred)
  paying_status_id?: number;
  sales_status_id?: number;
  
  // Backward compatibility - old string fields
  paying_status?: 'transfer' | 'rent' | 'non-payer';
  sales_status?: 'for sale' | 'not for sale';
}

export interface UpdateApartmentRequest {
  name?: string;
  village_id?: number;
  phase?: number;
  owner_id?: number;
  purchase_date?: string;
  
  // New ID-based fields (preferred)
  paying_status_id?: number;
  sales_status_id?: number;
  
  // Backward compatibility - old string fields
  paying_status?: 'transfer' | 'rent' | 'non-payer';
  sales_status?: 'for sale' | 'not for sale';
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
    
    throw new Error(response.message || 'Failed to fetch apartment stats');
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

  /**
   * Export apartments as CSV (all filtered results, no pagination)
   */
  async exportApartments(filters?: ApartmentFilters): Promise<Blob> {
    return apiClient.download('/apartments/export', filters);
  }

  /**
   * Export apartments as JSON array (all filtered results, no pagination)
   */
  async exportApartmentsData(filters?: ApartmentFilters): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>('/apartments/export', {
      ...(filters || {}),
      format: 'json'
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to export apartments');
  }

  /**
   * Get the display name for a paying status
   * This handles both the new status type objects and legacy string values
   */
  getPayingStatusDisplayName(apartment: Apartment): string {
    // First check if the apartment has the new paying_status_type object
    if (apartment.paying_status_type && apartment.paying_status_type.display_name) {
      return apartment.paying_status_type.display_name;
    }
    
    // Fall back to legacy string status conversion only for known legacy statuses
    const statusName = apartment.paying_status as string;
    switch (statusName) {
      case 'transfer':
        return 'Paid By Owner';
      case 'rent':
        return 'Paid By Tenant';
      case 'non-payer':
        return 'Non-Payer';
      default:
        // For any unknown status, just return it capitalized as fallback
        return statusName ? statusName.charAt(0).toUpperCase() + statusName.slice(1) : 'Unknown';
    }
  }

  /**
   * Get the display name for a sales status
   * This handles both the new status type objects and legacy string values
   */
  getSalesStatusDisplayName(apartment: Apartment): string {
    // First check if the apartment has the new sales_status_type object
    if (apartment.sales_status_type && apartment.sales_status_type.display_name) {
      return apartment.sales_status_type.display_name;
    }
    
    // Fall back to legacy string status conversion only for known legacy statuses
    const statusName = apartment.sales_status as string;
    switch (statusName) {
      case 'for sale':
        return 'For Sale';
      case 'not for sale':
        return 'Not For Sale';
      default:
        // For any unknown status, just return it capitalized as fallback
        return statusName ? statusName.charAt(0).toUpperCase() + statusName.slice(1) : 'Unknown';
    }
  }

  /**
   * Convert a frontend paying status to backend format
   * @param status The frontend paying status
   * @returns The backend paying status name
   */
  convertFromFrontendPayingStatus(status: string): 'transfer' | 'rent' | 'non-payer' {
    switch (status) {
      case 'Paid By Owner':
      case 'Paid By Transfer':
        return 'transfer';
      case 'Paid By Tenant':
      case 'Paid By Rent':
        return 'rent';
      case 'Non-Payer':
        return 'non-payer';
      default:
        return 'non-payer';
    }
  }

  /**
   * Get the color for a paying status - completely dynamic based on status type
   */
  getPayingStatusColor(apartment: Apartment): string {
    // Use the dynamic color from status type if available
    if (apartment.paying_status_type && apartment.paying_status_type.color) {
      return apartment.paying_status_type.color;
    }
    
    // Fallback to 'default' if no dynamic color is available
    return 'default';
  }

  /**
   * Get the color for a sales status - completely dynamic based on status type  
   */
  getSalesStatusColor(apartment: Apartment): string {
    // Use the dynamic color from status type if available
    if (apartment.sales_status_type && apartment.sales_status_type.color) {
      return apartment.sales_status_type.color;
    }
    
    // Fallback to 'default' if no dynamic color is available
    return 'default';
  }
}

export const apartmentService = new ApartmentService();