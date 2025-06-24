import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Alert,
  Container,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { serviceRequestService } from '../services/serviceRequestService';
import type { ServiceType, CreateServiceRequestRequest } from '../services/serviceRequestService';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';
import { userService } from '../services/userService';
import type { User } from '../services/userService';

export interface CreateServiceRequestProps {
  apartmentId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  lockApartment?: boolean;
}

export default function CreateServiceRequest({ apartmentId, onSuccess, onCancel, lockApartment }: CreateServiceRequestProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Data states
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Form data
  const [formData, setFormData] = useState<Omit<CreateServiceRequestRequest, 'requester_id'>>({
    type_id: 0,
    apartment_id: apartmentId || 0,
    booking_id: undefined,
    date_action: undefined,
    status: 'Created',
    who_pays: 'owner',
    notes: '',
    assignee_id: undefined
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [serviceTypesData, apartmentsData, usersData] = await Promise.all([
          serviceRequestService.getServiceTypes({ limit: 100 }),
          apartmentService.getApartments({ limit: 100 }),
          userService.getUsers({ limit: 100 })
        ]);

        setServiceTypes(serviceTypesData.data);
        setApartments(apartmentsData.data);
        setUsers(usersData.data);

        // Pre-select service type if provided in URL
        const serviceTypeId = searchParams.get('serviceTypeId');
        if (serviceTypeId) {
          const serviceType = serviceTypesData.data.find(st => st.id === parseInt(serviceTypeId));
          if (serviceType) {
            setFormData(prev => ({
              ...prev,
              type_id: serviceType.id,
              assignee_id: serviceType.default_assignee_id
            }));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [searchParams]);

  // Load bookings when apartment is selected
  useEffect(() => {
    const loadBookings = async () => {
      if (!formData.apartment_id) {
        setBookings([]);
        return;
      }

      try {
        const bookingsData = await bookingService.getBookings({
          apartment_id: formData.apartment_id,
          limit: 50
        });
        setBookings(bookingsData.bookings || []);
      } catch (err) {
        console.error('Failed to load bookings:', err);
        setBookings([]);
      }
    };

    loadBookings();
  }, [formData.apartment_id]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (event: SelectChangeEvent, fieldName: string) => {
    const value = event.target.value;
    let parsedValue: any = value;

    // Parse numeric values
    if (['type_id', 'apartment_id', 'booking_id', 'assignee_id'].includes(fieldName)) {
      parsedValue = value ? parseInt(value) : undefined;
    }

    setFormData(prev => ({
      ...prev,
      [fieldName]: parsedValue
    }));

    // When service type changes, update default assignee
    if (fieldName === 'type_id' && value) {
      const serviceType = serviceTypes.find(st => st.id === parseInt(value));
      if (serviceType?.default_assignee_id) {
        setFormData(prev => ({
          ...prev,
          assignee_id: serviceType.default_assignee_id
        }));
      }
    }

    // When apartment changes, reset booking selection
    if (fieldName === 'apartment_id') {
      setFormData(prev => ({
        ...prev,
        booking_id: undefined
      }));
    }
  };

  const handleDateChange = (date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      date_action: date ? date.toISOString() : undefined
    }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Validate required fields
      if (!formData.type_id || !formData.apartment_id) {
        setError('Please select both service type and apartment');
        return;
      }

      if (!currentUser) {
        setError('User not authenticated');
        return;
      }

      const requestData: CreateServiceRequestRequest = {
        ...formData,
        requester_id: currentUser.id,
        type_id: formData.type_id,
        apartment_id: formData.apartment_id
      };

      await serviceRequestService.createServiceRequest(requestData);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/services?tab=1'); // Navigate to service requests tab
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/services');
    }
  };

  const getSelectedServiceType = () => {
    return serviceTypes.find(st => st.id === formData.type_id);
  };

  const getSelectedApartment = () => {
    return apartments.find(apt => apt.id === formData.apartment_id);
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && serviceTypes.length === 0) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleCancel} sx={{ mt: 2 }}>
          Back to Services
        </Button>
      </Container>
    );
  }

  const selectedServiceType = getSelectedServiceType();
  const selectedApartment = getSelectedApartment();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md">
        <Box sx={{ mb: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button variant="text" color="primary" startIcon={<ArrowBackIcon />} onClick={handleCancel}>
                Back
              </Button>
              <Typography variant="h4">Request Service</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSubmit}
                disabled={submitting || !formData.type_id || !formData.apartment_id}
              >
                {submitting ? 'Creating...' : 'Create Request'}
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

          {/* Service Type Selection */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Service Details</Typography>
            
            <Grid container spacing={3}>
              <Grid size={{xs: 12}}>
                <FormControl fullWidth required>
                  <InputLabel>Service Type</InputLabel>
                  <Select
                    value={formData.type_id?.toString() || ''}
                    label="Service Type"
                    onChange={(e) => handleSelectChange(e, 'type_id')}
                  >
                    <MenuItem value="">
                      <em>Select a service type</em>
                    </MenuItem>
                    {serviceTypes.map(serviceType => (
                      <MenuItem key={serviceType.id} value={serviceType.id.toString()}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span>{serviceType.name}</span>
                          <Chip 
                            label={`${serviceType.cost} ${serviceType.currency}`} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {selectedServiceType && (
                <Grid size={{xs: 12}}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {selectedServiceType.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {selectedServiceType.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" color="primary">
                          {selectedServiceType.cost} {selectedServiceType.currency}
                        </Typography>
                        {selectedServiceType.default_assignee && (
                          <Typography variant="body2" color="text.secondary">
                            Default Assignee: {selectedServiceType.default_assignee.name}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Location and Booking */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Location & Booking</Typography>
            
            <Grid container spacing={3}>
              <Grid size={{xs: 12}}>
                <FormControl fullWidth required>
                  <InputLabel>Apartment</InputLabel>
                  <Select
                    value={formData.apartment_id?.toString() || ''}
                    label="Apartment"
                    onChange={(e) => handleSelectChange(e, 'apartment_id')}
                    disabled={lockApartment && apartmentId !== undefined}
                  >
                    <MenuItem value="">
                      <em>Select an apartment</em>
                    </MenuItem>
                    {apartments.map(apartment => (
                      <MenuItem key={apartment.id} value={apartment.id.toString()}>
                        {apartment.name} - {apartment.village?.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {formData.apartment_id && bookings.length > 0 && (
                <Grid size={{xs: 12}}>
                  <FormControl fullWidth>
                    <InputLabel>Related Booking (Optional)</InputLabel>
                    <Select
                      value={formData.booking_id?.toString() || ''}
                      label="Related Booking (Optional)"
                      onChange={(e) => handleSelectChange(e, 'booking_id')}
                    >
                      <MenuItem value="">
                        <em>No related booking</em>
                      </MenuItem>
                      {(bookings || []).map(booking => (
                        <MenuItem key={booking.id} value={booking.id.toString()}>
                          {booking.user?.name} - {new Date(booking.arrival_date).toLocaleDateString()} to {new Date(booking.leaving_date).toLocaleDateString()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {selectedApartment && (
                <Grid size={{xs: 12}}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {selectedApartment.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Village: {selectedApartment.village?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Owner: {selectedApartment.owner?.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Service Request Details */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Request Details</Typography>
            
            <Grid container spacing={3}>
              <Grid size={{xs: 12, sm: 6}}>
                <DateTimePicker
                  label="Service Date (When should the service be done?)"
                  value={formData.date_action ? new Date(formData.date_action) : null}
                  onChange={handleDateChange}
                  slotProps={{
                    textField: {
                      fullWidth: true
                    }
                  }}
                />
              </Grid>

              <Grid size={{xs: 12, sm: 6}}>
                <FormControl fullWidth required>
                  <InputLabel>Who Pays</InputLabel>
                  <Select
                    value={formData.who_pays}
                    label="Who Pays"
                    onChange={(e) => handleSelectChange(e, 'who_pays')}
                  >
                    <MenuItem value="owner">Owner</MenuItem>
                    <MenuItem value="renter">Renter</MenuItem>
                    <MenuItem value="company">Company</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{xs: 12, sm: 6}}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => handleSelectChange(e, 'status')}
                  >
                    <MenuItem value="Created">Created</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Done">Done</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{xs: 12}}>
                <FormControl fullWidth>
                  <InputLabel>Assignee (Optional)</InputLabel>
                  <Select
                    value={formData.assignee_id?.toString() || ''}
                    label="Assignee (Optional)"
                    onChange={(e) => handleSelectChange(e, 'assignee_id')}
                  >
                    <MenuItem value="">
                      <em>Use default assignee</em>
                    </MenuItem>
                    {users.filter(user => user.role === 'admin' || user.role === 'super_admin').map(user => (
                      <MenuItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{xs: 12}}>
                <TextField
                  label="Notes (Optional)"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Add any additional notes or special instructions..."
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Summary */}
          {formData.type_id && formData.apartment_id && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Request Summary</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Service</Typography>
                    <Typography variant="body1">{selectedServiceType?.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Cost</Typography>
                    <Typography variant="body1">{selectedServiceType?.cost} {selectedServiceType?.currency}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Apartment</Typography>
                    <Typography variant="body1">{selectedApartment?.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Who Pays</Typography>
                    <Typography variant="body1">{formData.who_pays.charAt(0).toUpperCase() + formData.who_pays.slice(1)}</Typography>
                  </Box>
                  {formData.date_action && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Service Date</Typography>
                      <Typography variant="body1">{new Date(formData.date_action).toLocaleString()}</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Container>
    </LocalizationProvider>
  );
} 