import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/authService';
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
  const initializationRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevent double initialization in React 18 Strict Mode
    if (initializationRef.current) {
      return;
    }
    initializationRef.current = true;

    // Check if user is already logged in on app start
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        if (!authService.isAuthenticated()) {
          setLoading(false);
          return;
        }

        const user = await authService.getCurrentUser();
        setCurrentUser(user);

      } catch (error: any) {
        console.error('Auth initialization failed:', error);
        
        // Only clear tokens if it's an authentication error (401/403)
        // Network errors or server errors should not log the user out
        if (error?.status === 401 || error?.status === 403) {
          try {
            await authService.logout();
          } catch (logoutError) {
            console.error('Error during cleanup logout:', logoutError);
          }
        } else {
          // For non-auth errors (network issues, server down, etc), 
          // try to use stored user data if available
          const storedUser = authService.getCurrentUserFromStorage();
          if (storedUser) {
            setCurrentUser(storedUser);
            return; // Don't call finally yet, we've succeeded
          }
        }
        
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Cleanup function for development hot reloads
    return () => {
      initializationRef.current = false;
    };
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
