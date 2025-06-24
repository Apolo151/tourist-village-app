import { apiClient } from './api';
import type { ApiResponse } from './api';

export interface Payment {
  id: number;
  apartment_id: number;
  booking_id?: number;
  created_by: number;
  amount: number;
  currency: 'EGP' | 'GBP';
  method_id: number;
  user_type: 'owner' | 'renter';
  date: string;
  description?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  apartment?: {
    id: number;
    name: string;
    village_id: number;
    phase: number;
    owner_id: number;
    paying_status: string;
    created_by: number;
    created_at: string;
    updated_at: string;
    village?: {
      id: number;
      name: string;
      electricity_price: number;
      water_price: number;
      phases: number;
      created_at: string;
      updated_at: string;
    };
    owner?: {
      id: number;
      name: string;
      email: string;
      phone_number?: string;
      role: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
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
      created_at: string;
      updated_at: string;
    };
  };
  payment_method?: {
    id: number;
    name: string;
    created_by: number;
    created_at: string;
    updated_at: string;
    usage_count?: number;
  };
  created_by_user?: {
    id: number;
    name: string;
    email: string;
    phone_number?: string;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
}

export interface CreatePaymentRequest {
  apartment_id: number;
  booking_id?: number;
  amount: number;
  currency: 'EGP' | 'GBP';
  method_id: number;
  user_type: 'owner' | 'renter';
  date: string; // ISO date string, defaults to current date
  description?: string;
}

export interface UpdatePaymentRequest {
  apartment_id?: number;
  booking_id?: number;
  amount?: number;
  currency?: 'EGP' | 'GBP';
  method_id?: number;
  user_type?: 'owner' | 'renter';
  date?: string; // ISO date string
  description?: string;
}

export interface PaymentFilters {
  apartment_id?: number;
  booking_id?: number;
  village_id?: number;
  currency?: 'EGP' | 'GBP';
  method_id?: number;
  user_type?: 'owner' | 'renter';
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  created_by?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaymentMethod {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  usage_count?: number;
  created_by_user?: {
    id: number;
    name: string;
    email: string;
    phone_number?: string;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
}

export interface PaymentMethodFilters {
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

class PaymentService {
  async getPayments(filters?: PaymentFilters): Promise<PaginatedResponse<Payment>> {
    const response = await apiClient.get<ApiResponse<Payment[]>>('/payments', filters);
    
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
    
    throw new Error(response.message || 'Failed to fetch payments');
  }

  async getPaymentById(id: number): Promise<Payment> {
    const response = await apiClient.get<ApiResponse<Payment>>(`/payments/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch payment');
  }

  async getPaymentsByApartment(apartmentId: number): Promise<Payment[]> {
    const filters: PaymentFilters = { apartment_id: apartmentId, limit: 100 };
    const response = await this.getPayments(filters);
    return response.data;
  }

  async createPayment(paymentData: CreatePaymentRequest): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<Payment>>('/payments', paymentData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to create payment');
  }

  async updatePayment(id: number, paymentData: UpdatePaymentRequest): Promise<Payment> {
    const response = await apiClient.put<ApiResponse<Payment>>(`/payments/${id}`, paymentData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update payment');
  }

  async deletePayment(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/payments/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete payment');
    }
  }

  // Payment Methods
  async getPaymentMethods(filters?: PaymentMethodFilters): Promise<PaginatedResponse<PaymentMethod>> {
    const response = await apiClient.get<ApiResponse<PaymentMethod[]>>('/payment-methods', filters);
    
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
    
    throw new Error(response.message || 'Failed to fetch payment methods');
  }

  async getPaymentMethodById(id: number): Promise<PaymentMethod> {
    const response = await apiClient.get<ApiResponse<PaymentMethod>>(`/payment-methods/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch payment method');
  }

  // Helper methods
  getCurrencyColor(currency: 'EGP' | 'GBP'): 'primary' | 'secondary' {
    return currency === 'EGP' ? 'primary' : 'secondary';
  }

  getUserTypeColor(userType: 'owner' | 'renter'): 'primary' | 'secondary' {
    return userType === 'owner' ? 'primary' : 'secondary';
  }

  formatAmount(amount: number, currency: 'EGP' | 'GBP'): string {
    return `${amount.toLocaleString()} ${currency}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
}

export const paymentService = new PaymentService(); 