import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Container,
  FormHelperText,
  Card,
  CardContent,
  Divider,
  Stack
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/paymentService';
import type { PaymentMethod, CreatePaymentRequest, UpdatePaymentRequest } from '../services/paymentService';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';
import { format } from 'date-fns';

interface PaymentFormData {
  apartment_id: string;
  booking_id: string;
  amount: number;
  currency: 'EGP' | 'GBP';
  method_id: string;
  user_type: 'owner' | 'renter';
  date: string;
  description: string;
}

export interface CreatePaymentProps {
  apartmentId?: number;
  bookingId?: number;
  userId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  lockApartment?: boolean;
  lockUser?: boolean;
}

export default function CreatePayment({ apartmentId, bookingId, userId, onSuccess, onCancel, lockApartment, lockUser }: CreatePaymentProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Determine if this is edit mode - not edit mode if used as quick action
  const isQuickAction = !!onSuccess || !!onCancel;
  const isEdit = Boolean(id && id !== 'new' && !isQuickAction);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<PaymentFormData>({
    apartment_id: apartmentId?.toString() || '',
    booking_id: bookingId?.toString() || '',
    amount: 0,
    currency: 'EGP',
    method_id: '',
    user_type: 'owner',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  
  // Related data
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Check permissions
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load apartments and payment methods for all users
        const [apartmentsData, paymentMethodsData] = await Promise.all([
          apartmentService.getApartments({ limit: 100 }),
          paymentService.getPaymentMethods({ limit: 100 })
        ]);
        
        setApartments(apartmentsData.data);
        setPaymentMethods(paymentMethodsData.data);
        
        // Load bookings if admin or owner
        if (isAdmin || currentUser?.role === 'owner') {
          const bookingsData = await bookingService.getBookings({ limit: 100 });
          setBookings(bookingsData.bookings);
        }
        
        // Load payment data if editing (and not quick action)
        if (isEdit && id && !isQuickAction) {
          const paymentData = await paymentService.getPaymentById(parseInt(id));
          
          // Check if user can edit this payment
          if (!isAdmin && paymentData.created_by !== currentUser?.id) {
            throw new Error('You do not have permission to edit this payment');
          }
          
          setFormData({
            apartment_id: paymentData.apartment_id.toString(),
            booking_id: paymentData.booking_id?.toString() || '',
            amount: paymentData.amount,
            currency: paymentData.currency,
            method_id: paymentData.method_id.toString(),
            user_type: paymentData.user_type,
            date: paymentData.date.split('T')[0], // Extract date part
            description: paymentData.description || ''
          });
        } else {
          // Handle URL parameters for pre-filled data
          const apartmentId = searchParams.get('apartmentId');
          const urlBookingId = searchParams.get('bookingId');
          const userType = searchParams.get('userType') as 'owner' | 'renter';
          const description = searchParams.get('description');
          
          if (apartmentId) setFormData(prev => ({ ...prev, apartment_id: apartmentId }));
          if (urlBookingId) setFormData(prev => ({ ...prev, booking_id: urlBookingId }));
          if (userType) setFormData(prev => ({ ...prev, user_type: userType }));
          if (description) setFormData(prev => ({ ...prev, description }));
          
          // Also handle props for quick action mode
          if (bookingId && (!formData.booking_id || formData.booking_id === '')) {
            setFormData(prev => ({ ...prev, booking_id: bookingId.toString() }));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEdit, searchParams, isAdmin, currentUser]);
  
  // Set user type based on booking when bookingId is provided and bookings are loaded
  useEffect(() => {
    if (bookingId && bookings.length > 0 && formData.booking_id) {
      const selectedBooking = bookings.find(b => b.id === bookingId);
      if (selectedBooking) {
        setFormData(prev => ({
          ...prev,
          user_type:
            selectedBooking.user_type === 'Owner'
              ? 'owner'
              : selectedBooking.user_type === 'Tenant'
              ? 'renter'
              : (selectedBooking.user_type as 'owner' | 'renter')
        }));
      }
    }
  }, [bookingId, bookings, formData.booking_id]);
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.apartment_id) newErrors.apartment_id = 'Apartment is required';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!formData.method_id) newErrors.method_id = 'Payment method is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (formData.user_type === 'renter' && !formData.booking_id) {
      newErrors.booking_id = 'Booking is required for renter payments';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
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
  
  // Handle select changes
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear booking when changing user type to owner, but only if no bookingId was provided via props
    if (name === 'user_type' && value === 'owner' && !bookingId) {
      setFormData(prev => ({ ...prev, booking_id: '' }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const paymentData = {
        apartment_id: parseInt(formData.apartment_id),
        amount: formData.amount,
        currency: formData.currency,
        method_id: parseInt(formData.method_id),
        user_type: formData.user_type,
        date: formData.date,
        description: formData.description || undefined,
        ...(formData.user_type === 'renter' && formData.booking_id ? { booking_id: parseInt(formData.booking_id) } : {})
      };
      
      if (isEdit && id && !isQuickAction) {
        await paymentService.updatePayment(parseInt(id), paymentData as UpdatePaymentRequest);
        if (typeof onSuccess === 'function') {
          (onSuccess as () => void)();
        } else {
          navigate(`/payments?success=true&message=${encodeURIComponent('Payment updated successfully')}`);
        }
      } else {
        await paymentService.createPayment(paymentData as CreatePaymentRequest);
        // Ensure ApartmentDetails refreshes payments after creation
        if (typeof onSuccess === 'function') {
          (onSuccess as () => void)();
        } else {
          navigate(`/payments?success=true&message=${encodeURIComponent('Payment created successfully')}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/payments');
    }
  };
  
  // Handle back
  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/payments');
    }
  };
  
  // Filter bookings by selected apartment
  const availableBookings = (bookings || []).filter(booking => 
    !formData.apartment_id || booking.apartment_id === parseInt(formData.apartment_id)
  );

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && isEdit) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Payments
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4, mt: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="text" color="primary" startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Back
            </Button>
            <Typography variant="h4">
              {isEdit ? 'Edit Payment' : 'Create Payment'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="contained" 
              startIcon={<SaveIcon />} 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel}>
              Cancel
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PaymentIcon /> Payment Information
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              {/* Amount and Currency */}
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  name="amount"
                  label="Amount"
                  type="number"
                  fullWidth
                  required
                  value={formData.amount}
                  onChange={handleInputChange}
                  error={Boolean(errors.amount)}
                  helperText={errors.amount}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth required error={Boolean(errors.currency)}>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    name="currency"
                    value={formData.currency}
                    label="Currency"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="EGP">EGP</MenuItem>
                    <MenuItem value="GBP">GBP</MenuItem>
                  </Select>
                  {errors.currency && <FormHelperText>{errors.currency}</FormHelperText>}
                </FormControl>
              </Grid>

              {/* Payment Method */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required error={Boolean(errors.method_id)}>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    name="method_id"
                    value={formData.method_id}
                    label="Payment Method"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="">
                      <em>Select a payment method</em>
                    </MenuItem>
                    {paymentMethods.map(method => (
                      <MenuItem key={method.id} value={method.id}>{method.name}</MenuItem>
                    ))}
                  </Select>
                  {errors.method_id && <FormHelperText>{errors.method_id}</FormHelperText>}
                </FormControl>
              </Grid>

              {/* User Type */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required error={Boolean(errors.user_type)}>
                  <InputLabel>User Type</InputLabel>
                  <Select
                    name="user_type"
                    value={formData.user_type}
                    label="User Type"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="owner">Owner</MenuItem>
                    <MenuItem value="renter">Renter</MenuItem>
                  </Select>
                  {errors.user_type && <FormHelperText>{errors.user_type}</FormHelperText>}
                </FormControl>
              </Grid>

              {/* Apartment */}
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth required error={Boolean(errors.apartment_id)}>
                  <InputLabel>Apartment</InputLabel>
                  <Select
                    name="apartment_id"
                    value={formData.apartment_id}
                    label="Apartment"
                    onChange={handleSelectChange}
                    disabled={lockApartment && apartmentId !== undefined}
                  >
                    <MenuItem value="">
                      <em>Select an apartment</em>
                    </MenuItem>
                    {apartments.map(apartment => (
                      <MenuItem key={apartment.id} value={apartment.id}>
                        {apartment.name} - {apartment.village?.name} (Phase {apartment.phase})
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.apartment_id && <FormHelperText>{errors.apartment_id}</FormHelperText>}
                </FormControl>
              </Grid>

              {/* Booking (required for renters) */}
              <Grid size={{ xs: 12 }}>
                <FormControl 
                  fullWidth 
                  required={formData.user_type === 'renter'} 
                  error={Boolean(errors.booking_id)}
                >
                  <InputLabel>Booking {formData.user_type === 'renter' && '*'}</InputLabel>
                  <Select
                    name="booking_id"
                    value={formData.booking_id}
                    label={`Booking ${formData.user_type === 'renter' ? '*' : ''}`}
                    onChange={handleSelectChange}
                    disabled={!formData.apartment_id}
                  >
                    <MenuItem value="">
                      <em>Select a booking</em>
                    </MenuItem>
                    {availableBookings.map(booking => (
                      <MenuItem key={booking.id} value={booking.id}>
                        Booking #{booking.id} - {booking.user?.name} 
                        ({format(new Date(booking.arrival_date), 'MMM dd, yyyy')} to {format(new Date(booking.leaving_date), 'MMM dd, yyyy')})
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.booking_id && <FormHelperText>{errors.booking_id}</FormHelperText>}
                  {formData.user_type === 'renter' && (
                    <FormHelperText>Booking is required for renter payments</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Date */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="date"
                  label="Payment Date"
                  type="date"
                  fullWidth
                  required
                  value={formData.date}
                  onChange={handleInputChange}
                  error={Boolean(errors.date)}
                  helperText={errors.date}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Description */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  name="description"
                  label="Description"
                  multiline
                  rows={3}
                  fullWidth
                  value={formData.description}
                  onChange={handleInputChange}
                  error={Boolean(errors.description)}
                  helperText={errors.description || 'Optional description for the payment'}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Preview Card */}
        {(formData.amount > 0 || formData.description) && (
          <Card sx={{ mt: 3, bgcolor: 'grey.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Payment Preview</Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1}>
                {formData.amount > 0 && (
                  <Typography variant="body2">
                    <strong>Amount:</strong> {formData.amount.toLocaleString()} {formData.currency}
                  </Typography>
                )}
                {formData.method_id && (
                  <Typography variant="body2">
                    <strong>Method:</strong> {paymentMethods.find(m => m.id === parseInt(formData.method_id))?.name}
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>User Type:</strong> {formData.user_type === 'owner' ? 'Owner' : 'Renter'}
                </Typography>
                {formData.apartment_id && (
                  <Typography variant="body2">
                    <strong>Apartment:</strong> {apartments.find(a => a.id === parseInt(formData.apartment_id))?.name}
                  </Typography>
                )}
                {formData.booking_id && (
                  <Typography variant="body2">
                    <strong>Booking:</strong> #{formData.booking_id}
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>Date:</strong> {format(new Date(formData.date), 'MMM dd, yyyy')}
                </Typography>
                {formData.description && (
                  <Typography variant="body2">
                    <strong>Description:</strong> {formData.description}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
} 