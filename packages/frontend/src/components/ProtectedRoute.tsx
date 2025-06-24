import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
  requiredRole?: 'admin' | 'super_admin' | 'owner' | 'renter';
};

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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