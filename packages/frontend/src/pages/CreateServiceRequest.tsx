import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormHelperText,
  Alert
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { mockServiceTypes, mockApartments, mockBookings } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { ServiceRequest } from '../types';

export default function CreateServiceRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  
  // Get pre-filled values from URL parameters
  const prefilledApartmentId = queryParams.get('apartmentId') || '';
  const prefilledServiceId = queryParams.get('serviceId') || '';
  const prefilledUserId = queryParams.get('userId') || '';
  
  const [selectedService, setSelectedService] = useState(prefilledServiceId);
  const [selectedApartment, setSelectedApartment] = useState(prefilledApartmentId);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [requestDate] = useState(new Date());
  const [serviceDate, setServiceDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Redirect if not logged in
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);
  
  const handleServiceChange = (event: SelectChangeEvent) => {
    setSelectedService(event.target.value);
  };
  
  const handleApartmentChange = (event: SelectChangeEvent) => {
    setSelectedApartment(event.target.value);
    setSelectedBooking(''); // Reset booking when apartment changes
  };
  
  const handleBookingChange = (event: SelectChangeEvent) => {
    setSelectedBooking(event.target.value);
  };
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleSubmit = () => {
    if (!selectedService || !selectedApartment || !serviceDate) {
      setError('Please fill in all required fields');
      return;
    }
    
    // In a real app, this would send data to an API
    const newServiceRequest: Partial<ServiceRequest> = {
      id: `request${Date.now()}`, // Generate a unique ID
      serviceTypeId: selectedService,
      apartmentId: selectedApartment,
      requestDate: requestDate.toISOString().split('T')[0],
      serviceDate: serviceDate.toISOString().split('T')[0],
      notes: notes,
      status: 'pending',
      userId: prefilledUserId || currentUser?.id,
      bookingId: selectedBooking || undefined
    };
    
    console.log('Creating service request:', newServiceRequest);
    
    // Navigate to the created service request details page
    navigate(`/services/requests/${newServiceRequest.id}`, { state: { success: true, message: 'Service request created successfully' } });
  };
  
  const selectedServiceType = mockServiceTypes.find(type => type.id === selectedService);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button 
                startIcon={<ArrowBackIcon />} 
                onClick={handleBack}
                sx={{ mr: 2 }}
              >
                Back
              </Button>
              <Typography variant="h5">
                Create Service Request
              </Typography>
            </Box>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Paper sx={{ p: 3 }}>
            <Box component="form" sx={{ display: 'grid', gap: 3 }}>
              <FormControl fullWidth required>
                <InputLabel id="service-select-label">Service Type</InputLabel>
                <Select
                  labelId="service-select-label"
                  value={selectedService}
                  label="Service Type"
                  onChange={handleServiceChange}
                >
                  {mockServiceTypes.map(service => (
                    <MenuItem key={service.id} value={service.id}>{service.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth required>
                <InputLabel id="apartment-select-label">Related Apartment</InputLabel>
                <Select
                  labelId="apartment-select-label"
                  value={selectedApartment}
                  label="Related Apartment"
                  onChange={handleApartmentChange}
                >
                  {mockApartments.map(apt => (
                    <MenuItem key={apt.id} value={apt.id}>{apt.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {selectedApartment && (
                <FormControl fullWidth>
                  <InputLabel id="booking-select-label">Related Booking (Optional)</InputLabel>
                  <Select
                    labelId="booking-select-label"
                    value={selectedBooking}
                    label="Related Booking (Optional)"
                    onChange={handleBookingChange}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {mockBookings
                      .filter(booking => booking.apartmentId === selectedApartment)
                      .map(booking => (
                        <MenuItem key={booking.id} value={booking.id}>
                          {booking.arrivalDate} - {booking.leavingDate} ({booking.state})
                        </MenuItem>
                      ))}
                  </Select>
                  <FormHelperText>
                    {mockBookings.filter(booking => booking.apartmentId === selectedApartment).length === 0 
                      ? 'No bookings found for this apartment' 
                      : 'Select a booking if this service is related to a specific booking'}
                  </FormHelperText>
                </FormControl>
              )}
              
              <DatePicker
                label="Request Date"
                value={requestDate}
                readOnly
                disablePast={false}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    helperText: "Date when the request is created (today)"
                  }
                }}
              />
              
              <DatePicker
                label="Wanted Service Date"
                value={serviceDate}
                onChange={(newValue) => setServiceDate(newValue)}
                disablePast
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    helperText: "When would you like the service to be performed"
                  }
                }}
              />
              
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional information that might be helpful"
              />
              
              {selectedServiceType && (
                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom>Service Details:</Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Service:</strong> {selectedServiceType.name}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Cost:</strong> {selectedServiceType.cost} {selectedServiceType.currency}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Description:</strong> {selectedServiceType.description}
                  </Typography>
                </Paper>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button onClick={handleBack}>
                  Cancel
                </Button>
                <Button 
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSubmit}
                  disabled={!selectedService || !selectedApartment || !serviceDate}
                >
                  Submit Request
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </LocalizationProvider>
  );
} 