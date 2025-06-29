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
import SearchableDropdown, { type SearchableDropdownOption } from '../components/SearchableDropdown';

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
  const [formData, setFormData] = useState({
    apartment_id: apartmentId || 0,
    user_id: 0,
    user_name: '',
    user_type: 'renter' as 'owner' | 'renter',
    number_of_people: 1,
    arrival_date: null as Date | null,
    leaving_date: null as Date | null,
    status: 'Booked' as 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled',
    notes: '',
    flightDetails: ''
  });

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

  // Reset user fields when user type changes
  useEffect(() => {
    if (formData.user_type === 'owner') {
      setFormData(prev => ({ ...prev, user_id: 0, user_name: '' }));
    } else {
      setFormData(prev => ({ ...prev, user_id: 0, user_name: '' }));
    }
  }, [formData.user_type]);

  // Auto-select apartment owner when apartment is selected and user type is owner
  useEffect(() => {
    if (formData.user_type === 'owner' && formData.apartment_id) {
      const selectedApartment = apartments.find(apt => apt.id === formData.apartment_id);
      if (selectedApartment?.owner_id) {
        setFormData(prev => ({ ...prev, user_id: selectedApartment.owner_id }));
      }
    }
  }, [formData.apartment_id, formData.user_type, apartments]);

  const validateForm = (): string | null => {
    if (!formData.apartment_id || formData.apartment_id === 0) return 'Please select an apartment';
    
    if (formData.user_type === 'owner') {
      if (!formData.user_id || formData.user_id === 0) return 'Please select a user for owner booking';
    } else {
      // For renter bookings, user_name must be provided (either from selection or typing)
      if (!formData.user_name.trim()) {
        return 'Please enter a tenant name';
      }
    }
    
    if (!formData.arrival_date) return 'Please select arrival date';
    if (!formData.leaving_date) return 'Please select leaving date';
    if (formData.number_of_people < 1) return 'Number of people must be at least 1';
    
    if (formData.arrival_date && formData.leaving_date && formData.arrival_date >= formData.leaving_date) {
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

      const bookingData: any = {
        apartment_id: formData.apartment_id,
        number_of_people: formData.number_of_people,
        arrival_date: formData.arrival_date!.toISOString(),
        leaving_date: formData.leaving_date!.toISOString(),
        status: formData.status,
        notes: formData.notes + (formData.flightDetails ? `\n\nFlight Details: ${formData.flightDetails}` : '')
      };

      // Add user data based on type
      if (formData.user_type === 'owner') {
        bookingData.user_id = formData.user_id;
      } else {
        // For renter bookings, check if it's an existing user or new user
        if (formData.user_id && formData.user_id > 0) {
          // Existing user selected
          bookingData.user_id = formData.user_id;
        } else {
          // New user to be created
          bookingData.user_name = formData.user_name.trim();
          bookingData.user_type = 'renter';
        }
      }

      await bookingService.createBooking(bookingData);
      // Ensure ApartmentDetails refreshes bookings after creation
      if (onSuccess) {
        // Optionally, you could fetch the latest bookings here if needed
        onSuccess();
      } else {
        navigate('/bookings?success=true&message=Booking%20created%20successfully');
      }
    } catch (err: any) {
      // If the error is an Axios error with a response and status 409, show the backend message
      if (err.response && err.response.status === 409 && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create booking');
      }
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
      <Box sx={{ width: '100%', mt: 3 }}>
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

        {formData.user_type === 'renter' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Tenant Booking:</strong> You can search for existing users in the dropdown or type a new name directly. 
              When you enter a name that doesn't exist in the system, a new user account will be automatically created with the following default values:
              <br />• Email: [cleanname][timestamp][random]@domain.com
              <br />• Password: renterpassword
              <br />• Role: Renter
              <br />• Active: Yes
            </Typography>
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Apartment Selection */}
            <Grid size={{ xs: 12, md: 6 }}>
              <SearchableDropdown
                options={apartments.map(apartment => ({
                  id: apartment.id,
                  label: `${apartment.name} (${apartment.village?.name})`,
                  name: apartment.name,
                  village: apartment.village
                }))}
                value={formData.apartment_id || null}
                onChange={(value) => setFormData(prev => ({ ...prev, apartment_id: value as number || 0 }))}
                label="Related Apartment"
                placeholder="Search apartments by name..."
                required
                disabled={lockApartment}
                getOptionLabel={(option) => option.label}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography variant="body1">{option.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.village?.name}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            </Grid>

            {/* User Type */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>User Type</InputLabel>
                <Select
                  value={formData.user_type}
                  label="User Type"
                  onChange={(e) => setFormData(prev => ({ ...prev, user_type: e.target.value as 'owner' | 'renter' }))}
                >
                  <MenuItem value="Owner">Owner</MenuItem>
                  <MenuItem value="Renter">Tenant</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* User Selection - Conditional based on user type */}
            <Grid size={{ xs: 12, md: 6 }}>
              {formData.user_type === 'owner' ? (
                <SearchableDropdown
                  options={(() => {
                    // Get the selected apartment to find its owner
                    const selectedApartment = apartments.find(apt => apt.id === formData.apartment_id);
                    const apartmentOwnerId = selectedApartment?.owner_id;
                    
                    // Get all owner users
                    const ownerUsers = users.filter(user => user.role === 'owner');
                    
                    // Sort to put the apartment owner first
                    return ownerUsers.sort((a, b) => {
                      if (a.id === apartmentOwnerId) return -1;
                      if (b.id === apartmentOwnerId) return 1;
                      return a.name.localeCompare(b.name);
                    }).map(user => ({
                      id: user.id,
                      label: `${user.name} (${user.email})${user.id === apartmentOwnerId ? ' - Apartment Owner' : ''}`,
                      name: user.name,
                      email: user.email,
                      isApartmentOwner: user.id === apartmentOwnerId
                    }));
                  })()}
                  value={formData.user_id || null}
                  onChange={(value) => setFormData(prev => ({ ...prev, user_id: value as number || 0 }))}
                  label="Person Name"
                  placeholder="Search owners by name or email..."
                  required
                  getOptionLabel={(option) => option.label}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body1">
                          {option.name}
                          {option.isApartmentOwner && (
                            <Typography component="span" variant="body2" color="primary" sx={{ ml: 1 }}>
                              (Apartment Owner)
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.email}
                        </Typography>
                      </Box>
                    </li>
                  )}
                />
              ) : (
                <SearchableDropdown
                  options={users.map(user => ({
                    id: user.id,
                    label: `${user.name} (${user.email})`,
                    name: user.name,
                    email: user.email
                  }))}
                  value={formData.user_id || null}
                  onChange={(value) => {
                    if (value) {
                      // User selected an existing user
                      const selectedUser = users.find(u => u.id === value);
                      if (selectedUser) {
                        setFormData(prev => ({ 
                          ...prev, 
                          user_id: selectedUser.id,
                          user_name: selectedUser.name 
                        }));
                      }
                    } else {
                      // No user selected, clear user_id but keep user_name for new user
                      setFormData(prev => ({ ...prev, user_id: 0 }));
                    }
                  }}
                  label="Person Name"
                  placeholder="Search users or type new name..."
                  required
                  freeSolo={true}
                  onInputChange={(inputValue) => {
                    // Update user_name with the typed text
                    setFormData(prev => ({ ...prev, user_name: inputValue }));
                  }}
                  inputValue={formData.user_name}
                  getOptionLabel={(option) => option.label}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body1">{option.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.email}
                        </Typography>
                      </Box>
                    </li>
                  )}
                />
              )}
            </Grid>

            {/* Number of People */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="Number of Guests"
                type="number"
                value={formData.number_of_people === 0 ? '' : formData.number_of_people}
                onChange={(e) => setFormData(prev => ({ ...prev, number_of_people: e.target.value === '' ? 0 : parseInt(e.target.value) }))}
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>

            {/* Arrival Date */}
            <Grid size={{ xs: 12, md: 6 }}>
              <DateTimePicker
                label="Arrival DateTime"
                value={formData.arrival_date}
                onChange={(date) => setFormData(prev => ({ ...prev, arrival_date: date }))}
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
                label="Departure DateTime"
                value={formData.leaving_date}
                onChange={(date) => setFormData(prev => ({ ...prev, leaving_date: date }))}
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
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled' }))}
                >
                  <MenuItem value="Booked">Booked</MenuItem>
                  <MenuItem value="Checked In">Checked In</MenuItem>
                  <MenuItem value="Checked Out">Checked Out</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
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
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
                value={formData.flightDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, flightDetails: e.target.value }))}
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