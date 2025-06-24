import { apiClient } from './api';
import type { ApiResponse } from './api';

export interface BillSummaryItem {
  apartment_id: number;
  apartment_name: string;
  village_name: string;
  owner_name: string;
  owner_id: number;
  total_money_spent: {
    EGP: number;
    GBP: number;
  };
  total_money_requested: {
    EGP: number;
    GBP: number;
  };
  net_money: {
    EGP: number;
    GBP: number;
  };
}

export interface BillTotals {
  total_money_spent: {
    EGP: number;
    GBP: number;
  };
  total_money_requested: {
    EGP: number;
    GBP: number;
  };
  net_money: {
    EGP: number;
    GBP: number;
  };
}

export interface BillSummaryResponse {
  summary: BillSummaryItem[];
  totals: BillTotals;
}

export interface BillDetailItem {
  id: number;
  type: 'payment' | 'service_request' | 'utility_reading';
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

export interface BillsFilters {
  village_id?: number;
  user_type?: 'owner' | 'renter';
  year?: number;
  date_from?: string;
  date_to?: string;
}

class BillService {
  /**
   * Get bills summary with apartment-level aggregations
   */
  async getBillsSummary(filters?: BillsFilters): Promise<BillSummaryResponse> {
    const params: Record<string, any> = {};
    
    if (filters?.village_id) params.village_id = filters.village_id;
    if (filters?.user_type) params.user_type = filters.user_type;
    if (filters?.year) params.year = filters.year;
    if (filters?.date_from) params.date_from = filters.date_from;
    if (filters?.date_to) params.date_to = filters.date_to;

    const response = await apiClient.get<ApiResponse<BillSummaryResponse>>('/bills/summary', params);
    return response.data!;
  }

  /**
   * Get detailed bills for a specific apartment
   */
  async getApartmentBills(apartmentId: number): Promise<BillDetailItem[]> {
    const response = await apiClient.get<ApiResponse<BillDetailItem[]>>(`/bills/apartment/${apartmentId}`);
    return response.data!;
  }

  /**
   * Get previous years total for display
   */
  async getPreviousYearsTotals(beforeYear: number): Promise<BillTotals> {
    const response = await apiClient.get<ApiResponse<BillTotals>>('/bills/previous-years', { before_year: beforeYear });
    return response.data!;
  }
}

export const billService = new BillService(); 