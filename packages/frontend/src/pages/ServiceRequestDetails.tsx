import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Container, 
  Alert,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  AssignmentLateOutlined as CreatedIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { serviceRequestService } from '../services/serviceRequestService';
import type { ServiceRequest, UpdateServiceRequestRequest, ServiceType } from '../services/serviceRequestService';
import { userService } from '../services/userService';
import type { User } from '../services/userService';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';
import { format, parseISO } from 'date-fns';

export default function ServiceRequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form data for editing
  const [formData, setFormData] = useState<UpdateServiceRequestRequest>({});

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setError('Service request ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [serviceRequestData, usersData, apartmentsData] = await Promise.all([
          serviceRequestService.getServiceRequestById(parseInt(id)),
          userService.getUsers({ limit: 100 }),
          apartmentService.getApartments({ limit: 100 })
        ]);

        // Load service types separately
        const serviceTypesData = await serviceRequestService.getServiceTypes({ limit: 100 });

        setServiceRequest(serviceRequestData);
        setUsers(usersData.data);
        setApartments(apartmentsData.data);
        setServiceTypes(serviceTypesData.data);

        // Initialize form data
        setFormData({
          type_id: serviceRequestData.type_id,
          apartment_id: serviceRequestData.apartment_id,
          booking_id: serviceRequestData.booking_id,
          requester_id: serviceRequestData.requester_id,
          date_action: serviceRequestData.date_action,
          status: serviceRequestData.status,
          who_pays: serviceRequestData.who_pays,
          notes: serviceRequestData.notes,
          assignee_id: undefined,
          cost: serviceRequestData.cost,
          currency: serviceRequestData.currency
        });

        // Load bookings for the apartment
        if (serviceRequestData.apartment_id) {
          const bookingsData = await bookingService.getBookings({
            apartment_id: serviceRequestData.apartment_id,
            limit: 50
          });
          setBookings(bookingsData.bookings || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load service request');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

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
    if (['type_id', 'apartment_id', 'booking_id', 'assignee_id', 'requester_id'].includes(fieldName)) {
      parsedValue = value ? parseInt(value) : undefined;
    }

    setFormData(prev => ({
      ...prev,
      [fieldName]: parsedValue
    }));
  };

  const handleDateChange = (date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      date_action: date ? date.toISOString() : undefined
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (serviceRequest) {
      setFormData({
        type_id: serviceRequest.type_id,
        apartment_id: serviceRequest.apartment_id,
        booking_id: serviceRequest.booking_id,
        requester_id: serviceRequest.requester_id,
        date_action: serviceRequest.date_action,
        status: serviceRequest.status,
        who_pays: serviceRequest.who_pays,
        notes: serviceRequest.notes,
        assignee_id: undefined,
        cost: serviceRequest.cost,
        currency: serviceRequest.currency
      });
    }
  };

  const handleSave = async () => {
    if (!id || !serviceRequest) return;

    try {
      setSubmitting(true);
      setError(null);

      const updatedRequest = await serviceRequestService.updateServiceRequest(
        parseInt(id),
        formData
      );
      
      setServiceRequest(updatedRequest);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    const confirmMessage = 'Are you sure you want to delete this service request? This action cannot be undone.';
    if (window.confirm(confirmMessage)) {
      try {
        setSubmitting(true);
        await serviceRequestService.deleteServiceRequest(parseInt(id));
        navigate('/services?tab=1'); // Navigate back to service requests tab
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete service request');
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    navigate('/services?tab=1');
  };

  const getStatusIcon = (status: 'Created' | 'In Progress' | 'Done'): React.ReactElement | undefined => {
    switch (status) {
      case 'Done':
        return <CheckCircleIcon color="success" />;
      case 'In Progress':
        return <ScheduleIcon color="warning" />;
      case 'Created':
        return <CreatedIcon color="info" />;
      default:
        return undefined;
    }
  };

  const getStatusColor = (status: 'Created' | 'In Progress' | 'Done') => {
    return serviceRequestService.getStatusColor(status);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
  };

  const canEdit = () => {
    if (!currentUser || !serviceRequest) return false;
    
    // Admin/super_admin can edit any request
    if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
      return true;
    }
    
    // Users can edit their own requests
    return serviceRequest.requester_id === currentUser.id;
  };

  const canDelete = () => {
    return currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  };

  // Find the related booking in the loaded bookings array (for view mode fallback)
  let relatedBooking: typeof bookings[number] | undefined = undefined;
  let bookingUserName = 'Unknown';
  if (serviceRequest) {
    relatedBooking = bookings.find(
      b => b.id === serviceRequest.booking?.id
    );
    bookingUserName =
      serviceRequest.booking?.user?.name ||
      relatedBooking?.user?.name ||
      'Unknown';
  }

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && !serviceRequest) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Services
        </Button>
      </Container>
    );
  }

  if (!serviceRequest) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>Service request not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Services
        </Button>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md">
        <Box sx={{ mb: 4, mt: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button variant="text" color="primary" startIcon={<ArrowBackIcon />} onClick={handleBack}>
                Back
              </Button>
              <Typography variant="h4">Service Request #{serviceRequest.id || "N/A"}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!isEditing && canEdit() && (
                <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
                  Edit
                </Button>
              )}
              {!isEditing && canDelete() && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  Delete
                </Button>
              )}
              {isEditing && (
                <>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              )}
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Service Request Details */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {serviceRequest.type?.name || 'Unknown Service'}
                </Typography>
                <Chip 
                  icon={getStatusIcon(serviceRequest.status)}
                  label={serviceRequest.status} 
                  color={getStatusColor(serviceRequest.status)}
                />
              </Box>
              <Divider sx={{ my: 2 }} />
            </Box>
            
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Service Type</Typography>
                {isEditing ? (
                  <FormControl size="small" fullWidth>
                    <Select
                      value={(formData.type_id != null && !isNaN(formData.type_id)) ? formData.type_id.toString() : ''}
                      onChange={(e) => handleSelectChange(e, 'type_id')}
                    >
                      <MenuItem value="">
                        <em>Select Service Type</em>
                      </MenuItem>
                      {serviceTypes.map(type => (
                        <MenuItem key={type.id} value={type.id.toString()}>
                          {type.name} - {type.cost} {type.currency}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                <Typography variant="body1">{serviceRequest.type?.name || 'Unknown'}</Typography>
                )}
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Cost</Typography>
                {isEditing ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      type="number"
                      value={formData.cost || serviceRequest.cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                      size="small"
                      inputProps={{ min: 0, step: 0.01 }}
                      sx={{ flex: 1 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={formData.currency || serviceRequest.currency}
                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as 'EGP' | 'GBP' }))}
                      >
                        <MenuItem value="EGP">EGP</MenuItem>
                        <MenuItem value="GBP">GBP</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                ) : (
                  <Typography variant="body1">
                    {serviceRequest.cost.toFixed(2)} {serviceRequest.currency}
                  </Typography>
                )}
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Apartment</Typography>
                {isEditing ? (
                  <FormControl size="small" fullWidth>
                    <Select
                      value={(formData.apartment_id != null && !isNaN(formData.apartment_id)) ? formData.apartment_id.toString() : ''}
                      onChange={(e) => handleSelectChange(e, 'apartment_id')}
                    >
                      <MenuItem value="">
                        <em>Select Apartment</em>
                      </MenuItem>
                      {apartments.map(apartment => (
                        <MenuItem key={apartment.id} value={apartment.id.toString()}>
                          {apartment.name} - {apartment.village?.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                <Typography variant="body1">{serviceRequest.apartment?.name || 'Unknown'}</Typography>
                )}
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Village</Typography>
                <Typography variant="body1">{serviceRequest.apartment?.village?.name || 'Unknown'}</Typography>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Requester</Typography>
                {isEditing ? (
                  <FormControl size="small" fullWidth>
                    <Select
                      value={(formData.requester_id != null && !isNaN(formData.requester_id)) ? formData.requester_id.toString() : ''}
                      onChange={(e) => handleSelectChange(e, 'requester_id')}
                    >
                      <MenuItem value="">
                        <em>Select Requester</em>
                      </MenuItem>
                      {users.map(user => (
                        <MenuItem key={user.id} value={user.id.toString()}>
                          {user.name} ({user.role})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                <Typography variant="body1">{serviceRequest.requester?.name || 'Unknown'}</Typography>
                )}
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Related Booking</Typography>
                {isEditing ? (
                  <FormControl size="small" fullWidth>
                    <Select
                      value={(formData.booking_id != null && !isNaN(formData.booking_id)) ? formData.booking_id.toString() : ''}
                      onChange={(e) => handleSelectChange(e, 'booking_id')}
                    >
                      <MenuItem value="">
                        <em>No Booking</em>
                      </MenuItem>
                      {bookings.map(booking => (
                        <MenuItem key={booking.id} value={booking.id.toString()}>
                          {booking.user?.name} - {formatDate(booking.arrival_date)} to {formatDate(booking.leaving_date)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Typography variant="body1">
                    {serviceRequest?.booking
                      ? `${bookingUserName} - ${formatDate(serviceRequest.booking?.arrival_date)} to ${formatDate(serviceRequest.booking?.leaving_date)}`
                      : 'No booking'}
                  </Typography>
                )}
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Who Pays</Typography>
                {isEditing ? (
                  <FormControl size="small" fullWidth>
                    <Select
                      value={formData.who_pays || ''}
                      onChange={(e) => handleSelectChange(e, 'who_pays')}
                    >
                      <MenuItem value="owner">Owner</MenuItem>
                      <MenuItem value="renter">Tenant</MenuItem>
                      <MenuItem value="company">Company</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                <Chip 
                  label={
                    serviceRequest.who_pays === 'renter'
                      ? 'Tenant'
                      : serviceRequest.who_pays.charAt(0).toUpperCase() + serviceRequest.who_pays.slice(1)
                  }
                  variant="outlined"
                  size="small"
                />
                )}
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Request Date</Typography>
                <Typography variant="body1">{formatDate(serviceRequest.date_created)}</Typography>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Action Date</Typography>
                {isEditing ? (
                  <DateTimePicker
                    label="Service Date"
                    value={formData.date_action ? new Date(formData.date_action) : null}
                    onChange={handleDateChange}
                    slotProps={{
                      textField: {
                        size: 'small'
                      }
                    }}
                  />
                ) : (
                  <Typography variant="body1">{formatDate(serviceRequest.date_action)}</Typography>
                )}
              </Grid>
              
              {/* Editable Fields */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                {isEditing ? (
                  <FormControl size="small" fullWidth>
                    <Select
                      value={formData.status || ''}
                      onChange={(e) => handleSelectChange(e, 'status')}
                    >
                      <MenuItem value="Created">Created</MenuItem>
                      <MenuItem value="In Progress">In Progress</MenuItem>
                      <MenuItem value="Done">Done</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <Chip 
                    icon={getStatusIcon(serviceRequest.status)}
                    label={serviceRequest.status} 
                    color={getStatusColor(serviceRequest.status)}
                    size="small"
                  />
                )}
              </Grid>
              
              {/* <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Assignee</Typography>
                {isEditing ? (
                  <FormControl size="small" fullWidth>
                    <Select
                      value={(formData.assignee_id != null && !isNaN(formData.assignee_id)) ? formData.assignee_id.toString() : ''}
                      onChange={(e) => handleSelectChange(e, 'assignee_id')}
                    >
                      <MenuItem value="">
                        <em>Unassigned</em>
                      </MenuItem>
                      {users.filter(user => user.role === 'admin' || user.role === 'super_admin').map(user => (
                        <MenuItem key={user.id} value={(user.id != null && !isNaN(user.id)) ? user.id.toString() : user.id}>
                          {user.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Typography variant="body1">{serviceRequest.assignee?.name || 'Unassigned'}</Typography>
                )}
              </Grid> */}
              
              {/* Notes */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                {isEditing ? (
                  <TextField
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleInputChange}
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Add notes..."
                  />
                ) : (
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {serviceRequest.notes || 'No notes'}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Additional Information */}
          {!isEditing && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Request Information</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Created By</Typography>
                    <Typography variant="body1">{serviceRequest.created_by_user?.name || 'Unknown'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Created Date</Typography>
                    <Typography variant="body1">{new Date(serviceRequest.created_at).toLocaleDateString()}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Last Updated</Typography>
                    <Typography variant="body1">{new Date(serviceRequest.updated_at).toLocaleDateString()}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Request ID</Typography>
                    <Typography variant="body1">{serviceRequest.id || "N/A"}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Container>
    </LocalizationProvider>
  );
}
