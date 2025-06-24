import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Alert
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useAuth } from '../context/AuthContext';
import { bookingService } from '../services/bookingService';
import { apartmentService } from '../services/apartmentService';
import { userService } from '../services/userService';
import type { Apartment } from '../services/apartmentService';
import type { User } from '../services/userService';

export interface CreateBookingProps {
  apartmentId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  lockApartment?: boolean;
}

export default function CreateBooking({ apartmentId, onSuccess, onCancel, lockApartment }: CreateBookingProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Data
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Form fields
  const [apartmentIdForm, setApartmentIdForm] = useState<number>(apartmentId || 0);
  const [userId, setUserId] = useState<number>(0);
  const [userType, setUserType] = useState<'owner' | 'renter'>('renter');
  const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
  const [arrivalDate, setArrivalDate] = useState<Date | null>(null);
  const [leavingDate, setLeavingDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<'not_arrived' | 'in_village' | 'left'>('not_arrived');
  const [notes, setNotes] = useState('');
  const [flightDetails, setFlightDetails] = useState('');

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
        const [apartmentsResult, usersResult] = await Promise.all([
          apartmentService.getApartments({ limit: 100 }),
          userService.getUsers({ limit: 100 })
        ]);
        setApartments(apartmentsResult.data);
        setUsers(usersResult.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const validateForm = (): string | null => {
    if (!apartmentIdForm || apartmentIdForm === 0) return 'Please select an apartment';
    if (!userId || userId === 0) return 'Please select a user';
    if (!arrivalDate) return 'Please select arrival date';
    if (!leavingDate) return 'Please select leaving date';
    if (numberOfPeople < 1) return 'Number of people must be at least 1';
    
    if (arrivalDate && leavingDate && arrivalDate >= leavingDate) {
      return 'Leaving date must be after arrival date';
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

      const bookingData = {
        apartment_id: apartmentIdForm,
        user_id: userId,
        user_type: userType,
        number_of_people: numberOfPeople,
        arrival_date: arrivalDate!.toISOString(),
        leaving_date: leavingDate!.toISOString(),
        status,
        notes: notes + (flightDetails ? `\n\nFlight Details: ${flightDetails}` : '')
      };

      await bookingService.createBooking(bookingData);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/bookings?success=true&message=Booking%20created%20successfully');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

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
            onClick={() => onCancel ? onCancel() : navigate('/bookings')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4">
            Create New Booking
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Apartment Selection */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Related Apartment</InputLabel>
                <Select
                  value={apartmentIdForm}
                  label="Related Apartment"
                  onChange={(e) => setApartmentIdForm(e.target.value as number)}
                  disabled={lockApartment}
                >
                  {apartments.map(apartment => (
                    <MenuItem key={apartment.id} value={apartment.id}>
                      {apartment.name} ({apartment.village?.name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* User Selection */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Person Name</InputLabel>
                <Select
                  value={userId}
                  label="Person Name"
                  onChange={(e) => setUserId(e.target.value as number)}
                >
                  {users.map(user => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* User Type */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>User Type</InputLabel>
                <Select
                  value={userType}
                  label="User Type"
                  onChange={(e) => setUserType(e.target.value as 'owner' | 'renter')}
                >
                  <MenuItem value="owner">Owner</MenuItem>
                  <MenuItem value="renter">Renter</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Number of People */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="Number of People"
                type="number"
                value={numberOfPeople}
                onChange={(e) => setNumberOfPeople(parseInt(e.target.value))}
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>

            {/* Arrival Date */}
            <Grid size={{ xs: 12, md: 6 }}>
              <DateTimePicker
                label="Arrival DateTime"
                value={arrivalDate}
                onChange={(date) => setArrivalDate(date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />
            </Grid>

            {/* Leaving Date */}
            <Grid size={{ xs: 12, md: 6 }}>
              <DateTimePicker
                label="Leaving DateTime"
                value={leavingDate}
                onChange={(date) => setLeavingDate(date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />
            </Grid>

            {/* Status */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Booking Status</InputLabel>
                <Select
                  value={status}
                  label="Booking Status"
                  onChange={(e) => setStatus(e.target.value as 'not_arrived' | 'in_village' | 'left')}
                >
                  <MenuItem value="not_arrived">Has not Arrived</MenuItem>
                  <MenuItem value="in_village">In Village</MenuItem>
                  <MenuItem value="left">Left</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Notes */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this booking..."
              />
            </Grid>

            {/* Flight Details */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Flight Details"
                value={flightDetails}
                onChange={(e) => setFlightDetails(e.target.value)}
                placeholder="Flight information (optional)"
                helperText="Include flight numbers, arrival/departure times, etc."
              />
            </Grid>

            {/* Submit Buttons */}
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => onCancel ? onCancel() : navigate('/bookings')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? <CircularProgress size={24} /> : 'Create Booking'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Note:</strong> The system will automatically check for booking conflicts and prevent overlapping bookings for the same apartment.
          </Typography>
        </Alert>
      </Box>
    </LocalizationProvider>
  );
} 