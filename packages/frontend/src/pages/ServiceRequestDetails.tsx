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
  Grid
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import { mockServiceRequests, mockServiceTypes, mockApartments, mockBookings, mockUsers } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { ServiceRequest } from '../types';

export default function ServiceRequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  
  // Find service request from mock data
  const initialServiceRequest = id 
    ? mockServiceRequests.find(request => request.id === id) 
    : undefined;
  
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest | undefined>(initialServiceRequest);
  
  // Get related service type and apartment
  const serviceType = serviceRequest 
    ? mockServiceTypes.find(type => type.id === serviceRequest.serviceTypeId)
    : undefined;
    
  const apartment = serviceRequest
    ? mockApartments.find(apt => apt.id === serviceRequest.apartmentId)
    : undefined;
  
  const booking = serviceRequest?.bookingId
    ? mockBookings.find(b => b.id === serviceRequest.bookingId)
    : undefined;
  
  const assignee = serviceRequest?.assigneeId
    ? mockUsers.find(user => user.id === serviceRequest.assigneeId)
    : undefined;
  
  useEffect(() => {
    // Set error if service request not found
    if (!serviceRequest) {
      setError('Service request not found');
    }
  }, [serviceRequest]);
  
  const handleStatusChange = (e: SelectChangeEvent) => {
    if (serviceRequest) {
      setServiceRequest({
        ...serviceRequest,
        status: e.target.value as 'pending' | 'completed' | 'cancelled',
      });
    }
  };
  
  const handleAssigneeChange = (e: SelectChangeEvent) => {
    if (serviceRequest) {
      setServiceRequest({
        ...serviceRequest,
        assigneeId: e.target.value,
      });
    }
  };
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values
    setServiceRequest(initialServiceRequest);
  };
  
  const handleSave = () => {
    if (!serviceRequest) return;
    
    // In a real app, this would send data to an API
    console.log('Saving service request:', serviceRequest);
    
    // Exit edit mode
    setIsEditing(false);
    setError('');
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };
  
  if (error && !serviceRequest) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Back to Services
          </Button>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="text"
              color="primary"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
            >
              Back
            </Button>
            <Typography variant="h4">Service Request Details</Typography>
          </Box>
          
          {currentUser?.role === 'admin' && !isEditing && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Update Request
            </Button>
          )}
        </Box>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {serviceType?.name || 'Unknown Service'}
              </Typography>
              <Chip 
                label={serviceRequest?.status || 'unknown'} 
                color={getStatusColor(serviceRequest?.status || '') as "success" | "warning" | "error" | "default"}
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>
            <Divider sx={{ my: 2 }} />
          </Box>
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">Apartment</Typography>
              <Typography variant="body1">{apartment?.name || 'Unknown'}</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">Cost</Typography>
              <Typography variant="body1">
                {serviceType?.cost || 0} {serviceType?.currency || 'EGP'}
              </Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">Request Date</Typography>
              <Typography variant="body1">{serviceRequest?.requestDate || 'N/A'}</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">Service Date</Typography>
              <Typography variant="body1">{serviceRequest?.serviceDate || 'N/A'}</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">Related Booking</Typography>
              <Typography variant="body1">
                {booking 
                  ? `${apartment?.name} (${booking.arrivalDate} - ${booking.leavingDate})` 
                  : 'No related booking'
                }
              </Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">Assignee</Typography>
              <Typography variant="body1">
                {assignee?.name || 'Not assigned'}
              </Typography>
            </Grid>
            
            <Grid size={12}>
              <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
              <Typography variant="body1">{serviceRequest?.notes || 'No notes provided'}</Typography>
            </Grid>
          </Grid>
          
          {isEditing && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="status-select-label">Status</InputLabel>
                    <Select
                      labelId="status-select-label"
                      value={serviceRequest?.status || ''}
                      label="Status"
                      onChange={handleStatusChange}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="assignee-select-label">Assignee</InputLabel>
                    <Select
                      labelId="assignee-select-label"
                      value={serviceRequest?.assigneeId || ''}
                      label="Assignee"
                      onChange={handleAssigneeChange}
                    >
                      <MenuItem value="">
                        <em>Not Assigned</em>
                      </MenuItem>
                      {mockUsers.filter(user => user.role === 'admin').map(user => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                >
                  Save
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
        
        {!isEditing && currentUser?.role === 'admin' && (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {serviceRequest?.status === 'pending' && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => {
                    setServiceRequest({
                      ...serviceRequest,
                      status: 'completed'
                    });
                    handleSave();
                  }}
                >
                  Mark as Completed
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<BlockIcon />}
                  onClick={() => {
                    setServiceRequest({
                      ...serviceRequest,
                      status: 'cancelled'
                    });
                    handleSave();
                  }}
                >
                  Cancel Request
                </Button>
              </>
            )}
          </Box>
        )}
      </Box>
    </Container>
  );
} 