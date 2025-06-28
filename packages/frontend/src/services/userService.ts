import { apiClient } from './api';
import type { ApiResponse } from './api';

// Backend types (based on backend/src/types/index.ts)
export interface User {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  role: 'super_admin' | 'admin' | 'owner' | 'renter';
  last_login?: string;
  is_active: boolean;
  responsible_village?: number;
  created_at: string;
  updated_at: string;
}

export interface UserFilters {
  search?: string;
  role?: 'super_admin' | 'admin' | 'owner' | 'renter';
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  role: 'super_admin' | 'admin' | 'owner' | 'renter';
  responsible_village?: number;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone_number?: string;
  role?: 'super_admin' | 'admin' | 'owner' | 'renter';
  is_active?: boolean;
  responsible_village?: number;
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

class UserService {
  async getUsers(filters?: UserFilters): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<ApiResponse<User[]>>('/users', filters);
    
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
    
    throw new Error(response.message || 'Failed to fetch users');
  }

  async getUserById(id: number): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch user');
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>('/users', userData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    const errorMsg = response.error && response.message
      ? `${response.error}: ${response.message}`
      : response.message || response.error || 'Failed to create user';
    throw new Error(errorMsg);
  }

  async updateUser(id: number, userData: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, userData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    const errorMsg = response.error && response.message
      ? `${response.error}: ${response.message}`
      : response.message || response.error || 'Failed to update user';
    throw new Error(errorMsg);
  }

  async deleteUser(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/users/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete user');
    }
  }

  async getUserStats(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/users/stats');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to fetch user statistics');
  }
}

export const userService = new UserService();
