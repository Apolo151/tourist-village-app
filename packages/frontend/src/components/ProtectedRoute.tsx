import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

type ProtectedRouteProps = {
  requiredRole?: 'admin' | 'super_admin' | 'owner' | 'renter';
};

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser, loading } = useAuth();

  // Show loading spinner while authentication is being checked
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role permissions
  if (requiredRole && requiredRole === 'admin') {
    // Allow both admin and super_admin for admin required routes
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      return <Navigate to="/unauthorized" replace />;
    }
  } else if (requiredRole && currentUser?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
} 