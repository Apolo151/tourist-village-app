const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://ee-bookings-app-37f53723d601.herokuapp.com/api";

// Generic API response interface
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Error handling class
class ApiError extends Error {
  message: string;
  status: number;
  data?: any;

  constructor(
    message: string,
    status: number,
    data?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.message = message;
    this.status = status;
    this.data = data;
  }
}

// Base API client
class ApiClient {
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  private getAuthToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private async refreshTokens(): Promise<void> {
    if (this.isRefreshing) {
      // If already refreshing, wait for it to complete
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        // Update tokens in localStorage
        localStorage.setItem('access_token', data.data.access_token);
        localStorage.setItem('refresh_token', data.data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        // Process failed queue
        this.failedQueue.forEach(({ resolve }) => resolve(data.data));
        this.failedQueue = [];
      } else {
        throw new Error(data.message || 'Token refresh failed');
      }
    } catch (error) {
      // Process failed queue with error
      this.failedQueue.forEach(({ reject }) => reject(error));
      this.failedQueue = [];

      // Clear tokens and notify handler
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAuthToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401 && token && this.getRefreshToken()) {
        try {
          await this.refreshTokens();
          // Retry the original request with new token
          const newToken = this.getAuthToken();
          const retryConfig: RequestInit = {
            ...config,
            headers: {
              ...config.headers,
              Authorization: `Bearer ${newToken}`,
            },
          };
          const retryResponse = await fetch(url, retryConfig);
          // --- Content-Type check for retry ---
          const retryContentType = retryResponse.headers.get('content-type') || '';
          if (!retryContentType.includes('application/json')) {
            throw new ApiError(
              'Server returned an unexpected response. Please try again later.',
              retryResponse.status,
              { raw: await retryResponse.text() }
            );
          }
          const retryData = await retryResponse.json();
          if (!retryResponse.ok) {
            throw new ApiError(
              retryData.message || `HTTP error! status: ${retryResponse.status}`,
              retryResponse.status,
              retryData
            );
          }
          return retryData;
        } catch (refreshError) {
          // If refresh fails, return original 401 error
          // --- Content-Type check for original response ---
          const origContentType = response.headers.get('content-type') || '';
          if (!origContentType.includes('application/json')) {
            throw new ApiError(
              'Server returned an unexpected response. Please try again later.',
              response.status,
              { raw: await response.text() }
            );
          }
          const data = await response.json();
          throw new ApiError(
            data.message || 'Authentication failed',
            401,
            data
          );
        }
      }
      // --- Content-Type check for main response ---
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new ApiError(
          'Server returned an unexpected response. Please try again later.',
          response.status,
          { raw: await response.text() }
        );
      }
      const data = await response.json();
      if (!response.ok) {
        throw new ApiError(
          data.message || `HTTP error! status: ${response.status}`,
          response.status,
          data
        );
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    
    const query = searchParams.toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    
    return this.request<T>(url);
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Create API client instance
export const apiClient = new ApiClient();
export { ApiError };
