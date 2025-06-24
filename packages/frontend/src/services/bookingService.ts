import { apiClient } from './api';
import type { ApiResponse } from './api';
import type { Booking, Apartment, User } from '../types';
export type { Booking };

// Backend types (based on backend/src/types/index.ts)
export interface CreateBookingRequest {
  apartment_id: number;
  user_id: number;
  user_type?: 'owner' | 'renter';
  number_of_people?: number;
  arrival_date: string; // ISO string
  leaving_date: string; // ISO string
  status?: 'not_arrived' | 'in_village' | 'left';
  notes?: string;
}

export interface UpdateBookingRequest {
  apartment_id?: number;
  user_id?: number;
  user_type?: 'owner' | 'renter';
  number_of_people?: number;
  arrival_date?: string; // ISO string
  leaving_date?: string; // ISO string
  status?: 'not_arrived' | 'in_village' | 'left';
  notes?: string;
}

export interface BookingFilters {
  apartment_id?: number;
  user_id?: number;
  user_type?: 'owner' | 'renter';
  village_id?: number;
  status?: 'not_arrived' | 'in_village' | 'left';
  arrival_date_start?: string;
  arrival_date_end?: string;
  leaving_date_start?: string;
  leaving_date_end?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface BookingStats {
  total_bookings: number;
  current_bookings: number;
  upcoming_bookings: number;
  past_bookings: number;
  by_status: {
    not_arrived: number;
    in_village: number;
    left: number;
  };
  by_user_type: {
    owner: number;
    renter: number;
  };
}

export interface BookingRelatedData {
  booking: Booking;
  payments: any[];
  service_requests: any[];
  emails: any[];
  utility_readings: any[];
}

export interface PaginatedBookingResponse {
  bookings: Booking[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

class BookingService {
  async getBookings(filters: BookingFilters = {}): Promise<PaginatedBookingResponse> {
    const params = new URLSearchParams();
    
    // Add filters to query parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get<ApiResponse<PaginatedBookingResponse>>(
      `/bookings?${params.toString()}`
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch bookings');
  }

  async getBookingById(id: number): Promise<Booking> {
    const response = await apiClient.get<ApiResponse<Booking>>(`/bookings/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch booking');
  }

  async getBookingWithRelatedData(id: number): Promise<BookingRelatedData> {
    const response = await apiClient.get<ApiResponse<BookingRelatedData>>(`/bookings/${id}/related`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch booking with related data');
  }

  async createBooking(bookingData: CreateBookingRequest): Promise<Booking> {
    const response = await apiClient.post<ApiResponse<Booking>>('/bookings', bookingData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to create booking');
  }

  async updateBooking(id: number, updateData: UpdateBookingRequest): Promise<Booking> {
    const response = await apiClient.put<ApiResponse<Booking>>(`/bookings/${id}`, updateData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update booking');
  }

  async deleteBooking(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/bookings/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete booking');
    }
  }

  async getBookingStats(): Promise<BookingStats> {
    const response = await apiClient.get<ApiResponse<BookingStats>>('/bookings/stats');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch booking statistics');
  }

  async getBookingsByApartment(apartmentId: number, options: { page?: number; limit?: number } = {}): Promise<Booking[]> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await apiClient.get<ApiResponse<Booking[]>>(
      `/bookings/apartment/${apartmentId}?${params.toString()}`
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch apartment bookings');
  }

  async getBookingsByUser(userId: number, options: { page?: number; limit?: number } = {}): Promise<Booking[]> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await apiClient.get<ApiResponse<Booking[]>>(
      `/bookings/user/${userId}?${params.toString()}`
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch user bookings');
  }

  // Helper method to check for booking conflicts before creating/updating
  async checkBookingConflicts(
    apartmentId: number, 
    arrivalDate: string, 
    leavingDate: string, 
    excludeBookingId?: number
  ): Promise<boolean> {
    try {
      const filters: BookingFilters = {
        apartment_id: apartmentId,
        arrival_date_start: arrivalDate,
        leaving_date_end: leavingDate,
        status: 'not_arrived' // Only check active bookings
      };

      const result = await this.getBookings(filters);
      
      // Filter out the booking being edited (if any)
      const conflictingBookings = result.bookings.filter(
        booking => booking.id !== excludeBookingId
      );

      return conflictingBookings.length > 0;
    } catch (error) {
      console.error('Error checking booking conflicts:', error);
      return false; // Allow the operation to proceed if we can't check
    }
  }

  // Helper to format booking status for display
  formatBookingStatus(status: string): string {
    switch (status) {
      case 'not_arrived':
        return 'Has not Arrived';
      case 'in_village':
        return 'In Village';
      case 'left':
        return 'Left';
      default:
        return status;
    }
  }

  // Helper to format user type for display
  formatUserType(userType: string): string {
    switch (userType) {
      case 'owner':
        return 'Owner';
      case 'renter':
        return 'Renter';
      default:
        return userType;
    }
  }

  // Helper to get current and upcoming bookings
  async getCurrentAndUpcomingBookings(): Promise<PaginatedBookingResponse> {
    const today = new Date().toISOString().split('T')[0];
    
    return this.getBookings({
      leaving_date_start: today, // Only bookings that haven't ended yet
      sort_by: 'arrival_date',
      sort_order: 'asc'
    });
  }
}

export const bookingService = new BookingService(); 