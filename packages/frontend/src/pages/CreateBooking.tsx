import React, { useEffect, useState, useRef } from "react";
import { getNumericInputProps } from '../utils/numberUtils';
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
import { villageService } from '../services/villageService';
import type { Apartment } from '../services/apartmentService';
import type { User } from '../services/userService';
import type { Village } from '../services/villageService';
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
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchingApartments, setSearchingApartments] = useState(false);
  const apartmentSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Villages and phase filter state
  const [villages, setVillages] = useState<Village[]>([]);
  const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [availablePhases, setAvailablePhases] = useState<number[]>([]);
  
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
    person_name: '',
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
        
        // Load initial apartments data
        const apartmentsPromise = apartmentService.getApartments({
          limit: 30,
          sort_by: 'created_at',
          sort_order: 'desc'
        });
        
        // If specific apartmentId is provided, we'll ensure it's included in the results
        let specificApartment: Apartment | undefined;
        
        const [apartmentsResult, usersResult] = await Promise.all([
          apartmentsPromise,
          // Load only the most recent 20 users initially
          userService.getUsers({ 
            limit: 20,
            sort_by: 'created_at',
            sort_order: 'desc'
          })
        ]);
        
        let apartmentsData = apartmentsResult.data;
        
        // If apartmentId was provided, fetch that specific apartment if not already in results
        if (apartmentId) {
          const foundApartment = apartmentsData.find(apt => apt.id === apartmentId);
          if (!foundApartment) {
            try {
              // Fetch the specific apartment individually
              const specificResult = await apartmentService.getApartmentById(apartmentId);
              // Add it to our apartments array
              if (specificResult) {
                apartmentsData = [specificResult, ...apartmentsData];
              }
            } catch (specificErr) {
              console.error('Error fetching specific apartment:', specificErr);
            }
          }
        }
        
        setApartments(apartmentsData);
        setUsers(usersResult.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [apartmentId]);

  // Fetch villages on mount
  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const result = await villageService.getVillages({ limit: 100 });
        setVillages(result.data);
      } catch (err) {
        // ignore for now
      }
    };
    fetchVillages();
  }, []);

  // Update available phases when village changes and trigger apartment search
  useEffect(() => {
    if (selectedVillageId) {
      const village = villages.find(v => v.id === Number(selectedVillageId));
      if (village) {
        setAvailablePhases(Array.from({ length: village.phases }, (_, i) => i + 1));
      } else {
        setAvailablePhases([]);
      }
      setSelectedPhase('');
      setFormData(prev => ({ ...prev, apartment_id: 0 }));
      
      // Trigger apartment search with new village filter
      handleApartmentSearch('');
    } else {
      setAvailablePhases([]);
      setSelectedPhase('');
      setFormData(prev => ({ ...prev, apartment_id: 0 }));
      
      // Reset apartment search without filters
      handleApartmentSearch('');
    }
  }, [selectedVillageId, villages]);

  // Reset apartment when phase changes and trigger search
  useEffect(() => {
    setFormData(prev => ({ ...prev, apartment_id: 0 }));
    
    // Trigger apartment search with updated phase filter
    if (selectedVillageId) {
      handleApartmentSearch('');
    }
  }, [selectedPhase]);

  // We'll use the apartments list directly, since filtering is now handled server-side
  // But keep the filteredApartments variable for compatibility with existing code
  const filteredApartments = apartments;

  // Auto-select apartment owner when apartment is selected and user type is owner
  useEffect(() => {
    const fetchApartmentWithOwner = async () => {
      if (formData.user_type === 'owner' && formData.apartment_id) {
        try {
          // First check if we already have owner data in our apartments list
          const selectedApartment = apartments.find(apt => apt.id === formData.apartment_id);
          
          if (selectedApartment?.owner) {
            // We have owner data, use it
            console.log('Using owner data from apartments list:', selectedApartment.owner);
            setFormData(prev => ({ 
              ...prev, 
              user_id: selectedApartment.owner?.id || 0,
              user_name: selectedApartment.owner?.name || ''
            }));
          } else {
            // We don't have owner data, fetch it directly
            console.log('No owner data in apartments list, fetching apartment details...');
            try {
              const apartmentDetails = await apartmentService.getApartmentById(formData.apartment_id);
              console.log('Fetched apartment details:', apartmentDetails);
              
              if (apartmentDetails?.owner) {
                console.log('Found owner in fetched details:', apartmentDetails.owner);
                setFormData(prev => ({ 
                  ...prev, 
                  user_id: apartmentDetails.owner?.id || 0,
                  user_name: apartmentDetails.owner?.name || ''
                }));
              } else {
                console.log('No owner found in fetched apartment details');
              }
            } catch (error) {
              console.error('Error fetching apartment details:', error);
            }
          }
        } catch (error) {
          console.error('Error in apartment owner auto-selection:', error);
        }
      }
    };
    
    fetchApartmentWithOwner();
  }, [formData.apartment_id, formData.user_type, apartments]);

  // When lockApartment and apartmentId are set, ensure owner autofill logic is triggered
  useEffect(() => {
    if (lockApartment && apartmentId && apartments.length > 0) {
      const apt = apartments.find(a => a.id === apartmentId);
      if (apt) {
        setSelectedVillageId(String(apt.village_id));
        setSelectedPhase(String(apt.phase));
        setFormData(prev => {
          // If user_type is owner, set user_id and user_name to owner
          let user_id = prev.user_id;
          let user_name = prev.user_name;
          if (prev.user_type === 'owner' && apt.owner) {
            user_id = apt.owner.id;
            user_name = apt.owner.name;
          }
          return { ...prev, apartment_id: apt.id, user_id, user_name };
        });
      }
    }
  }, [lockApartment, apartmentId, apartments]);

  // When User Type is set to 'owner' and lockApartment is true, unlock User and Apartment fields, set owner, then relock
  useEffect(() => {
    if (lockApartment && formData.user_type === 'owner' && apartmentId && apartments.length > 0) {
      const apt = apartments.find(a => a.id === apartmentId);
      if (apt && apt.owner) {
        // Temporarily unlock, set, then relock (effectively just set the values)
        setFormData(prev => ({
          ...prev,
          apartment_id: apt.id,
          user_id: apt.owner?.id || 0,
          user_name: apt.owner?.name || ''
        }));
      }
    }
  }, [formData.user_type, lockApartment, apartmentId, apartments]);

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

  // Handle server-side search for apartments
  const handleApartmentSearch = async (searchQuery: string): Promise<void> => {
    try {
      setSearchingApartments(true);
      
      // Build filters based on current village and phase selections
      const filters: any = {
        limit: 100
      };
      
      // Add search query if provided (length >= 1)
      if (searchQuery && searchQuery.length >= 1) {
        filters.search = searchQuery;
      }
      
      // Add village filter if selected
      if (selectedVillageId) {
        filters.village_id = parseInt(selectedVillageId);
      }
      
      // Add phase filter if selected
      if (selectedPhase) {
        filters.phase = parseInt(selectedPhase);
      }
      
      const result = await apartmentService.getApartments(filters);
      console.log('Received apartments data:', result.data);
      setApartments(result.data);
    } catch (err) {
      console.error('Error searching for apartments:', err);
      // Don't show error message during search
    } finally {
      setSearchingApartments(false);
    }
  };
  
  // Handle apartment input changes with better empty input handling
  const handleApartmentInputChange = (inputText: string) => {
    // Clear the search timeout if it exists
    if (apartmentSearchTimeoutRef.current) {
      clearTimeout(apartmentSearchTimeoutRef.current);
      apartmentSearchTimeoutRef.current = null;
    }
    
    // Set a new timeout to prevent too many API calls while typing
    apartmentSearchTimeoutRef.current = setTimeout(() => {
      // If input is empty and there's no village/phase filter, limit to a small set
      if (!inputText && !selectedVillageId && !selectedPhase) {
        handleApartmentSearch('__recent');  // Special keyword to get recent apartments
      } else {
        handleApartmentSearch(inputText);
      }
    }, 300); // Increased delay for better typing experience
  };

  // Handle server-side search for users
  const handleUserSearch = async (searchQuery: string): Promise<void> => {
    if (searchQuery.length < 2) return;
    
    try {
      setSearchingUsers(true);
      const result = await userService.getUsers({
        search: searchQuery,
        limit: 30
      });
      
      setUsers(result.data);
    } catch (err) {
      console.error('Error searching for users:', err);
      // Don't show error message during search
    } finally {
      setSearchingUsers(false);
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
      <Box sx={{ width: '100%', mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: '1200px' }}>
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

        <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'medium', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
            Booking Information
          </Typography>
          <Grid container spacing={3}>
            {/* Project (Village) Selection */}
            <Grid size = {{xs:12, md:6}}>
              <FormControl fullWidth>
                <InputLabel>Project</InputLabel>
                <Select
                  value={selectedVillageId}
                  label="Project"
                  onChange={e => setSelectedVillageId(String(e.target.value))}
                  disabled={!!lockApartment}
                >
                  <MenuItem value=""><em>All Projects</em></MenuItem>
                  {villages.map(village => (
                    <MenuItem key={village.id} value={String(village.id)}>{village.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/* Phase Selection */}
            <Grid size = {{xs:12, md:6}}>
              <FormControl fullWidth disabled={!selectedVillageId || !!lockApartment}>
                <InputLabel>Phase</InputLabel>
                <Select
                  value={selectedPhase}
                  label="Phase"
                  onChange={e => setSelectedPhase(String(e.target.value))}
                  disabled={!selectedVillageId || !!lockApartment}
                >
                  <MenuItem value=""><em>All Phases</em></MenuItem>
                  {availablePhases.map(phase => (
                    <MenuItem key={phase} value={String(phase)}>Phase {phase}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/* Apartment Selection */}
            <Grid size = {{xs:12, md:6}}>
              <SearchableDropdown
                options={filteredApartments.map(apartment => ({
                  id: apartment.id,
                  label: `${apartment.name} (${apartment.village?.name}, Phase ${apartment.phase})`,
                  name: apartment.name,
                  village: apartment.village,
                  phase: apartment.phase
                }))}
                value={formData.apartment_id || null}
                onChange={(value) => setFormData(prev => ({ ...prev, apartment_id: value as number || 0 }))}
                label="Related Apartment"
                placeholder="Type to search apartments by name..."
                required
                disabled={lockApartment}
                loading={searchingApartments}
                serverSideSearch={true}
                onInputChange={handleApartmentInputChange}
                getOptionLabel={(option) => option.label}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography variant="body1">{option.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.village?.name} • Phase {option.phase}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            </Grid>

            {/* User Type */}
            <Grid size = {{xs:12, md:6}}>
              <FormControl fullWidth>
                <InputLabel>User Type</InputLabel>
                <Select
                  value={formData.user_type}
                  label="User Type"
                  onChange={(e) => {
                    const newUserType = e.target.value as 'owner' | 'renter';
                    setFormData(prev => {
                      // If switching to owner and apartment is selected, auto-fill owner info
                      if (newUserType === 'owner' && prev.apartment_id) {
                        const selectedApartment = apartments.find(apt => apt.id === prev.apartment_id);
                        if (selectedApartment?.owner) {
                          return {
                            ...prev,
                            user_type: newUserType,
                            user_id: selectedApartment.owner.id,
                            user_name: selectedApartment.owner.name
                          };
                        }
                      }
                      // If switching to renter, clear owner info
                      if (newUserType === 'renter') {
                        return {
                          ...prev,
                          user_type: newUserType,
                          user_id: 0,
                          user_name: ''
                        };
                      }
                      return { ...prev, user_type: newUserType };
                    });
                  }}
                >
                  <MenuItem value="owner">Owner</MenuItem>
                  <MenuItem value="renter">Tenant</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Guest Details Section */}
            <Grid size = {{xs:12}}>
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>Guest Details</Typography>
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', width: '100%' }}></Box>
              </Box>
            </Grid>

            {/* User Selection - Conditional based on user type */}
            <Grid size={{xs:12, md:6}}>
              {formData.user_type === 'owner' ? (
                (() => {
                  const selectedApartment = apartments.find(apt => apt.id === formData.apartment_id);
                  return (
                    <TextField
                      fullWidth
                      required
                      label="User Name (Owner)"
                      value={selectedApartment?.owner?.name || ''}
                      disabled
                      helperText={selectedApartment?.owner ? `Apartment owner: ${selectedApartment.owner.email}` : 'Select an apartment to prefill owner'}
                    />
                  );
                })()
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
                      const selectedUser = users.find(u => u.id === value);
                      if (selectedUser) {
                        setFormData(prev => ({ 
                          ...prev, 
                          user_id: selectedUser.id,
                          user_name: selectedUser.name 
                        }));
                      }
                    } else {
                      setFormData(prev => ({ ...prev, user_id: 0 }));
                    }
                  }}
                  label="User Name"
                  placeholder="Type at least 2 characters to search users..."
                  required
                  freeSolo={true}
                  onInputChange={(inputValue) => {
                    setFormData(prev => ({ ...prev, user_name: inputValue }));
                  }}
                  inputValue={formData.user_name}
                  loading={searchingUsers}
                  serverSideSearch={true}
                  onServerSearch={handleUserSearch}
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

            {/* Person Name */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="Person Name (Optional)"
                value={formData.person_name}
                onChange={(e) => setFormData(prev => ({ ...prev, person_name: e.target.value }))}
                placeholder="Enter the name(s) of the person(s) for this booking"
              />
            </Grid>

            {/* Number of People */}
            <Grid size = {{xs:12, md:6}}>
              <TextField
                fullWidth
                required
                label="Number of Guests"
                type="number"
                value={formData.number_of_people === 0 ? '' : formData.number_of_people}
                onChange={(e) => setFormData(prev => ({ ...prev, number_of_people: e.target.value === '' ? 0 : parseInt(e.target.value) }))}
                inputProps={getNumericInputProps(1, 20)}
              />
            </Grid>

            {/* Booking Period Section */}
            <Grid size = {{xs:12}}>
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>Booking Period</Typography>
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', width: '100%' }}></Box>
              </Box>
            </Grid>

            {/* Arrival Date */}
            <Grid size = {{xs:12, md:6}}>
              <DateTimePicker
                label="Arrival DateTime"
                value={formData.arrival_date}
                onChange={(date) => setFormData(prev => ({ ...prev, arrival_date: date }))}
                format="dd/MM/yyyy HH:mm"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />
            </Grid>

            {/* Leaving Date */}
            <Grid size = {{xs:12, md:6}}>
              <DateTimePicker
                label="Departure DateTime"
                value={formData.leaving_date}
                onChange={(date) => setFormData(prev => ({ ...prev, leaving_date: date }))}
                format="dd/MM/yyyy HH:mm"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />
            </Grid>

            {/* Status */}
            <Grid size = {{xs:12, md:6}}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'Booked' | 'Cancelled' }))}
                >
                  <MenuItem value="Booked">Booked</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Additional Information Section */}
            <Grid size = {{xs:12}}>
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>Additional Information</Typography>
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', width: '100%' }}></Box>
              </Box>
            </Grid>

            {/* Notes */}
            <Grid size = {{xs:12, md:6}}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes about this booking..."
              />
            </Grid>

            {/* Flight Details */}
            <Grid size = {{xs:12, md:6}}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Flight Details"
                value={formData.flightDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, flightDetails: e.target.value }))}
                placeholder="Flight information (optional)"
                helperText="Include flight numbers, arrival/departure times, etc."
              />
            </Grid>

            {/* Submit Buttons */}
            <Grid size = {{xs:12}}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => onCancel ? onCancel() : navigate('/bookings')}
                  disabled={submitting}
                  size="large"
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={submitting}
                  size="large"
                  color="primary"
                >
                  {submitting ? <CircularProgress size={24} /> : 'Create Booking'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Tenant Booking Note at the bottom */}
        {formData.user_type === 'renter' && (
          <Alert severity="info" sx={{ mt: 3, mb: 3 }}>
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

        <Alert severity="info" sx={{ mt: 3, mb: 3 }}>
          <Typography variant="body2">
            <strong>Note:</strong> The system will automatically check for booking conflicts and prevent overlapping bookings for the same apartment.
          </Typography>
        </Alert>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}