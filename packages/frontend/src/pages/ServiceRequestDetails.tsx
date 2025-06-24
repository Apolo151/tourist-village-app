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
import type { ServiceRequest, UpdateServiceRequestRequest } from '../services/serviceRequestService';
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
  // Remove unused state variables for apartments and bookings
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

        setServiceRequest(serviceRequestData);
        setUsers(usersData.data);
        setApartments(apartmentsData.data);

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
          assignee_id: serviceRequestData.assignee_id
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
        assignee_id: serviceRequest.assignee_id
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
        <Box sx={{ mb: 4 }}>
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
                <Tooltip title="Delete Service Request">
                  <IconButton color="error" onClick={handleDelete} disabled={submitting}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
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
              <Grid xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Service Type</Typography>
                <Typography variant="body1">{serviceRequest.type?.name || 'Unknown'}</Typography>
              </Grid>
              
              <Grid xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Cost</Typography>
                <Typography variant="body1">
                  {(serviceRequest.type?.cost != null && !isNaN(serviceRequest.type.cost)) ? serviceRequest.type.cost : 0} {serviceRequest.type?.currency || 'EGP'}
                </Typography>
              </Grid>
              
              <Grid xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Apartment</Typography>
                <Typography variant="body1">{serviceRequest.apartment?.name || 'Unknown'}</Typography>
              </Grid>
              
              <Grid xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Village</Typography>
                <Typography variant="body1">{serviceRequest.apartment?.village?.name || 'Unknown'}</Typography>
              </Grid>
              
              <Grid xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Requester</Typography>
                <Typography variant="body1">{serviceRequest.requester?.name || 'Unknown'}</Typography>
              </Grid>
              
              <Grid xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Who Pays</Typography>
                <Chip 
                  label={formData.who_pays?.charAt(0).toUpperCase() + formData.who_pays?.slice(1)}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              
              <Grid xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Request Date</Typography>
                <Typography variant="body1">{formatDate(serviceRequest.date_created)}</Typography>
              </Grid>
              
              <Grid xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Action Date</Typography>
                {isEditing ? (
                  <DateTimePicker
                    label="Service Date"
                    value={formData.date_action ? new Date(formData.date_action) : null}
                    onChange={handleDateChange}
                    renderInput={(params) => <TextField {...params} size="small" />}
                  />
                ) : (
                  <Typography variant="body1">{formatDate(serviceRequest.date_action)}</Typography>
                )}
              </Grid>
              
              {/* Editable Fields */}
              <Grid xs={12} sm={6}>
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
              
              <Grid xs={12} sm={6}>
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
              </Grid>
              
              {/* Who Pays */}
              <Grid xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Who Pays</Typography>
                {isEditing ? (
                  <FormControl size="small" fullWidth>
                    <Select
                      value={formData.who_pays || ''}
                      onChange={(e) => handleSelectChange(e, 'who_pays')}
                    >
                      <MenuItem value="owner">Owner</MenuItem>
                      <MenuItem value="renter">Renter</MenuItem>
                      <MenuItem value="company">Company</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <Chip 
                    label={serviceRequest.who_pays.charAt(0).toUpperCase() + serviceRequest.who_pays.slice(1)}
                    variant="outlined"
                    size="small"
                  />
                )}
              </Grid>
              
              {/* Related Booking */}
              {serviceRequest.booking && (
                <Grid xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Related Booking</Typography>
                  <Typography variant="body1">
                    {serviceRequest.booking.user?.name} - {formatDate(serviceRequest.booking.arrival_date)} to {formatDate(serviceRequest.booking.leaving_date)}
                  </Typography>
                </Grid>
              )}
              
              {/* Notes */}
              <Grid xs={12}>
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