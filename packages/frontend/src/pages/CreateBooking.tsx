import React, { useEffect, useState, useRef } from "react";
import { getNumericInputProps } from '../utils/numberUtils';
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
import ClearableSearchDropdown from '../components/ClearableSearchDropdown';

export interface CreateBookingProps {
  apartmentId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  lockApartment?: boolean;
  bookingId?: number; // Added for edit mode
  isEditMode?: boolean; // Flag to indicate edit mode
}

export default function CreateBooking({ apartmentId, onSuccess, onCancel, lockApartment, bookingId: propBookingId, isEditMode: propIsEditMode }: CreateBookingProps) {
  // Get ID from URL params for edit mode
  const { id: urlId } = useParams<{ id: string }>();
  
  // Determine if component is being used in dialog mode (has callback props)
  const isDialogMode = !!(onSuccess || onCancel);
  
  // Only use URL params when NOT in dialog mode to avoid picking up parent route params
  const bookingId = propBookingId || (!isDialogMode && urlId ? parseInt(urlId) : undefined);
  const isEditMode = propIsEditMode || (!isDialogMode && !!urlId);
  
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Data
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchingApartments, setSearchingApartments] = useState(false);
  const [apartmentSearchTerm, setApartmentSearchTerm] = useState('');
  const apartmentSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Owner cache to prevent infinite cycles and minimize API calls
  const [ownerCache, setOwnerCache] = useState<Record<number, User>>({});
  const pendingOwnerFetchRef = useRef<Record<number, boolean>>({});
  
  // Flag to prevent filter reset effects from running during initial booking data load
  const isInitialLoadRef = useRef(true);
  
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
        
        // Load initial apartments data with owner information
        const apartmentsPromise = apartmentService.getApartments({
          limit: 30,
          sort_by: 'created_at',
          sort_order: 'desc',
          // @ts-expect-error - 'include' may be supported by the API even if not typed
          include: 'owner' // Explicitly request owner data
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
        
        // Update owner cache with any owner data received
        const apartmentsWithOwners = apartmentsData.filter(apt => apt.owner);
        if (apartmentsWithOwners.length > 0) {
          setOwnerCache(prev => {
            const newCache = { ...prev };
            apartmentsWithOwners.forEach(apt => {
              if (apt.owner) {
                newCache[apt.id] = apt.owner;
              }
            });
            return newCache;
          });
        }
        
        // If in edit mode, load the booking data
        if (isEditMode && bookingId) {
          try {
            // Use getBookingWithRelatedData to ensure we get the full apartment object
            const bookingDataResponse = await bookingService.getBookingWithRelatedData(bookingId);
            const bookingData = bookingDataResponse.booking;
            
            // Update form data with booking information
            setFormData({
              apartment_id: bookingData.apartment_id,
              user_id: bookingData.user_id,
              user_name: bookingData.user?.name || '',
              user_type: bookingData.user_type === 'owner' ? 'owner' : 'renter',
              number_of_people: bookingData.number_of_people,
              arrival_date: new Date(bookingData.arrival_date),
              leaving_date: new Date(bookingData.leaving_date),
              status: bookingData.status,
              notes: bookingData.notes || '',
              person_name: bookingData.person_name || '',
              flightDetails: ''
            });
            
            // Set user search term for UI consistency
            setUserSearchTerm(bookingData.user?.name || '');
            
            // Extract flight details from notes if present
            if (bookingData.notes && bookingData.notes.includes('Flight Details:')) {
              const flightMatch = bookingData.notes.match(/Flight Details:\s*(.+)/);
              if (flightMatch) {
                setFormData(prev => ({
                  ...prev,
                  notes: bookingData.notes?.replace(/\n\nFlight Details:.*/, '') || '',
                  flightDetails: flightMatch[1].trim()
                }));
              }
            }
            
            // Ensure the apartment is in the apartments array for display
            if (bookingData.apartment) {
              // Normalize apartment to match frontend Apartment type expectations
              const payingStatusRaw = (bookingData.apartment as any).paying_status;
              const normalizePayingStatus = (status: any): 'transfer' | 'rent' | 'non-payer' => {
                if (status === 'rent' || status === 'paid_by_rent') return 'rent';
                if (status === 'non-payer' || status === 'non_payer') return 'non-payer';
                return 'transfer';
              };

              const normalizedApartment: Apartment = {
                id: bookingData.apartment.id,
                name: bookingData.apartment.name,
                village_id: bookingData.apartment.village_id,
                owner_id: bookingData.apartment.owner_id,
                phase: bookingData.apartment.phase,
                purchase_date: bookingData.apartment.purchase_date || '',
                paying_status_id: (bookingData.apartment as any).paying_status_id ?? 0,
                sales_status_id: (bookingData.apartment as any).sales_status_id ?? 0,
                // Provide safe defaults for backward-compat fields
                paying_status: normalizePayingStatus(payingStatusRaw),
                sales_status: (bookingData.apartment as any).sales_status ?? 'for sale',
                created_at: bookingData.apartment.created_at || new Date().toISOString(),
                updated_at: bookingData.apartment.updated_at || new Date().toISOString(),
                village: bookingData.apartment.village,
                owner: bookingData.apartment.owner
              };
              const apartmentExists = apartmentsData.find(apt => apt.id === normalizedApartment.id);
              if (!apartmentExists) {
                // Add the apartment to the array if it's not already there
                apartmentsData = [normalizedApartment, ...apartmentsData];
              }
              
              // Set village and phase from apartment data
              setSelectedVillageId(String(bookingData.apartment.village_id));
              setSelectedPhase(String(bookingData.apartment.phase));
              
              // Set apartment search term to display the apartment name in the disabled field
              const apartmentDisplayName = bookingData.apartment.village?.name 
                ? `${bookingData.apartment.name} (${bookingData.apartment.village.name}, Phase ${bookingData.apartment.phase})`
                : `${bookingData.apartment.name} (Phase ${bookingData.apartment.phase})`;
              setApartmentSearchTerm(apartmentDisplayName);
            } else if (bookingData.apartment_id) {
              // Fallback: if apartment object is missing but apartment_id exists, fetch it
              try {
                const specificApartment = await apartmentService.getApartmentById(bookingData.apartment_id);
                const apartmentExists = apartmentsData.find(apt => apt.id === specificApartment.id);
                if (!apartmentExists) {
                  apartmentsData = [specificApartment, ...apartmentsData];
                }
                setSelectedVillageId(String(specificApartment.village_id));
                setSelectedPhase(String(specificApartment.phase));
                const apartmentDisplayName = specificApartment.village?.name 
                  ? `${specificApartment.name} (${specificApartment.village.name}, Phase ${specificApartment.phase})`
                  : `${specificApartment.name} (Phase ${specificApartment.phase})`;
                setApartmentSearchTerm(apartmentDisplayName);
              } catch (aptErr) {
                console.error('Error fetching apartment:', aptErr);
                // Still set the search term with just the ID as fallback
                setApartmentSearchTerm(`Apartment ${bookingData.apartment_id}`);
              }
            }
            
            // Update apartments state with the potentially updated array
            setApartments(apartmentsData);
            
            // If user is owner, ensure owner data is in cache
            if (bookingData.user_type === 'owner' && bookingData.user) {
              setOwnerCache(prev => ({
                ...prev,
                [bookingData.apartment_id]: bookingData.user!
              }));
            }
            
            // Clear initial load flag after a short delay to allow effects to settle
            // This ensures the filter effects don't reset the prefilled values
            setTimeout(() => {
              isInitialLoadRef.current = false;
            }, 100);
          } catch (err) {
            console.error('Error loading booking data:', err);
            setError('Failed to load booking data for editing');
          }
        } else if (apartmentId && formData.user_type === 'owner') {
          // If not in edit mode but apartmentId is provided and user type is owner, prefill owner data
          prefillOwnerData(apartmentId);
          // Not in edit mode, allow filter resets immediately
          isInitialLoadRef.current = false;
        } else {
          // Not in edit mode and no locked apartment, allow filter resets immediately
          isInitialLoadRef.current = false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [apartmentId, isEditMode, bookingId]);

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
      
      // Only reset phase and apartment when user changes village filter (not during initial load)
      if (!isInitialLoadRef.current) {
        setSelectedPhase('');
        setFormData(prev => ({ ...prev, apartment_id: 0 }));
        // Trigger apartment search with new village filter
        handleApartmentSearch('');
      }
    } else {
      setAvailablePhases([]);
      
      // Only reset when user changes village filter (not during initial load)
      if (!isInitialLoadRef.current) {
        setSelectedPhase('');
        setFormData(prev => ({ ...prev, apartment_id: 0 }));
        // Reset apartment search without filters
        handleApartmentSearch('');
      }
    }
  }, [selectedVillageId, villages]);

  // Reset apartment when phase changes and trigger search
  useEffect(() => {
    // Only reset apartment when user changes phase filter (not during initial load)
    if (!isInitialLoadRef.current) {
      setFormData(prev => ({ ...prev, apartment_id: 0 }));
      
      // Trigger apartment search with updated phase filter
      if (selectedVillageId) {
        handleApartmentSearch('');
      }
    }
  }, [selectedPhase]);

  // We'll use the apartments list directly, since filtering is now handled server-side
  // But keep the filteredApartments variable for compatibility with existing code
  const filteredApartments = apartments;

  // Function to get owner data for an apartment
  const getOwnerForApartment = async (apartmentId: number): Promise<User | undefined> => {
    // Check cache first
    if (ownerCache[apartmentId]) {
      console.log('Using cached owner data for apartment', apartmentId, ownerCache[apartmentId]);
      return ownerCache[apartmentId];
    }
    
    // Check if there's a pending request
    if (pendingOwnerFetchRef.current[apartmentId]) {
      console.log('Owner fetch already in progress for apartment', apartmentId);
      return undefined; // Will be handled when request completes
    }
    
    // Check if the apartment already has owner data in the apartments array
    const apartmentWithOwner = apartments.find(apt => apt.id === apartmentId && apt.owner);
    if (apartmentWithOwner?.owner) {
      console.log('Found owner data in apartments array', apartmentWithOwner.owner);
      // Update cache
      setOwnerCache(prev => ({
        ...prev,
        [apartmentId]: apartmentWithOwner.owner!
      }));
      return apartmentWithOwner.owner;
    }
    
    // Need to fetch owner data
    console.log('Fetching owner data for apartment', apartmentId);
    try {
      pendingOwnerFetchRef.current[apartmentId] = true;
      const apartmentDetails = await apartmentService.getApartmentById(apartmentId);
      pendingOwnerFetchRef.current[apartmentId] = false;
      
      if (apartmentDetails?.owner) {
        console.log('Fetched owner data successfully', apartmentDetails.owner);
        // Update cache
        setOwnerCache(prev => ({
          ...prev,
          [apartmentId]: apartmentDetails.owner!
        }));
        return apartmentDetails.owner;
      } else {
        console.log('No owner found for apartment', apartmentId);
      }
    } catch (error) {
      console.error('Error fetching apartment details:', error);
      pendingOwnerFetchRef.current[apartmentId] = false;
    }
    
    return undefined;
  };
  
  // Function to prefill owner data
  const prefillOwnerData = async (apartmentId: number) => {
    if (!apartmentId) return;
    
    const owner = await getOwnerForApartment(apartmentId);
    if (owner) {
      // First update the form data
      setFormData(prev => {
        // Only update if user type is still 'owner' and apartment hasn't changed
        if (prev.user_type === 'owner' && prev.apartment_id === apartmentId) {
          return {
            ...prev,
            user_id: owner.id,
            user_name: owner.name
          };
        }
        return prev;
      });
      
      // Update user search term for UI consistency
      setUserSearchTerm(owner.name);
      
      // Update the apartments array to ensure the owner data is available for the TextField
      setApartments(prevApartments => {
        return prevApartments.map(apt => {
          if (apt.id === apartmentId) {
            // Make sure we don't lose any existing data
            return {
              ...apt,
              owner: owner
            };
          }
          return apt;
        });
      });
    }
  };
  
  // Effect to handle owner prefill when apartment or user type changes
  useEffect(() => {
    // Only proceed if user type is owner and apartment is selected
    if (formData.user_type === 'owner' && formData.apartment_id) {
      prefillOwnerData(formData.apartment_id);
    }
  }, [formData.apartment_id, formData.user_type]);

  // When lockApartment and apartmentId are set, set village and phase
  useEffect(() => {
    if (lockApartment && apartmentId && apartments.length > 0) {
      const apt = apartments.find(a => a.id === apartmentId);
      if (apt) {
        setSelectedVillageId(String(apt.village_id));
        setSelectedPhase(String(apt.phase));
        setFormData(prev => ({ ...prev, apartment_id: apt.id }));
        // Owner prefill will be handled by the main useEffect
      }
    }
  }, [lockApartment, apartmentId, apartments]);

  // This useEffect is no longer needed as the owner prefill is handled by the consolidated function
  // The main useEffect will handle all cases including when user type changes to 'owner'

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
        notes: formData.notes + (formData.flightDetails ? `\n\nFlight Details: ${formData.flightDetails}` : ''),
        person_name: formData.person_name
      };

      // Add user data based on type
      if (formData.user_type === 'owner') {
        bookingData.user_id = formData.user_id;
        bookingData.user_type = 'owner';
      } else {
        // For renter bookings, check if it's an existing user or new user
        if (formData.user_id && formData.user_id > 0) {
          // Existing user selected
          bookingData.user_id = formData.user_id;
          bookingData.user_type = 'renter';
        } else {
          // New user to be created
          bookingData.user_name = formData.user_name.trim();
          bookingData.user_type = 'renter';
        }
      }

      if (isEditMode && bookingId) {
        // Update existing booking
        await bookingService.updateBooking(bookingId, bookingData);
        
        if (onSuccess) {
          onSuccess();
        } else {
          navigate(`/bookings/${bookingId}?success=true&message=Booking%20updated%20successfully`);
        }
      } else {
        // Create new booking
        const newBooking = await bookingService.createBooking(bookingData);
        
        // Ensure ApartmentDetails refreshes bookings after creation
        if (onSuccess) {
          // Optionally, you could fetch the latest bookings here if needed
          onSuccess();
        } else {
          navigate(`/bookings/${newBooking.id}?success=true&message=Booking%20created%20successfully`);
        }
      }
    } catch (err: any) {
      // If the error is an Axios error with a response and status 409, show the backend message
      if (err.response && err.response.status === 409 && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} booking`);
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
        limit: 100,
        include: 'owner' // Explicitly request owner data
      };
      
      // For server-side search, we only want to search if we have at least 2 characters
      // or if the search is empty (which means show all with filters)
      if (searchQuery.length >= 2 || searchQuery === '') {
        filters.search = searchQuery;
      } else if (searchQuery.length > 0 && searchQuery.length < 2) {
        // If less than 2 characters and not empty, don't perform search
        return;
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
      
      // Update owner cache with any owner data received
      const apartmentsWithOwners = result.data.filter(apt => apt.owner);
      if (apartmentsWithOwners.length > 0) {
        setOwnerCache(prev => {
          const newCache = { ...prev };
          apartmentsWithOwners.forEach(apt => {
            if (apt.owner) {
              newCache[apt.id] = apt.owner;
            }
          });
          return newCache;
        });
      }
    } catch (err) {
      console.error('Error searching for apartments:', err);
      // Don't show error message during search
    } finally {
      setSearchingApartments(false);
    }
  };
  
  // Handle apartment input changes with better empty input handling
  const handleApartmentInputChange = (inputText: string) => {
    // Update the search term state immediately for UI responsiveness
    setApartmentSearchTerm(inputText);
    
    // Handle explicit clearing of the input field
    if (inputText === '') {
      // Keep the current filters but don't reset the selection
      // This allows users to clear the search text without losing their selection
      handleApartmentSearch('');
      return;
    }
    
    // With server-side search enabled, the SearchableDropdown component will handle
    // calling the onServerSearch function when appropriate
    // We still need to update the search term for UI consistency
  };
  
  // Handle clearing the apartment selection
  const handleClearApartment = () => {
    // Clear both the search term and the selection
    setApartmentSearchTerm('');
    setFormData(prev => ({ ...prev, apartment_id: 0 }));
    // Refresh the apartment list with current filters but empty search
    handleApartmentSearch('');
  };

  // Handle server-side search for users
  const handleUserSearch = async (searchQuery: string): Promise<void> => {
    try {
      setSearchingUsers(true);
      setUserSearchTerm(searchQuery);
      
      // Only search if we have at least 1 character
      // For users, we still want minimum 1 character to avoid loading all users
      const filters: any = {
        limit: 30
      };
      
      if (searchQuery.length >= 1) {
        filters.search = searchQuery;
      }
      
      const result = await userService.getUsers(filters);
      setUsers(result.data);
    } catch (err) {
      console.error('Error searching for users:', err);
      // Don't show error message during search
    } finally {
      setSearchingUsers(false);
    }
  };
  
  // Handle user input changes
  const handleUserInputChange = (inputText: string) => {
    // Update the search term state immediately
    setUserSearchTerm(inputText);
    
    // Update the user_name in form data to match what the user is typing
    // This is important for freeSolo mode where users can enter custom names
    setFormData(prev => ({ ...prev, user_name: inputText }));
    
    // Handle explicit clearing of the input field
    if (inputText === '') {
      // Allow clearing the field without losing selection
      handleUserSearch('');
      return;
    }
    
    // Debounce the search
    setTimeout(() => {
      handleUserSearch(inputText);
    }, 300);
  };
  
  // Handle clearing the user selection
  const handleClearUser = () => {
    setUserSearchTerm('');
    setFormData(prev => ({ ...prev, user_id: 0, user_name: '' }));
    handleUserSearch('');
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
              {isEditMode ? 'Edit Booking' : 'Create New Booking'}
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
                  disabled={!!lockApartment || isEditMode}
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
              <FormControl fullWidth disabled={!selectedVillageId || !!lockApartment || isEditMode}>
                <InputLabel>Phase</InputLabel>
                <Select
                  value={selectedPhase}
                  label="Phase"
                  onChange={e => setSelectedPhase(String(e.target.value))}
                  disabled={!selectedVillageId || !!lockApartment || isEditMode}
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
              <ClearableSearchDropdown
                options={filteredApartments.map(apartment => ({
                  id: apartment.id,
                  label: `${apartment.name} (${apartment.village?.name}, Phase ${apartment.phase})`,
                  name: apartment.name,
                  village: apartment.village,
                  phase: apartment.phase
                }))}
                value={formData.apartment_id || null}
                onChange={(value) => {
                  const newValue = value as number || 0;
                  setFormData(prev => ({ 
                    ...prev, 
                    apartment_id: newValue,
                    // Clear user data if switching apartments and user type is 'owner'
                    ...(prev.apartment_id !== newValue && prev.user_type === 'owner' ? { user_id: 0, user_name: '' } : {})
                  }));
                  // If value is cleared, ensure the search term is also cleared
                  if (!newValue) {
                    setApartmentSearchTerm('');
                  }
                  // Note: We don't need to call prefillOwnerData here
                  // The useEffect will handle it to avoid duplicate calls
                }}
                onClearSelection={handleClearApartment}
                label="Related Apartment"
                placeholder="Type to search apartments by name..."
                required
                disabled={lockApartment || isEditMode}
                loading={searchingApartments}
                serverSideSearch={true}
                onInputChange={handleApartmentInputChange}
                onServerSearch={handleApartmentSearch}
                inputValue={apartmentSearchTerm}
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
                helperText="Type to search or filter by project and phase"
                clearable={true}
                showClearButton={formData.apartment_id > 0}
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
                    setFormData(prev => ({
                      ...prev,
                      user_type: newUserType,
                      // Clear user data when switching to renter
                      ...(newUserType === 'renter' ? { user_id: 0, user_name: '' } : {})
                    }));
                    
                    // Note: We don't need to call prefillOwnerData here
                    // The useEffect will handle it to avoid duplicate calls
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
                  // Check both the apartments array and the owner cache for the owner data
                  const selectedApartment = apartments.find(apt => apt.id === formData.apartment_id);
                  const cachedOwner = ownerCache[formData.apartment_id];
                  const ownerName = selectedApartment?.owner?.name || cachedOwner?.name || formData.user_name || '';
                  const ownerEmail = selectedApartment?.owner?.email || cachedOwner?.email || '';
                  
                  return (
                    <TextField
                      fullWidth
                      required
                      label="User Name (Owner)"
                      value={ownerName}
                      disabled
                      helperText={ownerName ? `Apartment owner: ${ownerEmail}` : 'Select an apartment to prefill owner'}
                    />
                  );
                })()
              ) : (
                <ClearableSearchDropdown
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
                        setUserSearchTerm(selectedUser.name);
                      }
                    } else {
                      setFormData(prev => ({ ...prev, user_id: 0 }));
                      // Don't clear user_name here as the user might be typing a custom name
                    }
                  }}
                  onClearSelection={handleClearUser}
                  label="User Name"
                  placeholder="Type at least 1 character to search users..."
                  required
                  freeSolo={true}
                  onInputChange={handleUserInputChange}
                  inputValue={userSearchTerm}
                  loading={searchingUsers}
                  serverSideSearch={false}
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
                  helperText="Type to search users or enter a new name"
                  clearable={true}
                  showClearButton={formData.user_id > 0}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled' }))}
                >
                  <MenuItem value="Booked">Booked</MenuItem>
                  <MenuItem value="Checked In">Checked In</MenuItem>
                  <MenuItem value="Checked Out">Checked Out</MenuItem>
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
                  {submitting ? <CircularProgress size={24} /> : (isEditMode ? 'Update Booking' : 'Create Booking')}
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