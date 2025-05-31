import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Chip
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Home as HomeIcon, 
  NavigateNext as NavigateNextIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Payments as PaymentsIcon
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
  const { currentUser } = useAuth();
  const isEditing = window.location.pathname.includes('/edit');
  const isNew = id === 'new';
  
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    cost: 0,
    currency: 'EGP',
    description: '',
    placeOfPayment: mockPaymentMethods[0]?.name || '', // Set default payment method
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

      // Log the URL parameters
      console.log('URL Parameters:', {
        bookingId,
        apartmentId,
        userId,
        userType,
        description,
        allParams: Object.fromEntries(params.entries())
      });

      // Get the booking details if we have a booking ID
      const booking = bookingId ? mockBookings.find(b => b.id === bookingId) : null;
      const user = userId ? mockUsers.find(u => u.id === userId) : null;

      console.log('Found related data:', { booking, user });

      // Set initial form data
      const updatedFormData = {
        ...formData,
        bookingId: bookingId || undefined,
        apartmentId: apartmentId || '',
        userId: userId || '',
        userType: userType || (user?.role as 'owner' | 'renter') || 'renter',
        description: description || '',
        placeOfPayment: mockPaymentMethods[0]?.name || '', // Set default payment method
      };

      console.log('Setting form data to:', updatedFormData);
      setFormData(updatedFormData);
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
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log('Input change:', { name, value });
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cost' ? parseFloat(value) : value
    }));
  };
  
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    console.log('Select change:', { name, value });
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = () => {
    // In a real app, this would submit to an API
    const updatedPayment = {
      ...formData,
      ...(isNew ? {
        id: `payment${Date.now()}`,  // Generate a unique ID for new payments
        createdById: currentUser?.id || 'user1', // Use current user or fallback
        createdAt: new Date().toISOString(),
      } : {
        id: id, // Keep existing ID for updates
        // Would typically update a "lastModifiedBy" field in a real app
      })
    };
    
    console.log('Submitting payment:', updatedPayment);
    
    // Navigate back to payments list
    navigate('/payments');
  };
  
  const handleCancel = () => {
    navigate(id && !isNew ? `/payments/${id}` : '/payments');
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (notFound) {
    return (
      <Box>
        <Alert severity="error" sx={{ mt: 2 }}>
          Payment not found
        </Alert>
        <Button 
          variant="contained" 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/payments')}
          sx={{ mt: 2 }}
        >
          Back to Payments
        </Button>
      </Box>
    );
  }
  
  const apartment = mockApartments.find(apt => apt.id === formData.apartmentId);
  const user = mockUsers.find(u => u.id === formData.userId);
  const booking = formData.bookingId ? mockBookings.find(b => b.id === formData.bookingId) : undefined;
  const creator = originalPayment?.createdById ? mockUsers.find(u => u.id === originalPayment.createdById) : undefined;

  return (
    <Box>
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb"
        sx={{ mb: 3 }}
      >
        <Link 
          underline="hover" 
          color="inherit" 
          onClick={() => navigate('/')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </Link>
        <Link 
          underline="hover" 
          color="inherit" 
          onClick={() => navigate('/payments')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <PaymentsIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Payments
        </Link>
        <Typography color="text.primary">
          {isNew ? 'New Payment' : isEditing ? 'Edit Payment' : 'Payment Details'}
        </Typography>
      </Breadcrumbs>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {isNew ? 'New Payment' : isEditing ? 'Edit Payment' : 'Payment Details'}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/payments')}
        >
          Back to Payments
        </Button>
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
                <FormControl fullWidth disabled={!isEditing && !isNew}>
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
                </FormControl>
              </Box>
              
              <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                <FormControl fullWidth disabled={!isEditing && !isNew}>
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
                </FormControl>
              </Box>
              
              <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                <FormControl fullWidth disabled={!isEditing && !isNew}>
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
                </FormControl>
              </Box>
              
              {formData.userType === 'renter' && formData.apartmentId && (
                <Box sx={{ width: { xs: '100%', md: '48%' } }}>
                  <FormControl fullWidth disabled={!isEditing && !isNew}>
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
                />
              </Box>
              
              <Box sx={{ width: { xs: '100%', md: '31%' } }}>
                <FormControl fullWidth disabled={!isEditing && !isNew}>
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
                </FormControl>
              </Box>
              
              <Box sx={{ width: { xs: '100%', md: '31%' } }}>
                <FormControl fullWidth disabled={!isEditing && !isNew}>
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
            
            {!isEditing && !isNew && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate(`/payments/${id}/edit`)}
                >
                  Edit Payment
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
  );
} 