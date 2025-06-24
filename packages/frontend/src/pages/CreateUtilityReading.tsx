import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useAuth } from '../context/AuthContext';
import { utilityReadingService } from '../services/utilityReadingService';
import type { UtilityReading, CreateUtilityReadingRequest, UpdateUtilityReadingRequest } from '../services/utilityReadingService';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';

const WHO_PAYS_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'renter', label: 'Renter' },
  { value: 'company', label: 'Company' }
];

export default function CreateUtilityReading() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const isEditMode = !!id;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Data
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [existingReading, setExistingReading] = useState<UtilityReading | null>(null);
  
  // Form fields
  const [apartmentId, setApartmentId] = useState<number>(0);
  const [bookingId, setBookingId] = useState<number | undefined>(undefined);
  const [waterStartReading, setWaterStartReading] = useState<number | undefined>(undefined);
  const [waterEndReading, setWaterEndReading] = useState<number | undefined>(undefined);
  const [electricityStartReading, setElectricityStartReading] = useState<number | undefined>(undefined);
  const [electricityEndReading, setElectricityEndReading] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [whoPays, setWhoPays] = useState<'owner' | 'renter' | 'company'>('renter');

  // Check if user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        const [apartmentsResult, bookingsResult] = await Promise.all([
          apartmentService.getApartments({ limit: 100 }),
          bookingService.getBookings({ limit: 100 })
        ]);
        
        setApartments(apartmentsResult.data);
        setBookings(bookingsResult.bookings);
        
        // If editing, load existing reading
        if (isEditMode && id) {
          const reading = await utilityReadingService.getUtilityReadingById(parseInt(id));
          setExistingReading(reading);
          
          // Populate form with existing data
          setApartmentId(reading.apartment_id);
          setBookingId(reading.booking_id);
          setWaterStartReading(reading.water_start_reading);
          setWaterEndReading(reading.water_end_reading);
          setElectricityStartReading(reading.electricity_start_reading);
          setElectricityEndReading(reading.electricity_end_reading);
          setStartDate(new Date(reading.start_date));
          setEndDate(new Date(reading.end_date));
          setWhoPays(reading.who_pays);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isEditMode, id]);

  // Filter bookings when apartment changes
  useEffect(() => {
    if (apartmentId) {
      const filtered = (bookings || []).filter(booking => booking.apartment_id === apartmentId);
      setFilteredBookings(filtered);
      
      // If only one booking available, auto-select it
      if (filtered.length === 1 && !isEditMode) {
        setBookingId(filtered[0].id);
        // Auto-fill dates from booking
        setStartDate(new Date(filtered[0].arrival_date));
        setEndDate(new Date(filtered[0].leaving_date));
        // Auto-set who pays based on booking type
        setWhoPays(filtered[0].user_type === 'owner' ? 'owner' : 'renter');
      }
    } else {
      setFilteredBookings([]);
      if (!isEditMode) {
        setBookingId(undefined);
      }
    }
  }, [apartmentId, bookings, isEditMode]);

  // When booking changes, update dates and who pays
  useEffect(() => {
    if (bookingId && !isEditMode) {
      const selectedBooking = (bookings || []).find(b => b.id === bookingId);
      if (selectedBooking) {
        setStartDate(new Date(selectedBooking.arrival_date));
        setEndDate(new Date(selectedBooking.leaving_date));
        setWhoPays(selectedBooking.user_type === 'owner' ? 'owner' : 'renter');
      }
    }
  }, [bookingId, bookings, isEditMode]);

  const validateForm = (): string | null => {
    if (!apartmentId || apartmentId === 0) return 'Please select an apartment';
    if (!startDate) return 'Please select start date';
    if (!endDate) return 'Please select end date';
    if (startDate >= endDate) return 'End date must be after start date';
    
    // Check if booking dates are valid (if booking is selected)
    if (bookingId) {
      const selectedBooking = (bookings || []).find(b => b.id === bookingId);
      if (selectedBooking) {
        const bookingStart = new Date(selectedBooking.arrival_date);
        const bookingEnd = new Date(selectedBooking.leaving_date);
        
        if (startDate < bookingStart || startDate > bookingEnd) {
          return 'Start date must be within booking dates';
        }
        if (endDate < bookingStart || endDate > bookingEnd) {
          return 'End date must be within booking dates';
        }
      }
    }
    
    // At least one utility reading must be provided
    const hasWaterReadings = waterStartReading !== undefined || waterEndReading !== undefined;
    const hasElectricityReadings = electricityStartReading !== undefined || electricityEndReading !== undefined;
    
    if (!hasWaterReadings && !hasElectricityReadings) {
      return 'Please provide at least one utility reading (water or electricity)';
    }
    
    // Validate reading values
    if (waterStartReading !== undefined && waterEndReading !== undefined && waterStartReading >= waterEndReading) {
      return 'Water end reading must be greater than start reading';
    }
    
    if (electricityStartReading !== undefined && electricityEndReading !== undefined && electricityStartReading >= electricityEndReading) {
      return 'Electricity end reading must be greater than start reading';
    }
    
    return null;
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');

      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      const readingData = {
        apartment_id: apartmentId,
        booking_id: bookingId,
        water_start_reading: waterStartReading,
        water_end_reading: waterEndReading,
        electricity_start_reading: electricityStartReading,
        electricity_end_reading: electricityEndReading,
        start_date: startDate!.toISOString(),
        end_date: endDate!.toISOString(),
        who_pays: whoPays
      };

      if (isEditMode && id) {
        await utilityReadingService.updateUtilityReading(parseInt(id), readingData as UpdateUtilityReadingRequest);
        navigate('/utilities?success=true&message=Utility%20reading%20updated%20successfully');
      } else {
        await utilityReadingService.createUtilityReading(readingData as CreateUtilityReadingRequest);
        navigate('/utilities?success=true&message=Utility%20reading%20created%20successfully');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} utility reading`);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedApartment = (apartments || []).find(apt => apt.id === apartmentId);
  const selectedBooking = (bookings || []).find(b => b.id === bookingId);
  
  // Calculate potential bills
  const waterBill = (waterStartReading !== undefined && waterEndReading !== undefined && selectedApartment?.village) 
    ? utilityReadingService.calculateUtilityCost(
        waterStartReading, 
        waterEndReading, 
        'water', 
        selectedApartment.village.electricity_price, 
        selectedApartment.village.water_price
      )
    : null;
    
  const electricityBill = (electricityStartReading !== undefined && electricityEndReading !== undefined && selectedApartment?.village)
    ? utilityReadingService.calculateUtilityCost(
        electricityStartReading, 
        electricityEndReading, 
        'electricity', 
        selectedApartment.village.electricity_price, 
        selectedApartment.village.water_price
      )
    : null;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/utilities')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4">
            {isEditMode ? 'Edit Utility Reading' : 'Create New Utility Reading'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Form */}
          <Grid xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Reading Details
              </Typography>
              
              <Grid container spacing={3}>
                {/* Apartment Selection */}
                <Grid xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Related Apartment</InputLabel>
                    <Select
                      value={apartmentId}
                      label="Related Apartment"
                      onChange={(e) => setApartmentId(e.target.value as number)}
                    >
                      {(apartments || []).map(apartment => (
                        <MenuItem key={apartment.id} value={apartment.id}>
                          {apartment.name} ({apartment.village?.name} - Phase {apartment.phase})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Booking Selection */}
                <Grid xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Related Booking (Optional)</InputLabel>
                    <Select
                      value={bookingId || ''}
                      label="Related Booking (Optional)"
                      onChange={(e) => setBookingId(e.target.value ? e.target.value as number : undefined)}
                      disabled={!apartmentId}
                    >
                      <MenuItem value="">No Booking</MenuItem>
                      {(filteredBookings || []).map(booking => (
                        <MenuItem key={booking.id} value={booking.id}>
                          {booking.user?.name} ({booking.user_type}) - {utilityReadingService.formatDate(booking.arrival_date)} to {utilityReadingService.formatDate(booking.leaving_date)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Who Pays */}
                <Grid xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Who Will Pay</InputLabel>
                    <Select
                      value={whoPays}
                      label="Who Will Pay"
                      onChange={(e) => setWhoPays(e.target.value as 'owner' | 'renter' | 'company')}
                    >
                      {WHO_PAYS_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Period Dates */}
                <Grid xs={12} md={6}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(date) => setStartDate(date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true
                      }
                    }}
                  />
                </Grid>

                <Grid xs={12} md={6}>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(date) => setEndDate(date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true
                      }
                    }}
                  />
                </Grid>

                <Grid xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Water Readings
                  </Typography>
                </Grid>

                {/* Water Readings */}
                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Water Start Reading"
                    type="number"
                    value={waterStartReading || ''}
                    onChange={(e) => setWaterStartReading(e.target.value ? parseFloat(e.target.value) : undefined)}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Starting meter reading for water"
                  />
                </Grid>

                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Water End Reading"
                    type="number"
                    value={waterEndReading || ''}
                    onChange={(e) => setWaterEndReading(e.target.value ? parseFloat(e.target.value) : undefined)}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Ending meter reading for water"
                  />
                </Grid>

                <Grid xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Electricity Readings
                  </Typography>
                </Grid>

                {/* Electricity Readings */}
                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Electricity Start Reading"
                    type="number"
                    value={electricityStartReading || ''}
                    onChange={(e) => setElectricityStartReading(e.target.value ? parseFloat(e.target.value) : undefined)}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Starting meter reading for electricity"
                  />
                </Grid>

                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Electricity End Reading"
                    type="number"
                    value={electricityEndReading || ''}
                    onChange={(e) => setElectricityEndReading(e.target.value ? parseFloat(e.target.value) : undefined)}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Ending meter reading for electricity"
                  />
                </Grid>

                {/* Submit Buttons */}
                <Grid xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/utilities')}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? <CircularProgress size={24} /> : (isEditMode ? 'Update Reading' : 'Create Reading')}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Preview/Summary */}
          <Grid xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Preview
              </Typography>
              
              {selectedApartment && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Apartment
                    </Typography>
                    <Typography variant="body2">
                      {selectedApartment.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedApartment.village?.name} - Phase {selectedApartment.phase}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {selectedBooking && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Booking
                    </Typography>
                    <Typography variant="body2">
                      {selectedBooking.user?.name} ({selectedBooking.user_type})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {utilityReadingService.formatDate(selectedBooking.arrival_date)} - {utilityReadingService.formatDate(selectedBooking.leaving_date)}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {startDate && endDate && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Reading Period
                    </Typography>
                    <Typography variant="body2">
                      {utilityReadingService.formatDate(startDate.toISOString())} - {utilityReadingService.formatDate(endDate.toISOString())}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {(waterBill || electricityBill) && (
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                      Estimated Bill
                    </Typography>
                    {waterBill && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        💧 Water: {waterBill.consumption} units = {waterBill.cost.toFixed(2)} EGP
                      </Typography>
                    )}
                    {electricityBill && (
                      <Typography variant="body2">
                        ⚡ Electricity: {electricityBill.consumption} units = {electricityBill.cost.toFixed(2)} EGP
                      </Typography>
                    )}
                    {waterBill && electricityBill && (
                      <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                        Total: {(waterBill.cost + electricityBill.cost).toFixed(2)} EGP
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              )}

              {selectedApartment?.village && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    Village Rates: Water {selectedApartment.village.water_price} EGP/unit, 
                    Electricity {selectedApartment.village.electricity_price} EGP/unit
                  </Typography>
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
} 