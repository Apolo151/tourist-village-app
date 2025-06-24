import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/authService';
import { apiClient } from '../services/api';
import type { User } from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Set up token refresh handler
  useEffect(() => {
    apiClient.setTokenRefreshHandler({
      onTokenRefresh: async () => {
        // Token was refreshed, update user data
        try {
          const user = authService.getCurrentUserFromStorage();
          if (user) {
            setCurrentUser(user);
          }
        } catch (error) {
          console.error('Failed to update user after token refresh:', error);
        }
      },
      onTokenExpired: () => {
        // Token expired and refresh failed, logout user
        console.log('Authentication expired, logging out user');
        setCurrentUser(null);
      }
    });
  }, []);

  useEffect(() => {
    // Check if user is already logged in on app start
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Check if we have tokens
        if (!authService.isAuthenticated()) {
          setLoading(false);
          return;
        }

        // First, try to get user from storage (faster)
        const storedUser = authService.getCurrentUserFromStorage();
        if (storedUser) {
          setCurrentUser(storedUser);
        }

        // Then validate the token with the server
        const isValid = await apiClient.validateToken();
        if (isValid) {
          // Token is valid, get fresh user data
          try {
            const freshUser = await authService.getCurrentUser();
            setCurrentUser(freshUser);
          } catch (error) {
            // If we can't get fresh user data but token is valid, 
            // keep the stored user
            console.warn('Failed to get fresh user data:', error);
            if (!storedUser) {
              // No stored user and can't get fresh data, logout
              await authService.logout();
              setCurrentUser(null);
            }
          }
        } else {
          // Token is invalid, clear everything
          await authService.logout();
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Clear any invalid tokens
        await authService.logout();
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const authResponse = await authService.login({ email, password });
      setCurrentUser(authResponse.user);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setCurrentUser(null);
    }
  };

  const value = {
    currentUser,
    login,
    logout,
    isAuthenticated: !!currentUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
