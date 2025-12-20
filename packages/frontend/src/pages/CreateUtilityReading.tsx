import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatNumber, formatCurrency, getNumericInputProps } from '../utils/numberUtils';
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
import { format } from 'date-fns';
import SearchableDropdown from '../components/SearchableDropdown';
import ClearableSearchDropdown from '../components/ClearableSearchDropdown';
import { villageService } from '../services/villageService';
import type { Village } from '../services/villageService';

const WHO_PAYS_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'renter', label: 'Tenant' },
  { value: 'company', label: 'Company' }
];

export interface CreateUtilityReadingProps {
  apartmentId?: number;
  bookingId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  lockApartment?: boolean;
  lockProject?: boolean; // NEW: lock project field
  lockPhase?: boolean;   // NEW: lock phase field
}

export default function CreateUtilityReading(props: CreateUtilityReadingProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { apartmentId: propApartmentId, bookingId: propBookingId, onCancel, lockApartment, lockProject, lockPhase } = props;
  const onSuccess: (() => void) | undefined = props.onSuccess;
  const isEditMode = !!id;
  const isQuickAction = !!onSuccess || !!onCancel;

  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState<{
    apartment_id: number;
    date: string;
    electricity_reading: number;
    water_reading: number;
    month_year: string;
  }>({
    apartment_id: propApartmentId || 0,
    date: new Date().toISOString().split('T')[0],
    electricity_reading: 0,
    water_reading: 0,
    month_year: format(new Date(), 'yyyy-MM'),
  });
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [searchingApartments, setSearchingApartments] = useState(false);
  const [apartmentSearchTerm, setApartmentSearchTerm] = useState('');
  const apartmentSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchingBookings, setSearchingBookings] = useState(false);
  const [bookingSearchTerm, setBookingSearchTerm] = useState('');
  const bookingSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [existingReading, setExistingReading] = useState<UtilityReading | null>(null);
  
  // Form fields
  const [apartmentId, setApartmentId] = useState<number>(propApartmentId || 0);
  const [bookingId, setBookingId] = useState<number | undefined>(props.bookingId);
  const [waterStartReading, setWaterStartReading] = useState<number | string | undefined>(undefined);
  const [waterEndReading, setWaterEndReading] = useState<number | string | undefined>(undefined);
  const [electricityStartReading, setElectricityStartReading] = useState<number | string | undefined>(undefined);
  const [electricityEndReading, setElectricityEndReading] = useState<number | string | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [whoPays, setWhoPays] = useState<'owner' | 'renter' | 'company'>('renter');
  const [submitting, setSubmitting] = useState(false);

  // Add state for project/phase filter and villages
  const [villages, setVillages] = useState<Village[]>([]);
  const [projectFilter, setProjectFilter] = useState(''); // Village filter
  const [phaseFilter, setPhaseFilter] = useState('');
  const [availablePhases, setAvailablePhases] = useState<number[]>([]);

  // Load apartments based on current project/phase filters
  const loadFilteredApartments = useCallback(async () => {
    try {
      setSearchingApartments(true);
      const filters: any = { limit: 100 };
      
      // Add project filter if selected
      if (projectFilter) {
        filters.village_id = parseInt(projectFilter);
      }
      
      // Add phase filter if selected
      if (phaseFilter) {
        filters.phase = parseInt(phaseFilter);
      }
      
      const result = await apartmentService.getApartments(filters);
      setApartments(result.data);
    } catch (err) {
      console.error('Error loading filtered apartments:', err);
    } finally {
      setSearchingApartments(false);
    }
  }, [projectFilter, phaseFilter]);

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

  // Update available phases when project changes
  useEffect(() => {
    if (projectFilter) {
      const village = villages.find(v => v.id === Number(projectFilter));
      if (village) {
        setAvailablePhases(Array.from({ length: village.phases }, (_, i) => i + 1));
      } else {
        setAvailablePhases([]);
      }
      
      // Only reset phase and apartment if not in edit mode and not locked
      if (!lockApartment && !isEditMode) {
        setPhaseFilter('');
        setApartmentId(0);
      }
      
      // Load apartments for the selected project
      loadFilteredApartments();
    } else {
      setAvailablePhases([]);
      
      // Only reset phase and apartment if not in edit mode and not locked
      if (!lockApartment && !isEditMode) {
        setPhaseFilter('');
        setApartmentId(0);
      }
      
      // Load a limited set of apartments when no project is selected
      loadFilteredApartments();
    }
  }, [projectFilter, villages, lockApartment, isEditMode]);

  // Reset apartment when phase changes
  useEffect(() => {
    // Only reset apartment ID if not in edit mode and not locked
    if (!lockApartment && !isEditMode) setApartmentId(0);
    
    // Load apartments for the selected phase
    if (projectFilter) {
      loadFilteredApartments();
    }
  }, [phaseFilter, lockApartment, projectFilter, isEditMode]);

  // When lockApartment and apartmentId are set, set project and phase filters and whoPays to 'owner'
  useEffect(() => {
    if (lockApartment && propApartmentId && apartments.length > 0) {
      const apt = apartments.find(a => a.id === propApartmentId);
      if (apt) {
        setProjectFilter(apt.village?.id?.toString() || '');
        setPhaseFilter(apt.phase?.toString() || '');
        setWhoPays('owner');
      }
    }
  }, [lockApartment, propApartmentId, apartments]);
  
  // Load apartments when filters change or component mounts
  useEffect(() => {
    // Don't reload if we're already loading or if we're in a locked apartment state
    if (!loading && !(lockApartment && propApartmentId)) {
      loadFilteredApartments();
    }
  }, [projectFilter, phaseFilter, loading, lockApartment, propApartmentId, loadFilteredApartments]);

  // Handle server-side search for apartments
  const handleApartmentSearch = async (searchQuery: string): Promise<void> => {
    try {
      setSearchingApartments(true);
      setApartmentSearchTerm(searchQuery);
      
      // Build filters based on current project/phase selections
      const filters: any = {
        limit: 100
      };
      
      // Add search query regardless of length
      // This ensures filters work even with empty search terms
      filters.search = searchQuery;
      
      // Add project filter if selected
      if (projectFilter) {
        filters.village_id = parseInt(projectFilter);
      }
      
      // Add phase filter if selected
      if (phaseFilter) {
        filters.phase = parseInt(phaseFilter);
      }
      
      const result = await apartmentService.getApartments(filters);
      setApartments(result.data);
    } catch (err) {
      console.error('Error searching for apartments:', err);
      // Don't show error message during search
    } finally {
      setSearchingApartments(false);
    }
  };

  // Custom input change handler for apartments to bypass 2-char limit
  const handleApartmentInputChange = (text: string) => {
    // Update the search term state immediately for UI responsiveness
    setApartmentSearchTerm(text);
    
    // Handle explicit clearing of the input field
    if (text === '') {
      // Keep the current filters but don't reset the selection
      // This allows users to clear the search text without losing their selection
      handleApartmentSearch('').finally(() => setSearchingApartments(false));
      return;
    }
    
    // Clear the search timeout if it exists
    if (apartmentSearchTimeoutRef.current) {
      clearTimeout(apartmentSearchTimeoutRef.current);
      apartmentSearchTimeoutRef.current = null;
    }
    
    // Set a new timeout to prevent too many API calls while typing
    apartmentSearchTimeoutRef.current = setTimeout(() => {
      // Always call handleApartmentSearch with the current input text
      // This ensures filters are applied even with empty input
      handleApartmentSearch(text);
    }, 300); // Increased delay for better typing experience
  };
  
  // Handle clearing the apartment selection
  const handleClearApartment = () => {
    // Clear both the search term and the selection
    setApartmentSearchTerm('');
    setApartmentId(0);
    // Refresh the apartment list with current filters but empty search
    handleApartmentSearch('');
  };

  // Filter apartments based on selected project and phase (for backward compatibility)
  const getFilteredApartments = () => {
    return apartments;
  };

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
        
        const [bookingsResult] = await Promise.all([
          bookingService.getBookings({ limit: 100 })
        ]);
        
        setBookings(bookingsResult.bookings);
        
        // If editing, load existing reading (only if not quick action)
        if (isEditMode && id && !isQuickAction) {
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
          
          // Set project and phase filters based on the apartment
          if (reading.apartment) {
            // First, get the complete apartment data
            const apartmentResult = await apartmentService.getApartmentById(reading.apartment_id);
            
            // Then set project and phase filters
            if (apartmentResult.village_id) {
              setProjectFilter(apartmentResult.village_id.toString());
            }
            if (apartmentResult.phase) {
              setPhaseFilter(apartmentResult.phase.toString());
            }
            
            // Add the apartment to the list to ensure it's available in the dropdown
            setApartments([apartmentResult]);
            
            // Set apartment search term for UI consistency
            setApartmentSearchTerm(apartmentResult.name || '');
          }
          
          // If there's a related booking, load it and set the search term
          if (reading.booking_id) {
            try {
              const bookingResult = await bookingService.getBookingById(reading.booking_id);
              if (bookingResult) {
                // Add to filtered bookings to ensure it's in the dropdown
                setFilteredBookings([bookingResult]);
                
                // Set booking search term for UI consistency
                const bookingLabel = `${bookingResult.user?.name || 'Unknown'} (${bookingResult.user_type}) - ${utilityReadingService.formatDate(bookingResult.arrival_date)} to ${utilityReadingService.formatDate(bookingResult.leaving_date)}`;
                setBookingSearchTerm(bookingLabel);
              }
            } catch (err) {
              console.error('Error loading booking data:', err);
            }
          }
        }
      } catch (err) {
        setErrors(err instanceof Error ? { general: err.message } : { general: 'Failed to load data' });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isEditMode, id, isQuickAction]);

  // Handle server-side search for bookings
  const handleBookingSearch = async (searchQuery: string): Promise<void> => {
    if (!apartmentId) return;

    try {
      setSearchingBookings(true);
      setBookingSearchTerm(searchQuery);
      
      // Build filters based on apartment and search query
      const filters: any = {
        apartment_id: apartmentId,
        limit: 100,
        sort_by: 'arrival_date',
        sort_order: 'desc'
      };
      
      // Add search query regardless of length
      // This ensures filters work even with empty search terms
      filters.search = searchQuery;
      
      const result = await bookingService.getBookings(filters);
      // Sort bookings from latest to earliest by arrival date
      const sortedBookings = [...(result.bookings || [])].sort((a, b) => {
        return new Date(b.arrival_date).getTime() - new Date(a.arrival_date).getTime();
      });
      setFilteredBookings(sortedBookings);
    } catch (err) {
      console.error('Error searching for bookings:', err);
      // Don't show error message during search
    } finally {
      setSearchingBookings(false);
    }
  };

  // Load bookings based on selected apartment
  const loadFilteredBookings = useCallback(async () => {
    if (!apartmentId) {
      setFilteredBookings([]);
      return;
    }
    
    try {
      setSearchingBookings(true);
      const filters: any = { 
        apartment_id: apartmentId,
        limit: 100,
        sort_by: 'arrival_date',
        sort_order: 'desc'
      };
      
      const result = await bookingService.getBookings(filters);
      // Sort bookings from latest to earliest by arrival date
      const sortedBookings = [...(result.bookings || [])].sort((a, b) => {
        return new Date(b.arrival_date).getTime() - new Date(a.arrival_date).getTime();
      });
      setFilteredBookings(sortedBookings);
      
      // No longer auto-selecting booking when only one is available
      // User must explicitly select the booking
    } catch (err) {
      console.error('Error loading filtered bookings:', err);
      setFilteredBookings([]);
    } finally {
      setSearchingBookings(false);
    }
  }, [apartmentId]);

  // Custom input change handler for bookings
  const handleBookingInputChange = (text: string) => {
    // Update the search term state immediately for UI responsiveness
    setBookingSearchTerm(text);
    
    // Handle explicit clearing of the input field
    if (text === '') {
      // Keep the current apartment filter but don't reset the selection
      // This allows users to clear the search text without losing their selection
      handleBookingSearch('').finally(() => setSearchingBookings(false));
      return;
    }
    
    // Clear the search timeout if it exists
    if (bookingSearchTimeoutRef.current) {
      clearTimeout(bookingSearchTimeoutRef.current);
      bookingSearchTimeoutRef.current = null;
    }
    
    // Set a new timeout to prevent too many API calls while typing
    bookingSearchTimeoutRef.current = setTimeout(() => {
      // Always call handleBookingSearch with the current input text
      // This ensures filters are applied even with empty input
      handleBookingSearch(text);
    }, 300); // Increased delay for better typing experience
  };
  
  // Handle clearing the booking selection
  const handleClearBooking = () => {
    // Clear both the search term and the selection
    setBookingSearchTerm('');
    setBookingId(undefined);
    // Refresh the booking list with current apartment filter but empty search
    handleBookingSearch('');
  };

  // Filter bookings when apartment changes
  useEffect(() => {
    if (apartmentId) {
      // Only load filtered bookings if we're not already loading a specific booking in edit mode
      // This prevents overwriting the booking data that was loaded from the existing reading
      if (!(isEditMode && existingReading?.booking_id)) {
        loadFilteredBookings();
      }
    } else {
      setFilteredBookings([]);
      if (!isEditMode) {
        setBookingId(undefined);
      }
    }
  }, [apartmentId, isEditMode, existingReading, loadFilteredBookings]);

  // Handle pre-selected booking from props (quick action mode)
  useEffect(() => {
    if (props.bookingId && bookings.length > 0 && !isEditMode) {
      const selectedBooking = bookings.find(b => b.id === props.bookingId);
      if (selectedBooking) {
        setStartDate(new Date(selectedBooking.arrival_date));
        setEndDate(new Date(selectedBooking.leaving_date));
        setWhoPays(selectedBooking.user_type === 'owner' ? 'owner' : 'renter');
      }
    }
  }, [props.bookingId, bookings, isEditMode]);

  // When booking changes, update dates and who pays
  useEffect(() => {
    if (bookingId) {
      const selectedBooking = (bookings || []).find(b => b.id === bookingId);
      if (selectedBooking) {
        setStartDate(new Date(selectedBooking.arrival_date));
        setEndDate(new Date(selectedBooking.leaving_date));
        setWhoPays(selectedBooking.user_type === 'owner' ? 'owner' : 'renter');
      }
    }
  }, [bookingId, bookings]);

  // Prefill and lock logic for quick action
  useEffect(() => {
    if (isQuickAction) {
      // Prefill and lock apartment and booking
      if (typeof propApartmentId === 'number' && propApartmentId > 0) {
        setApartmentId(propApartmentId);
      }
      if (typeof propBookingId === 'number' && propBookingId > 0) {
        setBookingId(propBookingId);
      }
      // Lock project and phase based on apartment
      if (apartments.length > 0 && typeof propApartmentId === 'number') {
        const apt = apartments.find(a => a.id === propApartmentId);
        if (apt) {
          setProjectFilter(apt.village?.id?.toString() || '');
          setPhaseFilter(apt.phase?.toString() || '');
        }
      }
    }
  }, [isQuickAction, propApartmentId, propBookingId, apartments]);

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
      setErrors({});

      const validationError = validateForm();
      if (validationError) {
        setErrors({ form: validationError });
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

      if (isEditMode && id && !isQuickAction) {
        await utilityReadingService.updateUtilityReading(parseInt(id), readingData as UpdateUtilityReadingRequest);
        if (typeof onSuccess === 'function') {
          (onSuccess as () => void)();
        } else {
          navigate('/utilities?success=true&message=Utility%20reading%20updated%20successfully');
        }
      } else {
        await utilityReadingService.createUtilityReading(readingData as CreateUtilityReadingRequest);
        if (typeof onSuccess === 'function') {
          (onSuccess as () => void)();
        } else {
          navigate('/utilities?success=true&message=Utility%20reading%20created%20successfully');
        }
      }
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : `Failed to ${(isEditMode && !isQuickAction) ? 'update' : 'create'} utility reading` });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedApartment = (apartments || []).find(apt => apt.id === apartmentId);
  const selectedBooking = (bookings || []).find(b => b.id === bookingId);
  
  // Calculate potential bills
    const waterBill = (typeof waterStartReading === 'number' && typeof waterEndReading === 'number' && selectedApartment?.village)
    ? utilityReadingService.calculateUtilityCost(
        Number(waterStartReading),
        Number(waterEndReading),
        'water',
        Number(selectedApartment.village.electricity_price),
        Number(selectedApartment.village.water_price)
      )
    : null;
  const electricityBill = (typeof electricityStartReading === 'number' && typeof electricityEndReading === 'number' && selectedApartment?.village)
    ? utilityReadingService.calculateUtilityCost(
        Number(electricityStartReading),
        Number(electricityEndReading),
        'electricity',
        Number(selectedApartment.village.electricity_price),
        Number(selectedApartment.village.water_price)
      )
    : null;

  // Determine dialog title and button label
  const isCreationDialog = isQuickAction || !isEditMode;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%', mt: 3, px: 2, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => onCancel ? onCancel() : navigate('/utilities')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4">
            {isCreationDialog ? 'Create New Utility Reading' : 'Edit Utility Reading'}
          </Typography>
        </Box>

        {errors.form && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.form}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Project Filter */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth required>
              <InputLabel>Project</InputLabel>
              <Select
                value={projectFilter}
                label="Project"
                onChange={e => setProjectFilter(e.target.value)}
                disabled={!!lockApartment || !!lockProject || (isQuickAction && typeof propApartmentId === 'number')}
              >
                <MenuItem value="">
                  <em>Select a project</em>
                </MenuItem>
                {villages.map(village => (
                  <MenuItem key={village.id} value={village.id.toString()}>
                    {village.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Phase Filter */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Phase</InputLabel>
              <Select
                value={phaseFilter}
                label="Phase"
                onChange={e => setPhaseFilter(e.target.value)}
                disabled={!projectFilter || !!lockApartment || !!lockPhase || (isQuickAction && typeof propApartmentId === 'number')}
              >
                <MenuItem value="">
                  <em>All Phases</em>
                </MenuItem>
                {availablePhases.map(phase => (
                  <MenuItem key={phase} value={phase.toString()}>
                    Phase {phase}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Apartment Selection (filtered) */}
          <Grid size={{ xs: 12 }}>
            <ClearableSearchDropdown
              options={getFilteredApartments().map(apartment => ({
                id: apartment.id,
                label: `${apartment.name} (${apartment.village?.name} - Phase ${apartment.phase})`,
                name: apartment.name,
                village: apartment.village,
                phase: apartment.phase
              }))}
              value={apartmentId || null}
              onChange={(value) => setApartmentId(value as number || 0)}
              onClearSelection={handleClearApartment}
              label="Related Apartment"
              placeholder={projectFilter && phaseFilter 
                ? `Search apartments in ${villages.find(v => v.id === Number(projectFilter))?.name || ''} Phase ${phaseFilter}...` 
                : projectFilter 
                  ? `Search apartments in ${villages.find(v => v.id === Number(projectFilter))?.name || ''}...` 
                  : "Search apartments by name or village..."}
              required
              disabled={lockApartment && propApartmentId !== undefined || (isQuickAction && typeof propApartmentId === 'number')}
              loading={searchingApartments}
              serverSideSearch={false}
              onInputChange={handleApartmentInputChange}
              inputValue={apartmentSearchTerm}
              helperText="Showing apartments based on selected filters"
              getOptionLabel={(option) => option.label}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body1">{option.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.village?.name} (Phase {option.phase})
                    </Typography>
                  </Box>
                </li>
              )}
              clearable={true}
              showClearButton={apartmentId > 0}
            />
          </Grid>
          {/* Add spacing between Apartment and Booking fields */}
          <Grid size={{ xs: 12 }} sx={{ mt: 2 }} />
          {/* Booking Selection */}
          <Grid size={{ xs: 12 }}>
            <ClearableSearchDropdown
              options={[
                { id: '', label: 'No Booking', name: 'No Booking' },
                ...filteredBookings.map(booking => ({
                  id: booking.id,
                  label: `${booking.user?.name} (${booking.user_type}) - ${utilityReadingService.formatDate(booking.arrival_date)} to ${utilityReadingService.formatDate(booking.leaving_date)}`,
                  name: booking.user?.name || 'Unknown',
                  user_type: booking.user_type,
                  arrival_date: booking.arrival_date,
                  leaving_date: booking.leaving_date
                }))
              ]}
              value={bookingId || null}
              onChange={(value) => setBookingId(value ? value as number : undefined)}
              onClearSelection={handleClearBooking}
              label="Related Booking (Optional)"
              placeholder="Search bookings by user name..."
              disabled={!apartmentId || (isQuickAction && typeof propBookingId === 'number')}
              loading={searchingBookings}
              serverSideSearch={false}
              onInputChange={handleBookingInputChange}
              inputValue={bookingSearchTerm}
              helperText={!apartmentId ? "Select an apartment first" : "Showing bookings for selected apartment"}
              getOptionLabel={(option) => option.label}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body1">{option.name}</Typography>
                    {option.user_type && (
                      <Typography variant="body2" color="text.secondary">
                        {option.user_type} - {utilityReadingService.formatDate(option.arrival_date)} to {utilityReadingService.formatDate(option.leaving_date)}
                      </Typography>
                    )}
                  </Box>
                </li>
              )}
              clearable={true}
              showClearButton={!!bookingId}
            />
          </Grid>
          {/* Who Pays */}
          <Grid size={{ xs: 12, md: 6 }}>
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
          <Grid size={{ xs: 12, md: 6 }}>
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
              format="dd/MM/yyyy"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
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
              format="dd/MM/yyyy"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              Water Readings
            </Typography>
          </Grid>
          {/* Water Readings */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Water Start Reading"
              type="number"
              value={waterStartReading === undefined ? '' : waterStartReading}
              onChange={(e) => setWaterStartReading(e.target.value === '' ? undefined : parseFloat(e.target.value))}
              inputProps={getNumericInputProps(0)}
              helperText="Starting meter reading for water"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Water End Reading"
              type="number"
              value={waterEndReading === undefined ? '' : waterEndReading}
              onChange={(e) => setWaterEndReading(e.target.value === '' ? undefined : parseFloat(e.target.value))}
              inputProps={getNumericInputProps(0)}
              helperText="Ending meter reading for water"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              Electricity Readings
            </Typography>
          </Grid>
          {/* Electricity Readings */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Electricity Start Reading"
              type="number"
              value={electricityStartReading === undefined ? '' : electricityStartReading}
              onChange={(e) => setElectricityStartReading(e.target.value === '' ? undefined : parseFloat(e.target.value))}
              inputProps={getNumericInputProps(0)}
              helperText="Starting meter reading for electricity"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Electricity End Reading"
              type="number"
              value={electricityEndReading === undefined ? '' : electricityEndReading}
              onChange={(e) => setElectricityEndReading(e.target.value === '' ? undefined : parseFloat(e.target.value))}
              inputProps={getNumericInputProps(0)}
              helperText="Ending meter reading for electricity"
            />
          </Grid>
          {/* Submit Buttons */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => onCancel ? onCancel() : navigate('/utilities')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <CircularProgress size={24} /> : (isCreationDialog ? 'Create Reading' : 'Update Reading')}
              </Button>
            </Box>
          </Grid>
        </Grid>
        {/* Preview/Summary */}
        <Grid size={{ xs: 12, md: 4 }}>
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
                      💧 Water: {waterBill.consumption} units = {formatCurrency(waterBill.cost, 'EGP')}
                    </Typography>
                  )}
                  {electricityBill && (
                    <Typography variant="body2">
                      ⚡ Electricity: {electricityBill.consumption} units = {formatCurrency(electricityBill.cost, 'EGP')}
                    </Typography>
                  )}
                  {waterBill && electricityBill && (
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                      Total: {formatCurrency(waterBill.cost + electricityBill.cost, 'EGP')}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
            {selectedApartment?.village && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  Project Rates: Water {Number(selectedApartment.village.water_price)} EGP/unit, 
                  Electricity {Number(selectedApartment.village.electricity_price)} EGP/unit
                </Typography>
              </Alert>
            )}
          </Paper>
        </Grid>
        

      </Box>
    </LocalizationProvider>
  );
}
