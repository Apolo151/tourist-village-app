import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  AlertTitle,
  Alert,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { mockUtilities, mockApartments, mockBookings } from '../mockData';
import type { Utility, Apartment, Booking } from '../types';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface FormData {
  apartmentId: string;
  bookingId: string;
  utilityType: 'water' | 'electricity';
  startReading: number;
  endReading?: number;
  startDate: Date | null;
  endDate: Date | null;
  startNotes: string;
  endNotes: string;
}

interface FormErrors {
  apartmentId?: string;
  bookingId?: string;
  utilityType?: string;
  startReading?: string;
  endReading?: string;
  startDate?: string;
  endDate?: string;
}

const UtilityReadingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isNew = !id;
  const isAddingEndReading = !isNew && id?.includes('end');
  const actualId = isAddingEndReading ? id.replace('-end', '') : id;

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [existingUtility, setExistingUtility] = useState<Utility | null>(null);
  
  const initialFormData: FormData = {
    apartmentId: '',
    bookingId: '',
    utilityType: 'water',
    startReading: 0,
    endReading: undefined,
    startDate: null,
    endDate: null,
    startNotes: '',
    endNotes: '',
  };
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});

  // Load data
  useEffect(() => {
    setApartments(mockApartments);
    setBookings(mockBookings);
    
    if (!isNew && actualId) {
      const utility = mockUtilities.find(u => u.id === actualId);
      if (utility) {
        setExistingUtility(utility);
        setFormData({
          apartmentId: utility.apartmentId,
          bookingId: utility.bookingId,
          utilityType: utility.utilityType,
          startReading: utility.startReading,
          endReading: utility.endReading,
          startDate: utility.startDate ? parseISO(utility.startDate) : null,
          endDate: utility.endDate ? parseISO(utility.endDate) : null,
          startNotes: utility.startNotes || '',
          endNotes: utility.endNotes || '',
        });
      }
    }
    
    setLoading(false);
  }, [actualId, isNew, isAddingEndReading]);

  // Filter bookings when apartment changes
  useEffect(() => {
    if (formData.apartmentId) {
      const filtered = bookings.filter(booking => booking.apartmentId === formData.apartmentId);
      setFilteredBookings(filtered);
      
      // If current booking is not for this apartment, reset it
      if (formData.bookingId && !filtered.find(b => b.id === formData.bookingId)) {
        setFormData(prev => ({ ...prev, bookingId: '' }));
      }
    } else {
      setFilteredBookings([]);
    }
  }, [formData.apartmentId, formData.bookingId, bookings]);

  // Set default date when booking changes
  useEffect(() => {
    if (formData.bookingId && isNew) {
      const booking = bookings.find(b => b.id === formData.bookingId);
      if (booking) {
        setFormData(prev => ({ 
          ...prev, 
          startDate: parseISO(booking.arrivalDate),
          endDate: null
        }));
      }
    }
  }, [formData.bookingId, bookings, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStartDateChange = (date: Date | null) => {
    setFormData(prev => ({ ...prev, startDate: date }));
  };

  const handleEndDateChange = (date: Date | null) => {
    setFormData(prev => ({ ...prev, endDate: date }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : Number(value);
    setFormData(prev => ({ ...prev, [name]: numValue }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.apartmentId) {
      newErrors.apartmentId = 'Please select an apartment';
    }
    
    if (!formData.bookingId) {
      newErrors.bookingId = 'Please select a booking';
    }
    
    if (!formData.utilityType) {
      newErrors.utilityType = 'Please select a utility type';
    }
    
    if (formData.startReading < 0) {
      newErrors.startReading = 'Please enter a valid start reading value';
    }
    
    if (isAddingEndReading || formData.endReading !== undefined) {
      if (formData.endReading === undefined || formData.endReading <= 0) {
        newErrors.endReading = 'Please enter a valid end reading value';
      } else if (formData.endReading <= formData.startReading) {
        newErrors.endReading = 'End reading must be greater than start reading';
      }
      
      if (!formData.endDate) {
        newErrors.endDate = 'Please select an end date';
      }
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Please select a start date';
    } else {
      // Check if date is within booking dates
      const booking = bookings.find(b => b.id === formData.bookingId);
      if (booking) {
        const arrivalDate = parseISO(booking.arrivalDate);
        const leavingDate = parseISO(booking.leavingDate);
        
        if (isBefore(formData.startDate, arrivalDate) || isAfter(formData.startDate, leavingDate)) {
          newErrors.startDate = 'Start date must be within booking period';
        }
        
        if (formData.endDate) {
          if (isBefore(formData.endDate, arrivalDate) || isAfter(formData.endDate, leavingDate)) {
            newErrors.endDate = 'End date must be within booking period';
          }
          
          if (isAfter(formData.startDate, formData.endDate)) {
            newErrors.endDate = 'End date must be after start date';
          }
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Simulate saving the data
    if (isNew) {
      const newUtility: Partial<Utility> = {
        id: `utility${mockUtilities.length + 1}`,
        apartmentId: formData.apartmentId,
        bookingId: formData.bookingId,
        utilityType: formData.utilityType,
        startReading: formData.startReading,
        startDate: formData.startDate ? format(formData.startDate, 'yyyy-MM-dd') : '',
        startNotes: formData.startNotes || undefined,
        createdById: currentUser?.id || 'unknown',
        createdAt: new Date().toISOString(),
      };
      
      // Add end reading if provided
      if (formData.endReading !== undefined && formData.endDate) {
        newUtility.endReading = formData.endReading;
        newUtility.endDate = format(formData.endDate, 'yyyy-MM-dd');
        newUtility.endNotes = formData.endNotes || undefined;
      }
      
      // In a real app, this would be an API call
      console.log('Creating new utility:', newUtility);
      
      // Show success message
      setSaveSuccess(true);
      
      // Navigate to the created utility's details page after a delay
      setTimeout(() => {
        navigate(`/utilities/${newUtility.id}`);
      }, 1500);
    } else if (existingUtility) {
      const updatedUtility: Partial<Utility> = {
        ...existingUtility,
        utilityType: formData.utilityType,
        startReading: formData.startReading,
        startDate: formData.startDate ? format(formData.startDate, 'yyyy-MM-dd') : '',
        startNotes: formData.startNotes || undefined,
      };
      
      // Always include end reading data if provided, regardless of mode
      if (formData.endReading !== undefined && formData.endDate) {
        updatedUtility.endReading = formData.endReading;
        updatedUtility.endDate = format(formData.endDate, 'yyyy-MM-dd');
        updatedUtility.endNotes = formData.endNotes || undefined;
      }
      
      updatedUtility.updatedAt = new Date().toISOString();
      
      // In a real app, this would be an API call
      console.log('Updating utility:', updatedUtility);
      
      // Show success message
      setSaveSuccess(true);
      
      // Navigate away after a delay
      setTimeout(() => {
        navigate('/utilities');
      }, 1500);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  // Get the current booking for date constraints
  const currentBooking = formData.bookingId 
    ? bookings.find(b => b.id === formData.bookingId) 
    : null;

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
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
            <Typography variant="h4">Utility Reading Details</Typography>
          </Box>
          <Button component={RouterLink} to="/utilities" variant="outlined">
            Back to Utilities
          </Button>
        </Box>

        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>Success</AlertTitle>
            Utility reading {isNew ? 'created' : 'updated'} successfully. Redirecting...
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Basic Information */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth error={!!errors.apartmentId} disabled={!isNew}>
                      <InputLabel id="apartment-label">Apartment</InputLabel>
                      <Select
                        labelId="apartment-label"
                        id="apartmentId"
                        name="apartmentId"
                        value={formData.apartmentId}
                        onChange={(event) => setFormData(prev => ({ ...prev, apartmentId: event.target.value as string }))}
                        label="Apartment"
                      >
                        <MenuItem value="">
                          <em>Select an apartment</em>
                        </MenuItem>
                        {apartments.map((apartment) => (
                          <MenuItem key={apartment.id} value={apartment.id}>
                            {apartment.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.apartmentId && <FormHelperText>{errors.apartmentId}</FormHelperText>}
                    </FormControl>
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth error={!!errors.bookingId} disabled={!isNew || !formData.apartmentId}>
                      <InputLabel id="booking-label">Booking</InputLabel>
                      <Select
                        labelId="booking-label"
                        id="bookingId"
                        name="bookingId"
                        value={formData.bookingId}
                        onChange={(event) => setFormData(prev => ({ ...prev, bookingId: event.target.value as string }))}
                        label="Booking"
                      >
                        <MenuItem value="">
                          <em>Select a booking</em>
                        </MenuItem>
                        {filteredBookings.map((booking) => {
                          const apartmentName = apartments.find(a => a.id === booking.apartmentId)?.name || '';
                          return (
                            <MenuItem key={booking.id} value={booking.id}>
                              {apartmentName} ({format(parseISO(booking.arrivalDate), 'dd MMM yyyy')})
                            </MenuItem>
                          );
                        })}
                      </Select>
                      {errors.bookingId && <FormHelperText>{errors.bookingId}</FormHelperText>}
                    </FormControl>
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth error={!!errors.utilityType} disabled={isAddingEndReading || !!existingUtility}>
                      <InputLabel id="utility-type-label">Utility Type</InputLabel>
                      <Select
                        labelId="utility-type-label"
                        id="utilityType"
                        name="utilityType"
                        value={formData.utilityType}
                        onChange={(event) => setFormData(prev => ({ ...prev, utilityType: event.target.value as 'water' | 'electricity' }))}
                        label="Utility Type"
                      >
                        <MenuItem value="water">Water</MenuItem>
                        <MenuItem value="electricity">Electricity</MenuItem>
                      </Select>
                      {errors.utilityType && <FormHelperText>{errors.utilityType}</FormHelperText>}
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
              
              <Divider />
              
              {/* Start Reading */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Start Reading
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Start Reading Value"
                      name="startReading"
                      type="number"
                      value={formData.startReading}
                      onChange={handleNumberChange}
                      error={!!errors.startReading}
                      helperText={errors.startReading || ''}
                      InputProps={{ inputProps: { min: 0 } }}
                      disabled={isAddingEndReading}
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Start Reading Date"
                        value={formData.startDate}
                        onChange={handleStartDateChange}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!errors.startDate,
                            helperText: errors.startDate || '',
                          },
                        }}
                        disabled={isAddingEndReading}
                        minDate={currentBooking ? parseISO(currentBooking.arrivalDate) : undefined}
                        maxDate={currentBooking ? parseISO(currentBooking.leavingDate) : undefined}
                      />
                    </LocalizationProvider>
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Start Reading Notes"
                      name="startNotes"
                      value={formData.startNotes}
                      onChange={handleChange}
                      multiline
                      rows={2}
                      disabled={isAddingEndReading}
                    />
                  </Grid>
                </Grid>
              </Box>
              
              <Divider />
              
              {/* End Reading */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    End Reading
                  </Typography>
                  {!isAddingEndReading && existingUtility && !existingUtility.endReading && (
                    <Chip 
                      label="Not completed yet" 
                      color="warning" 
                      variant="outlined" 
                    />
                  )}
                </Box>
                
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="End Reading Value"
                      name="endReading"
                      type="number"
                      value={formData.endReading || ''}
                      onChange={handleNumberChange}
                      error={!!errors.endReading}
                      helperText={errors.endReading || ''}
                      InputProps={{ inputProps: { min: 0 } }}
                      disabled={false}
                      required={isAddingEndReading}
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="End Reading Date"
                        value={formData.endDate}
                        onChange={handleEndDateChange}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!errors.endDate,
                            helperText: errors.endDate || '',
                            required: isAddingEndReading
                          },
                        }}
                        disabled={false}
                        minDate={formData.startDate || (currentBooking ? parseISO(currentBooking.arrivalDate) : undefined)}
                        maxDate={currentBooking ? parseISO(currentBooking.leavingDate) : undefined}
                      />
                    </LocalizationProvider>
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="End Reading Notes"
                      name="endNotes"
                      value={formData.endNotes}
                      onChange={handleChange}
                      multiline
                      rows={2}
                      disabled={!isAddingEndReading && existingUtility?.endNotes !== undefined}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ width: '100%', mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button component={RouterLink} to="/utilities" variant="outlined">
                  Cancel
                </Button>
                <Button type="submit" variant="contained" color="primary">
                  {isNew ? 'Create Reading' : isAddingEndReading ? 'Save End Reading' : 'Update Reading'}
                </Button>
              </Box>
            </Box>
          </form>
        </Paper>

        {currentBooking && (
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Booking Information
            </Typography>
            <Typography variant="body2">
              Apartment: {apartments.find(a => a.id === currentBooking.apartmentId)?.name}
            </Typography>
            <Typography variant="body2">
              Period: {format(parseISO(currentBooking.arrivalDate), 'dd MMM yyyy')} - {format(parseISO(currentBooking.leavingDate), 'dd MMM yyyy')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
              Note: Reading dates must be within the booking period.
            </Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default UtilityReadingDetails; 