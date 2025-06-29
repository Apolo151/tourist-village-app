import { apiClient } from './api';
import type { ApiResponse } from './api';

// Backend email types
export type BackendEmailType = 'complaint' | 'inquiry' | 'other';

// UI email types as per requirements
export type UIEmailType = 'Complaint' | 'Inquiry' | 'Other';

export interface Email {
  id: number;
  apartment_id: number;
  booking_id?: number;
  date: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  type: BackendEmailType;
  status: 'pending' | 'completed';
  created_by: number;
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
      role: string;
    };
  };
  booking?: {
    id: number;
    apartment_id: number;
    user_id: number;
    user_type: string;
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

export interface CreateEmailRequest {
  apartment_id: number;
  booking_id?: number;
  date: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  type: BackendEmailType;
  status?: 'pending' | 'completed';
}

export interface UpdateEmailRequest {
  apartment_id?: number;
  booking_id?: number;
  date?: string;
  from?: string;
  to?: string;
  subject?: string;
  content?: string;
  type?: BackendEmailType;
  status?: 'pending' | 'completed';
}

export interface EmailFilters {
  apartment_id?: number;
  booking_id?: number;
  village_id?: number;
  type?: BackendEmailType;
  status?: 'pending' | 'completed';
  date_from?: string;
  date_to?: string;
  from?: string;
  to?: string;
  created_by?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedEmailResponse {
  data: Email[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface EmailStats {
  total_emails: number;
  by_type: { type: string; count: number }[];
  by_village: { village_name: string; count: number }[];
  recent_activity: { date: string; count: number }[];
  top_senders: { from: string; count: number }[];
  top_recipients: { to: string; count: number }[];
}

class EmailService {
  // Map UI types to backend types
  mapUITypeToBackend(uiType: UIEmailType): BackendEmailType {
    switch (uiType) {
      case 'Complaint': return 'complaint';
      case 'Inquiry': return 'inquiry';
      case 'Other': return 'other';
      default: return 'inquiry';
    }
  }

  // Map backend types to UI types
  mapBackendTypeToUI(backendType: BackendEmailType): UIEmailType {
    switch (backendType) {
      case 'complaint': return 'Complaint';
      case 'inquiry': return 'Inquiry';
      case 'other': return 'Other';
      default: return 'Inquiry';
    }
  }

  // Get all emails with filtering and pagination
  async getEmails(filters: EmailFilters = {}): Promise<PaginatedEmailResponse> {
    const response = await apiClient.get<ApiResponse<Email[]>>('/emails', filters);
    
    if (response.success && response.data) {
      return {
        data: response.data,
        pagination: response.pagination || {
          page: 1,
          limit: filters.limit || 10,
          total: response.data.length,
          total_pages: 1
        }
      };
    }
    
    throw new Error(response.message || 'Failed to fetch emails');
  }

  // Get email by ID
  async getEmailById(id: number): Promise<Email> {
    const response = await apiClient.get<ApiResponse<Email>>(`/emails/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch email');
  }

  // Create new email
  async createEmail(data: CreateEmailRequest): Promise<Email> {
    const response = await apiClient.post<ApiResponse<Email>>('/emails', data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to create email');
  }

  // Update email
  async updateEmail(id: number, data: UpdateEmailRequest): Promise<Email> {
    const response = await apiClient.put<ApiResponse<Email>>(`/emails/${id}`, data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to update email');
  }

  // Delete email
  async deleteEmail(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/emails/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete email');
    }
  }

  // Get email statistics (admin only)
  async getEmailStats(): Promise<EmailStats> {
    const response = await apiClient.get<ApiResponse<EmailStats>>('/emails/stats');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch email statistics');
  }

  // Helper methods
  getEmailTypeColor(type: BackendEmailType): 'error' | 'info' | 'default' {
    switch (type) {
      case 'complaint': return 'error';
      case 'inquiry': return 'info';
      case 'other': return 'default';
      default: return 'default';
    }
  }

  getEmailTypeDisplayName(type: BackendEmailType): UIEmailType {
    return this.mapBackendTypeToUI(type);
  }

  // Format email type options for forms (UI types)
  getEmailTypeOptions(): { value: UIEmailType; label: UIEmailType }[] {
    return [
      { value: 'Complaint', label: 'Complaint' },
      { value: 'Inquiry', label: 'Inquiry' },
      { value: 'Other', label: 'Other' }
    ];
  }
}

export const emailService = new EmailService();
export default emailService;
