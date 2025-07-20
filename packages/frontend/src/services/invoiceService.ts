import { apiClient } from './api';
import type { ApiResponse } from './api';

export interface InvoiceSummaryItem {
  apartment_id: number;
  apartment_name: string;
  village_name: string;
  owner_name: string;
  owner_id: number;
  total_money_spent: InvoiceTotals;
  total_money_requested: InvoiceTotals;
  net_money: InvoiceTotals;
}

export interface InvoiceTotals {
  EGP: number;
  GBP: number;
}

export interface RenterSummaryResponse {
  apartmentId: number;
  apartmentName: string;
  renterSummary: {
    userName: string;
    userId: number;
    bookingId: number | null;
    bookingDates: string | null;
    total_money_spent: InvoiceTotals;
    total_money_requested: InvoiceTotals;
    net_money: InvoiceTotals;
  } | null;
}

export interface InvoiceSummaryResponse {
  summary: InvoiceSummaryItem[];
  totals: {
    total_money_spent: InvoiceTotals;
    total_money_requested: InvoiceTotals;
    net_money: InvoiceTotals;
  };
}

export interface InvoiceDetailItem {
  id: number;
  type: 'Payment' | 'Service Request' | 'Utility Reading';
  description: string;
  amount: number;
  currency: 'EGP' | 'GBP';
  date: string;
  user_type: 'owner' | 'renter';
  user_name: string;
  booking_id?: number;
  booking_arrival_date?: string;
  created_by: number;
  created_at: string;
}

export interface InvoicesFilters {
  village_id?: number;
  user_type?: 'owner' | 'renter';
  year?: number;
  date_from?: string;
  date_to?: string;
}

class InvoiceService {
  /**
   * Get invoices summary with apartment-level aggregations
   */
  async getInvoicesSummary(filters?: InvoicesFilters): Promise<InvoiceSummaryResponse> {
    const params: Record<string, any> = {};
    
    if (filters?.village_id) params.village_id = filters.village_id;
    if (filters?.user_type) params.user_type = filters.user_type;
    if (filters?.year) params.year = filters.year;
    if (filters?.date_from) params.date_from = filters.date_from;
    if (filters?.date_to) params.date_to = filters.date_to;

    const response = await apiClient.get<ApiResponse<InvoiceSummaryResponse>>('/invoices/summary', params);
    return response.data!;
  }

  /**
   * Get detailed invoices for a specific apartment
   */
  async getApartmentInvoices(apartmentId: number): Promise<InvoiceDetailItem[]> {
    const response = await apiClient.get<ApiResponse<{
      apartment: {
        id: number;
        name: string;
      };
      invoices: InvoiceDetailItem[];
      totals: {
        total_money_spent: InvoiceTotals;
        total_money_requested: InvoiceTotals;
        net_money: InvoiceTotals;
      };
    }>>(`/invoices/apartment/${apartmentId}`);
    return response.data!.invoices;
  }

  /**
   * Get previous years total for display
   */
  async getPreviousYearsTotals(beforeYear: number): Promise<{
    total_money_spent: InvoiceTotals;
    total_money_requested: InvoiceTotals;
    net_money: InvoiceTotals;
  }> {
    const response = await apiClient.get<ApiResponse<{
      total_money_spent: InvoiceTotals;
      total_money_requested: InvoiceTotals;
      net_money: InvoiceTotals;
    }>>('/invoices/previous-years', { before_year: beforeYear });
    return response.data!;
  }

  /**
   * Get renter summary for a specific apartment
   */
  async getRenterSummary(apartmentId: number): Promise<RenterSummaryResponse> {
    const response = await apiClient.get<ApiResponse<RenterSummaryResponse>>(`/invoices/renter-summary/${apartmentId}`);
    return response.data!;
  }

  /**
   * Get detailed invoice information for a specific apartment
   */
  async getApartmentDetails(apartmentId: number, filters?: InvoicesFilters): Promise<{
    apartment: {
      id: number;
      name: string;
    };
    invoices: Array<{
      id: string;
      type: 'Payment' | 'Service Request' | 'Utility Reading';
      description: string;
      amount: number;
      currency: 'EGP' | 'GBP';
      date: string;
      booking_id?: number;
      booking_arrival_date?: string;
      person_name?: string;
      created_at: string;
    }>;
    totals: {
      total_money_spent: InvoiceTotals;
      total_money_requested: InvoiceTotals;
      net_money: InvoiceTotals;
    };
  }> {
    const params: Record<string, any> = {};
    
    if (filters?.year) params.year = filters.year;
    if (filters?.date_from) params.date_from = filters.date_from;
    if (filters?.date_to) params.date_to = filters.date_to;

    const response = await apiClient.get<ApiResponse<{
      apartment: {
        id: number;
        name: string;
      };
      invoices: Array<{
        id: string;
        type: 'Payment' | 'Service Request' | 'Utility Reading';
        description: string;
        amount: number;
        currency: 'EGP' | 'GBP';
        date: string;
        booking_id?: number;
        booking_arrival_date?: string;
        person_name?: string;
        created_at: string;
      }>;
      totals: {
        total_money_spent: InvoiceTotals;
        total_money_requested: InvoiceTotals;
        net_money: InvoiceTotals;
      };
    }>>(`/invoices/apartment/${apartmentId}`, params);
    return response.data!;
  }

  /**
   * Get invoices for a specific booking
   */
  async getInvoicesForBooking(bookingId: number): Promise<InvoiceDetailItem[]> {
    const response = await apiClient.get<ApiResponse<InvoiceDetailItem[]>>(`/invoices/booking/${bookingId}`);
    return response.data!;
  }
}

export const invoiceService = new InvoiceService();