import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import Apartments from './pages/Apartments';
import ApartmentDetails from './pages/ApartmentDetails';
import CreateApartment from './pages/CreateApartment';
import EditApartment from './pages/EditApartment';
import Services from './pages/Services';
import ServiceTypeDetails from './pages/ServiceTypeDetails';
import CreateServiceType from './pages/CreateServiceType';
import ServiceRequestDetails from './pages/ServiceRequestDetails';
import Bookings from './pages/Bookings';
import BookingDetails from './pages/BookingDetails';
import CreateBooking from './pages/CreateBooking';
import Utilities from './pages/Utilities';
import UtilityReadingDetails from './pages/UtilityReadingDetails';
import CreateUtilityReading from './pages/CreateUtilityReading';
import Payments from './pages/Payments';
import PaymentDetails from './pages/PaymentDetails';
import Emails from './pages/Emails';
import CreateEmail from './pages/CreateEmail';
import Settings from './pages/Settings';
import Invoices from './pages/Invoices';
import InvoiceDetails from './pages/InvoiceDetails';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CreateServiceRequest from './pages/CreateServiceRequest';
import CreatePayment from './pages/CreatePayment';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
                  <Route path="/apartments/:id/edit" element={<EditApartment />} />
                  <Route path="/apartments/new" element={<CreateApartment />} />
                </Route>
                
                {/* Bookings */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/bookings/create" element={<CreateBooking />} />
                  <Route path="/bookings/:id" element={<BookingDetails />} />
                  <Route path="/bookings/:id/edit" element={<CreateBooking />} />
                </Route>
                
                {/* Services */}
                <Route path="/services" element={<Services />} />
                <Route path="/services/requests/:id" element={<ServiceRequestDetails />} />
                <Route path="/services/requests/create" element={<CreateServiceRequest />} />
                {/* Admin-only service request edit route */}
                <Route element={<ProtectedRoute requiredRole="admin" />}> 
                  <Route path="/services/requests/:id/edit" element={<CreateServiceRequest />} />
                </Route>
                
                {/* Admin-only service routes */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/services/types/new" element={<CreateServiceType />} />
                  <Route path="/services/types/:id/edit" element={<CreateServiceType />} />
                </Route>
                
                {/* Service type details (must come after /services/types/new) */}
                <Route path="/services/types/:id" element={<ServiceTypeDetails />} />
                
                {/* Admin-only routes */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  {/* Utilities */}
                  <Route path="/utilities" element={<Utilities />} />
                  <Route path="/utilities/:id" element={<UtilityReadingDetails />} />
                  <Route path="/utilities/:id/edit" element={<CreateUtilityReading />} />
                  <Route path="/utilities/new" element={<CreateUtilityReading />} />
                  
                  {/* Emails */}
                  <Route path="/emails" element={<Emails />} />
                  <Route path="/emails/new" element={<CreateEmail />} />
                  <Route path="/emails/:id" element={<CreateEmail />} />
                  <Route path="/emails/:id/edit" element={<CreateEmail />} />
                  
                  {/* Settings */}
                  <Route path="/settings" element={<Settings />} />
                </Route>
                
                {/* Payments (accessible to all users) */}
                <Route path="/payments" element={<Payments />} />
                <Route path="/payments/new" element={<CreatePayment />} />
                <Route path="/payments/:id/edit" element={<CreatePayment />} />
                <Route path="/payments/:id" element={<PaymentDetails />} />
                
                {/* Invoices */}
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/:id" element={<InvoiceDetails />} />
              </Route>
            </Route>
            
            {/* Redirect any unknown routes to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
    </LocalizationProvider>
  );
}

export default App; 