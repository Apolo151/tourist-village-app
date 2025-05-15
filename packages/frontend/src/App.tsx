import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import Apartments from './pages/Apartments';
import ApartmentDetails from './pages/ApartmentDetails';
import Services from './pages/Services';
import ServiceTypeDetails from './pages/ServiceTypeDetails';
import ServiceRequestDetails from './pages/ServiceRequestDetails';
import Bookings from './pages/Bookings';
import Utilities from './pages/Utilities';
import UtilityReadingDetails from './pages/UtilityReadingDetails';
import Payments from './pages/Payments';
import PaymentDetails from './pages/PaymentDetails';
import Emails from './pages/Emails';
import Settings from './pages/Settings';
import Bills from './pages/Bills';
import ApartmentBills from './pages/ApartmentBills';
import UserBills from './pages/UserBills';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
                
                {/* Apartments */}
                <Route path="/apartments" element={<Apartments />} />
                <Route path="/apartments/:id" element={<ApartmentDetails />} />
                
                {/* Admin-only apartment routes */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/apartments/:id/edit" element={<ApartmentDetails isEditing />} />
                  <Route path="/apartments/new" element={<ApartmentDetails isNew />} />
                </Route>
                
                {/* Bookings */}
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/bookings/:id" element={<Bookings />} />
                <Route path="/bookings/new" element={<Bookings />} />
                
                {/* Services */}
                <Route path="/services" element={<Services />} />
                <Route path="/services/types/:id" element={<ServiceTypeDetails />} />
                <Route path="/services/requests/:id" element={<ServiceRequestDetails />} />
                
                {/* Admin-only service routes */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/services/types/new" element={<ServiceTypeDetails />} />
                </Route>
                
                {/* Admin-only routes */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  {/* Utilities */}
                  <Route path="/utilities" element={<Utilities />} />
                  <Route path="/utilities/:id" element={<UtilityReadingDetails />} />
                  <Route path="/utilities/new" element={<UtilityReadingDetails />} />
                  
                  {/* Emails */}
                  <Route path="/emails" element={<Emails />} />
                  <Route path="/emails/:id" element={<Emails />} />
                  <Route path="/emails/new" element={<Emails />} />
                  
                  {/* Settings */}
                  <Route path="/settings" element={<Settings />} />
                </Route>
                
                {/* Payments (accessible to all users) */}
                <Route path="/payments" element={<Payments />} />
                <Route path="/payments/:id" element={<PaymentDetails />} />
                <Route path="/payments/:id/edit" element={<PaymentDetails />} />
                <Route path="/payments/new" element={<PaymentDetails />} />
                
                {/* Bills */}
                <Route path="/bills" element={<Bills />} />
                <Route path="/bills/apartment/:apartmentId" element={<ApartmentBills />} />
                <Route path="/bills/user/:userId" element={<UserBills />} />
              </Route>
            </Route>
            
            {/* Redirect any unknown routes to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
