import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
  Stack,
  Divider,
  Alert,
  Chip,
  Container,
  FormHelperText
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Home as HomeIcon, 
  NavigateNext as NavigateNextIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Payments as PaymentsIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { mockPayments, mockApartments, mockUsers, mockBookings, mockPaymentMethods } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { Payment } from '../types';

// Interface for the form data
interface PaymentFormData {
  cost: number;
  currency: string;
  description: string;
  placeOfPayment: string;
  userType: 'owner' | 'renter';
  userId: string;
  apartmentId: string;
  bookingId?: string;
}

export default function PaymentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // Determine the mode based on the current path
  const isNew = location.pathname === '/payments/new';
  const isEditing = location.pathname.includes('/edit');
  
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<PaymentFormData>({
    cost: 0,
    currency: 'EGP',
    description: '',
    placeOfPayment: mockPaymentMethods[0]?.name || '',
    userType: 'owner',
    userId: '',
    apartmentId: '',
  });
  const [originalPayment, setOriginalPayment] = useState<Payment | null>(null);
  
  // Load payment data
  useEffect(() => {
    if (isNew) {
      // Get URL parameters
      const params = new URLSearchParams(window.location.search);
      const bookingId = params.get('bookingId');
      const apartmentId = params.get('apartmentId');
      const userId = params.get('userId');
      const userType = params.get('userType') as 'owner' | 'renter';
      const description = params.get('description');

      // Get the user if we have a user ID
      const user = userId ? mockUsers.find(u => u.id === userId) : null;

      // Set initial form data
      setFormData(prev => ({
        ...prev,
        bookingId: bookingId || undefined,
        apartmentId: apartmentId || '',
        userId: userId || '',
        userType: userType || (user?.role as 'owner' | 'renter') || 'renter',
        description: description || '',
        placeOfPayment: mockPaymentMethods[0]?.name || '',
      }));
      
      setLoading(false);
      return;
    }
    
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    
    // In a real app, this would be an API call
    const payment = mockPayments.find(p => p.id === id);
    
    if (!payment) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    
    setOriginalPayment(payment);
    setFormData({
      cost: payment.cost,
      currency: payment.currency as string,
      description: payment.description,
      placeOfPayment: payment.placeOfPayment,
      userType: payment.userType,
      userId: payment.userId,
      apartmentId: payment.apartmentId,
      bookingId: payment.bookingId,
    });
    
    setLoading(false);
  }, [id, isNew]);
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.apartmentId) newErrors.apartmentId = 'Apartment is required';
    if (!formData.userId) newErrors.userId = 'User is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.cost) newErrors.cost = 'Amount is required';
    if (!formData.placeOfPayment) newErrors.placeOfPayment = 'Payment type is required';
    if (formData.userType === 'renter' && !formData.bookingId) {
      newErrors.bookingId = 'Booking is required for renters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cost' ? parseFloat(value) : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const updatedPayment = {
      ...formData,
      ...(isNew ? {
        id: `payment${Date.now()}`,
        createdById: currentUser?.id || 'user1',
        createdAt: new Date().toISOString(),
      } : {
        id: id,
      })
    };
    
    // In a real app, you would make an API call here
    if (isNew) {
      // Add to mock data
      mockPayments.push(updatedPayment as Payment);
    } else {
      // Update in mock data
      const index = mockPayments.findIndex(p => p.id === id);
      if (index !== -1) {
        mockPayments[index] = updatedPayment as Payment;
      }
    }
    
    // Navigate back to payments list
    navigate('/payments');
  };
  
  const handleCancel = () => {
    navigate(id && !isNew ? `/payments/${id}` : '/payments');
  };
  
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (notFound) {
    return (
      <Container maxWidth="lg">
        <Box>
          <Alert severity="error" sx={{ mt: 2 }}>
            Payment not found
          </Alert>
          <Button 
            component={RouterLink}
            to="/payments"
            variant="contained" 
            startIcon={<ArrowBackIcon />}
            sx={{ mt: 2 }}
          >
            Back to Payments
          </Button>
        </Box>
      </Container>
    );
  }
  
  const apartment = mockApartments.find(apt => apt.id === formData.apartmentId);
  const user = mockUsers.find(u => u.id === formData.userId);
  const booking = formData.bookingId ? mockBookings.find(b => b.id === formData.bookingId) : undefined;
  const creator = originalPayment?.createdById ? mockUsers.find(u => u.id === originalPayment.createdById) : undefined;

  return (
    <Container maxWidth="lg">
      <Box>
        <Breadcrumbs 
          separator={<NavigateNextIcon fontSize="small" />} 
          aria-label="breadcrumb"
          sx={{ mb: 3 }}
        >
          <Link 
            component={RouterLink}
            to="/"
            underline="hover" 
            color="inherit" 
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Dashboard
          </Link>
          <Link 
            component={RouterLink}
            to="/payments"
            underline="hover" 
            color="inherit" 
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <PaymentsIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Payments
          </Link>
          <Typography color="text.primary">
            {isNew ? 'New Payment' : isEditing ? 'Edit Payment' : 'Payment Details'}
          </Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              component={RouterLink}
              to="/payments"
              variant="text"
              color="primary"
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
            <Typography variant="h4">
              {isNew ? 'New Payment' : isEditing ? `Edit Payment` : 'Payment Details'}
            </Typography>
          </Box>
          
          {!isNew && !isEditing && (
            <Button
              component={RouterLink}
              to={`/payments/${id}/edit`}
              variant="contained"
              startIcon={<EditIcon />}
            >
              Edit
            </Button>
          )}
        </Box>
        
        {!isNew && !isEditing && originalPayment && (
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                  <Typography variant="subtitle2" color="text.secondary">Payment ID</Typography>
                  <Typography variant="body1">{originalPayment.id}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                  <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                  <Typography variant="body1">{new Date(originalPayment.createdAt).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                  <Typography variant="subtitle2" color="text.secondary">Created By</Typography>
                  <Typography variant="body1">{creator?.name || 'Unknown'}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip label="Completed" color="success" size="small" />
                </Box>
                <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                  <Typography variant="subtitle2" color="text.secondary">Amount</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', color: originalPayment.cost < 0 ? 'error.main' : 'success.main' }}>
                    {originalPayment.cost.toLocaleString()} {originalPayment.currency}
                  </Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                  <Typography variant="subtitle2" color="text.secondary">Payment Method</Typography>
                  <Typography variant="body1">{originalPayment.placeOfPayment}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box component="form">
            <Stack spacing={3}>
              <Typography variant="h6">{isEditing || isNew ? 'Payment Information' : 'Details'}</Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                  <FormControl fullWidth disabled={!isEditing && !isNew} error={!!errors.apartmentId}>
                    <InputLabel>Apartment *</InputLabel>
                    <Select
                      name="apartmentId"
                      value={formData.apartmentId}
                      label="Apartment *"
                      onChange={handleSelectChange}
                      required
                    >
                      {mockApartments.map(apt => (
                        <MenuItem key={apt.id} value={apt.id}>{apt.name} ({apt.village})</MenuItem>
                      ))}
                    </Select>
                    {errors.apartmentId && <FormHelperText>{errors.apartmentId}</FormHelperText>}
                  </FormControl>
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                  <FormControl fullWidth disabled={!isEditing && !isNew} error={!!errors.userType}>
                    <InputLabel>User Type *</InputLabel>
                    <Select
                      name="userType"
                      value={formData.userType}
                      label="User Type *"
                      onChange={handleSelectChange}
                      required
                    >
                      <MenuItem value="owner">Owner</MenuItem>
                      <MenuItem value="renter">Renter</MenuItem>
                    </Select>
                    {errors.userType && <FormHelperText>{errors.userType}</FormHelperText>}
                  </FormControl>
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                  <FormControl fullWidth disabled={!isEditing && !isNew} error={!!errors.userId}>
                    <InputLabel>User *</InputLabel>
                    <Select
                      name="userId"
                      value={formData.userId}
                      label="User *"
                      onChange={handleSelectChange}
                      required
                    >
                      {mockUsers
                        .filter(user => 
                          (formData.userType === 'owner' && user.role === 'owner') ||
                          (formData.userType === 'renter' && user.role === 'renter')
                        )
                        .map(user => (
                          <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                        ))
                      }
                    </Select>
                    {errors.userId && <FormHelperText>{errors.userId}</FormHelperText>}
                  </FormControl>
                </Box>
                
                {formData.userType === 'renter' && formData.apartmentId && (
                  <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                    <FormControl fullWidth disabled={!isEditing && !isNew} error={!!errors.bookingId}>
                      <InputLabel>Related Booking {formData.userType === 'renter' ? '*' : ''}</InputLabel>
                      <Select
                        name="bookingId"
                        value={formData.bookingId || ''}
                        label={`Related Booking ${formData.userType === 'renter' ? '*' : ''}`}
                        onChange={handleSelectChange}
                        required={formData.userType === 'renter'}
                      >
                        {mockBookings
                          .filter(booking => 
                            booking.apartmentId === formData.apartmentId && 
                            booking.userId === formData.userId
                          )
                          .map(booking => (
                            <MenuItem key={booking.id} value={booking.id}>
                              {new Date(booking.arrivalDate).toLocaleDateString()} - {new Date(booking.leavingDate).toLocaleDateString()}
                            </MenuItem>
                          ))
                        }
                      </Select>
                      {errors.bookingId && <FormHelperText>{errors.bookingId}</FormHelperText>}
                    </FormControl>
                  </Box>
                )}
              </Box>
              
              <Divider />
              
              <Typography variant="h6">Payment Details</Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ width: '100%' }}>
                  <TextField
                    name="description"
                    label="Description *"
                    fullWidth
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    disabled={!isEditing && !isNew}
                    error={!!errors.description}
                    helperText={errors.description}
                  />
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '31%' } }}>
                  <TextField
                    name="cost"
                    label="Amount *"
                    type="number"
                    fullWidth
                    value={formData.cost || ''}
                    onChange={handleInputChange}
                    inputProps={{ min: 0, step: 0.01 }}
                    required
                    disabled={!isEditing && !isNew}
                    error={!!errors.cost}
                    helperText={errors.cost}
                  />
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '31%' } }}>
                  <FormControl fullWidth disabled={!isEditing && !isNew} error={!!errors.currency}>
                    <InputLabel>Currency *</InputLabel>
                    <Select
                      name="currency"
                      value={formData.currency}
                      label="Currency *"
                      onChange={handleSelectChange}
                      required
                    >
                      <MenuItem value="EGP">EGP</MenuItem>
                      <MenuItem value="GBP">GBP</MenuItem>
                    </Select>
                    {errors.currency && <FormHelperText>{errors.currency}</FormHelperText>}
                  </FormControl>
                </Box>
                
                <Box sx={{ width: { xs: '100%', md: '31%' } }}>
                  <FormControl fullWidth disabled={!isEditing && !isNew} error={!!errors.placeOfPayment}>
                    <InputLabel>Payment Type *</InputLabel>
                    <Select
                      name="placeOfPayment"
                      value={formData.placeOfPayment}
                      label="Payment Type *"
                      onChange={handleSelectChange}
                      required
                    >
                      {mockPaymentMethods.map(method => (
                        <MenuItem key={method.id} value={method.name}>{method.name}</MenuItem>
                      ))}
                    </Select>
                    {errors.placeOfPayment && <FormHelperText>{errors.placeOfPayment}</FormHelperText>}
                  </FormControl>
                </Box>
              </Box>
              
              {(isEditing || isNew) && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                  <Button variant="outlined" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button 
                    variant="contained" 
                    startIcon={<SaveIcon />}
                    onClick={handleSubmit}
                    disabled={
                      !formData.apartmentId || 
                      !formData.userId || 
                      !formData.description || 
                      !formData.cost || 
                      !formData.placeOfPayment ||
                      (formData.userType === 'renter' && !formData.bookingId)
                    }
                  >
                    {isNew ? 'Create Payment' : 'Save Changes'}
                  </Button>
                </Box>
              )}
            </Stack>
          </Box>
        </Paper>
        
        {!isNew && !isEditing && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>Related Information</Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {apartment && (
                <Box sx={{ width: { xs: '100%', md: '31%' } }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Apartment</Typography>
                      <Typography variant="body1">{apartment.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{apartment.village}</Typography>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        sx={{ mt: 2 }} 
                        onClick={() => navigate(`/apartments/${apartment.id}`)}
                      >
                        View Apartment
                      </Button>
                    </CardContent>
                  </Card>
                </Box>
              )}
              
              {user && (
                <Box sx={{ width: { xs: '100%', md: '31%' } }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>User</Typography>
                      <Typography variant="body1">{user.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        sx={{ mt: 2 }} 
                        onClick={() => navigate(`/bills/user/${user.id}`)}
                      >
                        View User Bills
                      </Button>
                    </CardContent>
                  </Card>
                </Box>
              )}
              
              {booking && (
                <Box sx={{ width: { xs: '100%', md: '31%' } }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Booking</Typography>
                      <Typography variant="body1">
                        {new Date(booking.arrivalDate).toLocaleDateString()} - {new Date(booking.leavingDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Status: {booking.state.charAt(0).toUpperCase() + booking.state.slice(1)}
                      </Typography>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        sx={{ mt: 2 }} 
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                      >
                        View Booking
                      </Button>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Container>
  );
} 