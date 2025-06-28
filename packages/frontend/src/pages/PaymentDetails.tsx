import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  Stack,
  Divider,
  Alert,
  Chip,
  Container,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Grid
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/paymentService';
import type { Payment, CreatePaymentRequest, UpdatePaymentRequest, PaymentMethod } from '../services/paymentService';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';
import { format, parseISO } from 'date-fns';

interface PaymentFormData {
  apartment_id: number | '';
  booking_id: number | '';
  amount: number;
  currency: 'EGP' | 'GBP';
  method_id: number | '';
  user_type: 'owner' | 'renter';
  date: string;
  description: string;
}

export default function PaymentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Determine the mode based on the current path
  const isNew = id === 'new';
  const isEditing = !isNew && searchParams.get('edit') === 'true';
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<PaymentFormData>({
    apartment_id: '',
    booking_id: '',
    amount: 0,
    currency: 'EGP',
    method_id: '',
    user_type: 'owner',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Check permissions
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canEdit = isAdmin || (payment && payment.created_by === currentUser?.id);
  const canDelete = isAdmin || (payment && payment.created_by === currentUser?.id);
  
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
        
        // Load bookings for admins or if editing/creating
        if (isAdmin || isNew || isEditing) {
          const bookingsData = await bookingService.getBookings({ limit: 100 });
          setBookings(bookingsData.bookings);
        }
        
        // Load payment data if not creating new
        if (!isNew && id) {
          const paymentData = await paymentService.getPaymentById(parseInt(id));
          setPayment(paymentData);
          setFormData({
            apartment_id: paymentData.apartment_id,
            booking_id: paymentData.booking_id || '',
            amount: paymentData.amount,
            currency: paymentData.currency,
            method_id: paymentData.method_id,
            user_type: paymentData.user_type,
            date: paymentData.date.split('T')[0], // Extract date part
            description: paymentData.description || ''
          });
        } else {
          // Handle URL parameters for pre-filled data
          const apartmentId = searchParams.get('apartmentId');
          const bookingId = searchParams.get('bookingId');
          const userType = searchParams.get('userType') as 'owner' | 'renter';
          const description = searchParams.get('description');
          
          if (apartmentId) setFormData(prev => ({ ...prev, apartment_id: parseInt(apartmentId) }));
          if (bookingId) setFormData(prev => ({ ...prev, booking_id: parseInt(bookingId) }));
          if (userType) setFormData(prev => ({ ...prev, user_type: userType }));
          if (description) setFormData(prev => ({ ...prev, description }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isNew, isEditing, searchParams, isAdmin]);
  
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
  
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['apartment_id', 'booking_id', 'method_id'].includes(name) 
        ? (value === '' ? '' : parseInt(value))
        : value
    }));
    
    // Clear booking when changing user type to owner
    if (name === 'user_type' && value === 'owner') {
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
  
  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const paymentData = {
        apartment_id: formData.apartment_id as number,
        booking_id: formData.booking_id || undefined,
        amount: formData.amount,
        currency: formData.currency,
        method_id: formData.method_id as number,
        user_type: formData.user_type,
        date: formData.date,
        description: formData.description || undefined
      };
      
      if (isNew) {
        const newPayment = await paymentService.createPayment(paymentData as CreatePaymentRequest);
        navigate(`/payments/${newPayment.id}?success=true&message=${encodeURIComponent('Payment created successfully')}`);
      } else if (id) {
        const updatedPayment = await paymentService.updatePayment(parseInt(id), paymentData as UpdatePaymentRequest);
        setPayment(updatedPayment);
        navigate(`/payments/${id}?success=true&message=${encodeURIComponent('Payment updated successfully')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id || isNew) return;
    
    try {
      await paymentService.deletePayment(parseInt(id));
      navigate('/payments?success=true&message=' + encodeURIComponent('Payment deleted successfully'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment');
    } finally {
      setDeleteDialogOpen(false);
    }
  };
  
  const handleEdit = () => {
    navigate(`/payments/${id}?edit=true`);
  };
  
  const handleCancel = () => {
    if (isNew) {
      navigate('/payments');
    } else {
      navigate(`/payments/${id}`);
    }
  };
  
  const handleBack = () => {
    navigate('/payments');
  };
  
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  };
  
  const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
  };
  
  // Filter bookings by selected apartment
  const availableBookings = (bookings || []).filter(booking => 
    !formData.apartment_id || booking.apartment_id === formData.apartment_id
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

  if (error && !isNew) {
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
      <Box sx={{ mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="text" color="primary" startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Back
            </Button>
            <Typography variant="h4" sx={{ mt: 3 }}>
              {isNew ? 'New Payment' : isEditing ? 'Edit Payment' : 'Payment Details'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isNew && !isEditing && canEdit && (
              <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
                Edit
              </Button>
            )}
            {(isNew || isEditing) && (
              <>
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
              </>
            )}
            {!isNew && !isEditing && canDelete && (
              <Tooltip title="Delete Payment">
                <IconButton color="error" onClick={() => setDeleteDialogOpen(true)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Payment Information */}
        {!isNew && !isEditing && payment && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentIcon /> Payment Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Payment ID</Typography>
                  <Typography variant="body1">{payment.id}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Amount</Typography>
                  <Chip
                    label={paymentService.formatAmount(payment.amount, payment.currency)}
                    color={paymentService.getCurrencyColor(payment.currency)}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Payment Method</Typography>
                  <Typography variant="body1">{payment.payment_method?.name || 'Unknown'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">User Type</Typography>
                  <Chip
                    label={payment.user_type === 'owner' ? 'Owner' : 'Renter'}
                    color={paymentService.getUserTypeColor(payment.user_type)}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                  <Typography variant="body1">{formatDate(payment.date)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Created By</Typography>
                  <Typography variant="body1">{payment.created_by_user?.name || 'Unknown'}</Typography>
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <Typography variant="subtitle2" color="text.secondary">Apartment</Typography>
                  <Typography variant="body1">{payment.apartment?.name || 'Unknown'}</Typography>
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <Typography variant="subtitle2" color="text.secondary">Booking</Typography>
                  <Typography variant="body1">
                    {payment.booking ? 
                      `${formatDate(payment.booking.arrival_date)} - ${formatDate(payment.booking.leaving_date)}` 
                      : 'No booking'}
                  </Typography>
                </Grid>
                {payment.description && (
                  <Grid size={{xs: 12}}>
                    <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                    <Typography variant="body1">{payment.description}</Typography>
                  </Grid>
                )}
                <Grid size={{xs: 12, sm: 6}}>
                  <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
                  <Typography variant="body1">{formatDateTime(payment.created_at)}</Typography>
                </Grid>
                <Grid size={{xs: 12, sm: 6}}>
                  <Typography variant="subtitle2" color="text.secondary">Last Updated</Typography>
                  <Typography variant="body1">{formatDateTime(payment.updated_at)}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        {(isNew || isEditing) && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Payment Details</Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid size={{xs: 12, sm: 6}}>
                  <FormControl fullWidth error={!!errors.apartment_id}>
                    <InputLabel>Apartment *</InputLabel>
                    <Select
                      name="apartment_id"
                      value={formData.apartment_id.toString()}
                      label="Apartment *"
                      onChange={handleSelectChange}
                    >
                      <MenuItem value="">
                        <em>Select Apartment</em>
                      </MenuItem>
                      {(apartments || []).map(apt => (
                        <MenuItem key={apt.id} value={apt.id.toString()}>
                          {apt.name} {apt.village && `(${apt.village.name})`}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.apartment_id && <FormHelperText>{errors.apartment_id}</FormHelperText>}
                  </FormControl>
                </Grid>
                
                <Grid size={{xs: 12, sm: 6}}>
                  <FormControl fullWidth error={!!errors.user_type}>
                    <InputLabel>User Type *</InputLabel>
                    <Select
                      name="user_type"
                      value={formData.user_type}
                      label="User Type *"
                      onChange={handleSelectChange}
                    >
                      <MenuItem value="owner">Owner</MenuItem>
                      <MenuItem value="renter">Renter</MenuItem>
                    </Select>
                    {errors.user_type && <FormHelperText>{errors.user_type}</FormHelperText>}
                  </FormControl>
                </Grid>
                
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    name="amount"
                    label="Amount *"
                    type="number"
                    value={formData.amount}
                    onChange={handleInputChange}
                    fullWidth
                    error={!!errors.amount}
                    helperText={errors.amount}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                
                <Grid size={{xs: 12, sm: 6}}>
                  <FormControl fullWidth error={!!errors.currency}>
                    <InputLabel>Currency *</InputLabel>
                    <Select
                      name="currency"
                      value={formData.currency}
                      label="Currency *"
                      onChange={handleSelectChange}
                    >
                      <MenuItem value="EGP">EGP</MenuItem>
                      <MenuItem value="GBP">GBP</MenuItem>
                    </Select>
                    {errors.currency && <FormHelperText>{errors.currency}</FormHelperText>}
                  </FormControl>
                </Grid>
                
                <Grid size={{xs: 12, sm: 6}}>
                  <FormControl fullWidth error={!!errors.method_id}>
                    <InputLabel>Payment Method *</InputLabel>
                    <Select
                      name="method_id"
                      value={formData.method_id.toString()}
                      label="Payment Method *"
                      onChange={handleSelectChange}
                    >
                      <MenuItem value="">
                        <em>Select Payment Method</em>
                      </MenuItem>
                      {(paymentMethods || []).map(method => (
                        <MenuItem key={method.id} value={method.id.toString()}>
                          {method.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.method_id && <FormHelperText>{errors.method_id}</FormHelperText>}
                  </FormControl>
                </Grid>
                
                <Grid size={{xs: 12, sm: 6}}>
                  <TextField
                    name="date"
                    label="Date *"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    fullWidth
                    error={!!errors.date}
                    helperText={errors.date}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                
                {formData.user_type === 'renter' && (
                  <Grid size={{xs: 12}}>
                    <FormControl fullWidth error={!!errors.booking_id}>
                      <InputLabel>Booking {formData.user_type === 'renter' ? '*' : ''}</InputLabel>
                      <Select
                        name="booking_id"
                        value={formData.booking_id.toString()}
                        label={`Booking ${formData.user_type === 'renter' ? '*' : ''}`}
                        onChange={handleSelectChange}
                      >
                        <MenuItem value="">
                          <em>Select Booking</em>
                        </MenuItem>
                        {availableBookings.map(booking => (
                          <MenuItem key={booking.id} value={booking.id.toString()}>
                            {booking.apartment?.name || 'Unknown'} - {formatDate(booking.arrival_date)} to {formatDate(booking.leaving_date)}
                            {booking.user && ` (${booking.user.name})`}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.booking_id && <FormHelperText>{errors.booking_id}</FormHelperText>}
                    </FormControl>
                  </Grid>
                )}
                
                <Grid size={{xs: 12}}>
                  <TextField
                    name="description"
                    label="Description"
                    value={formData.description}
                    onChange={handleInputChange}
                    fullWidth
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description}
                  />
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        )}
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Payment</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this payment? This action cannot be undone.
            </Typography>
            {payment && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Payment:</strong> {paymentService.formatAmount(payment.amount, payment.currency)}
                </Typography>
                <Typography variant="body2">
                  <strong>Date:</strong> {formatDate(payment.date)}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
} 