import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  CircularProgress,
  FormHelperText,
  Container
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import { emailService } from '../services/emailService';
import type { CreateEmailRequest, UpdateEmailRequest, Email, UIEmailType, BackendEmailType } from '../services/emailService';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { villageService } from '../services/villageService';
import type { Village } from '../services/villageService';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';
import { userService } from '../services/userService';
import type { User } from '../services/userService';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import SearchableDropdown from '../components/SearchableDropdown';
import ClearableSearchDropdown from '../components/ClearableSearchDropdown';

export interface CreateEmailProps {
  apartmentId?: number;
  bookingId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  lockApartment?: boolean;
}

const CreateEmail: React.FC<CreateEmailProps> = ({ apartmentId, bookingId, onSuccess, onCancel, lockApartment }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // Only use view/edit mode if id is present (for details page). For quick action, always editable.
  const isEditing = Boolean(id) && location.pathname.includes('/edit');
  const isViewing = Boolean(id) && !location.pathname.includes('/edit');
  
  // Determine if this is a quick action (used from dialog)
  const isQuickAction = Boolean(onSuccess || onCancel);
  
  // Override mode detection for quick actions - always in create mode
  const actuallyViewing = isViewing && !isQuickAction;
  const actuallyEditing = isEditing && !isQuickAction;
  
  // Check permissions
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Data
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [availablePhases, setAvailablePhases] = useState<number[]>([]);
  const [apartmentSearchTerm, setApartmentSearchTerm] = useState('');

  // Patch: extend CreateEmailRequest to allow apartment_id: number | undefined
  type CreateEmailRequestWithOptionalApartment = Omit<CreateEmailRequest, 'apartment_id'> & { apartment_id?: number };
  const [formData, setFormData] = useState<CreateEmailRequestWithOptionalApartment>({
    apartment_id: apartmentId ?? undefined,
    booking_id: bookingId ?? undefined,
    date: new Date().toISOString().split('T')[0],
    from: currentUser?.email || '',
    to: '',
    subject: '',
    content: '',
    type: 'inquiry' as BackendEmailType,
    status: 'pending'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Selected date for date picker
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Check admin access - only navigate if not used as quick action
  useEffect(() => {
    if (!isAdmin && !isQuickAction) {
      navigate('/unauthorized');
    }
  }, [currentUser?.role, navigate, isQuickAction, isAdmin]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Load apartments, bookings, users, villages
        const [apartmentsData, bookingsData, usersData, villagesData] = await Promise.all([
          apartmentService.getApartments({ limit: 100 }),
          bookingService.getBookings({ limit: 100 }),
          userService.getUsers({ limit: 100 }),
          villageService.getVillages({ limit: 100 })
        ]);
        setApartments(apartmentsData.data);
        setBookings(bookingsData.bookings);
        setUsers(usersData.data);
        setVillages(villagesData.data);
        // Only fetch email details if id is present AND in edit or view mode (not quick action/modal)
        if (id && !onSuccess && !onCancel) {
          setLoading(true);
          const emailData = await emailService.getEmailById(parseInt(id));
          setFormData({ ...emailData });
        } else {
          // Prefill apartment if provided (create/quick action mode)
          if (apartmentId) {
            setFormData(prev => ({ 
              ...prev, 
              apartment_id: apartmentId,
              // Also set booking ID if provided
              ...(bookingId ? { booking_id: bookingId } : {})
            }));
            
            // If we have the apartment data, also set the project and phase filters
            const apt = apartments.find(a => a.id === apartmentId);
            if (apt && apt.village?.id && lockApartment) {
              setProjectFilter(apt.village.id.toString());
              if (apt.phase) {
                setPhaseFilter(apt.phase.toString());
              }
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  // Note: We're intentionally excluding 'apartments' from the dependency array to avoid an infinite loop,
  // as we update 'apartments' inside this effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, apartmentId, bookingId, lockApartment, onCancel, onSuccess]);

  // Update available phases when project changes
  useEffect(() => {
    if (projectFilter) {
      const village = villages.find(v => v.id === Number(projectFilter));
      if (village) {
        setAvailablePhases(Array.from({ length: village.phases }, (_, i) => i + 1));
      } else {
        setAvailablePhases([]);
      }
      
      // Only reset phase filter and apartment if we're not in locked apartment mode
      if (!lockApartment) {
        setPhaseFilter('');
        setFormData(prev => ({ ...prev, apartment_id: undefined }));
      }
      
      // Load apartments based on the selected project
      loadFilteredApartments();
    } else {
      setAvailablePhases([]);
      
      // Only reset phase filter and apartment if we're not in locked apartment mode
      if (!lockApartment) {
        setPhaseFilter('');
        setFormData(prev => ({ ...prev, apartment_id: undefined }));
      }
      
      // Load all apartments when no project is selected
      loadFilteredApartments();
    }
  }, [projectFilter, villages, lockApartment]);

  // Reset apartment when phase changes
  useEffect(() => {
    // Only reset apartment if we're not in locked apartment mode
    if (!lockApartment) {
      setFormData(prev => ({ ...prev, apartment_id: undefined }));
    }
    
    // Load apartments based on the selected phase
    if (projectFilter) {
      loadFilteredApartments();
    }
  }, [phaseFilter, lockApartment, projectFilter]);

  // When lockApartment and apartmentId are set, set project and phase filters and lock them
  useEffect(() => {
    if (lockApartment && apartmentId && apartments.length > 0) {
      const apt = apartments.find(a => a.id === apartmentId);
      if (apt && apt.village?.id) {
        // Set project filter first
        setProjectFilter(apt.village.id.toString());
        
        // Then set phase filter if available
        if (apt.phase) {
          // Use setTimeout to ensure this happens after the project filter has been processed
          setTimeout(() => {
            setPhaseFilter(apt.phase?.toString() || '');
          }, 0);
        }
        
        // Ensure the apartment is selected in the form data
        // Also preserve booking ID if it's provided
        setFormData(prev => ({ 
          ...prev, 
          apartment_id: apartmentId,
          ...(bookingId !== undefined ? { booking_id: bookingId } : {})
        }));
      }
    }
  }, [lockApartment, apartmentId, apartments, bookingId]);

  // Ensure the booking exists in the bookings list
  useEffect(() => {
    if (bookingId && bookings.length > 0 && !bookings.find(b => b.id === bookingId)) {
      // If the booking isn't in the list, fetch it individually
      const fetchBooking = async () => {
        try {
          const booking = await bookingService.getBookingById(bookingId);
          setBookings(prev => [...prev, booking]);
        } catch (error) {
          console.error("Failed to fetch booking:", error);
        }
      };
      fetchBooking();
    }
  }, [bookingId, bookings]);
  
  // Load bookings when apartment changes
  useEffect(() => {
    if (typeof formData.apartment_id === 'number') {
      handleBookingSearch('');
    }
  }, [formData.apartment_id]);

  // Filter apartments based on selected project and phase (client-side)
  const getFilteredApartments = () => {
    let filtered = apartments;
    if (projectFilter) {
      const selectedVillageId = Number(projectFilter);
      filtered = filtered.filter(apt => apt.village?.id === selectedVillageId);
    }
    if (phaseFilter) {
      const selectedPhase = Number(phaseFilter);
      filtered = filtered.filter(apt => apt.phase === selectedPhase);
    }
    // Only return apartments with a valid id
    return filtered.filter(apt => typeof apt.id === 'number');
  };
  
  // State for apartment search loading
  const [searchLoading, setSearchLoading] = useState(false);
  
  // State for booking search
  const [searchingBookings, setSearchingBookings] = useState(false);
  const [bookingSearchTerm, setBookingSearchTerm] = useState('');
  const bookingSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch apartments with server-side filtering
  const searchApartments = async (searchTerm: string): Promise<void> => {
    setApartmentSearchTerm(searchTerm);
    
    try {
      // Build filters object including search term, project and phase
      const filters: any = { 
        search: searchTerm,
        limit: 100 
      };
      
      // Add project/village filter if selected
      if (projectFilter) {
        filters.village_id = Number(projectFilter);
      }
      
      // Add phase filter if selected
      if (phaseFilter) {
        filters.phase = Number(phaseFilter);
      }
      
      // Fetch apartments with server-side filtering
      const response = await apartmentService.getApartments(filters);
      setApartments(response.data.filter(apt => typeof apt.id === 'number'));
    } catch (error) {
      console.error('Error fetching apartments:', error);
      setApartments([]);
    }
  };
  
  // Custom search function to bypass 2-char requirement and respond to field clicks
  const handleApartmentInputChange = (text: string) => {
    // Update the search term state immediately for UI responsiveness
    setApartmentSearchTerm(text);
    
    // Handle explicit clearing of the input field
    if (text === '') {
      // Keep the current filters but don't reset the selection
      // This allows users to clear the search text without losing their selection
      loadFilteredApartments().finally(() => setSearchLoading(false));
      return;
    }
    
    // Always search when typing (1+ characters)
    // This ensures the dropdown shows filtered results when clicked, even before typing
    setSearchLoading(true);
    
    // Add slight delay for better UX and debounce
    setTimeout(() => {
      // Normal search with text
      searchApartments(text).finally(() => setSearchLoading(false));
    }, 300);
  };
  
  // Handle clearing the apartment selection
  const handleClearApartment = () => {
    // Clear both the search term and the selection
    setApartmentSearchTerm('');
    setFormData(prev => ({ ...prev, apartment_id: undefined }));
    // Refresh the apartment list with current filters but empty search
    loadFilteredApartments();
  };
  
  // Load apartments based on current project/phase filters
  const loadFilteredApartments = async () => {
    setSearchLoading(true);
    try {
      // Build filters based on current project/phase selections
      const filters: any = { 
        limit: 100
      };
      
      // Add project/village filter if selected
      if (projectFilter) {
        filters.village_id = Number(projectFilter);
      }
      
      // Add phase filter if selected
      if (phaseFilter) {
        filters.phase = Number(phaseFilter);
      }
      
      // Always include search term regardless of length
      // This ensures filters work even with empty search terms
      filters.search = apartmentSearchTerm || '';
      
      // Fetch apartments with server-side filtering
      const response = await apartmentService.getApartments(filters);
      setApartments(response.data.filter(apt => typeof apt.id === 'number'));
    } catch (error) {
      console.error('Error fetching apartments:', error);
    } finally {
      setSearchLoading(false);
    }
  };
  
  // Handle field focus - load apartments based on current filters
  const handleApartmentFieldFocus = () => {
    loadFilteredApartments();
  };

  // Handle form changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;

    if (name === 'apartment_id') {
      // When apartment changes, explicitly set booking_id to null (not undefined)
      // to ensure the SearchableDropdown is properly cleared
      setFormData(prev => ({
        ...prev,
        apartment_id: value ? parseInt(value) : undefined as any,
        // Preserve booking_id if it's locked (quick action with bookingId), otherwise clear it
        booking_id: bookingFieldLocked ? prev.booking_id : undefined
      }));
    } else if (name === 'booking_id') {
      setFormData(prev => ({
        ...prev,
        booking_id: value ? parseInt(value) : undefined
      }));
    } else if (name === 'type') {
      const backendType = emailService.mapUITypeToBackend(value as UIEmailType);
      setFormData(prev => ({ ...prev, type: backendType }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      setFormData(prev => ({ 
        ...prev, 
        date: date.toISOString().split('T')[0]
      }));
      
      // Clear date error
      if (formErrors.date) {
        setFormErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.date;
          return newErrors;
        });
      }
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.apartment_id) errors.apartment_id = 'Apartment is required';
    if (!formData.from) errors.from = 'Sender is required';
    if (!formData.to) errors.to = 'Recipient is required';
    if (!formData.subject) errors.subject = 'Subject is required';
    if (!formData.content) errors.content = 'Content is required';
    if (!formData.date) errors.date = 'Date is required';
    if (!formData.status) errors.status = 'Status is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.from && !emailRegex.test(formData.from)) {
      errors.from = 'Please enter a valid email address';
    }
    if (formData.to && !emailRegex.test(formData.to)) {
      errors.to = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle server-side search for bookings
  const handleBookingSearch = async (searchQuery: string): Promise<void> => {
    if (typeof formData.apartment_id !== 'number') return;

    try {
      setSearchingBookings(true);
      setBookingSearchTerm(searchQuery);
      
      // Build filters based on apartment and search query
      const filters: any = {
        apartment_id: formData.apartment_id,
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
      setBookings(sortedBookings);
    } catch (err) {
      console.error('Error searching for bookings:', err);
      // Don't show error message during search
    } finally {
      setSearchingBookings(false);
    }
  };

  // Handle booking input changes
  const handleBookingInputChange = (inputText: string) => {
    // Update the search term state immediately for UI responsiveness
    setBookingSearchTerm(inputText);
    
    // Handle explicit clearing of the input field
    if (inputText === '') {
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
      handleBookingSearch(inputText);
    }, 300); // Increased delay for better typing experience
  };
  
  // Handle clearing the booking selection
  const handleClearBooking = () => {
    // Clear both the search term and the selection
    setBookingSearchTerm('');
    setFormData(prev => ({ ...prev, booking_id: undefined }));
    // Refresh the booking list with current apartment filter but empty search
    handleBookingSearch('');
  };
  
  // Get bookings for selected apartment
  const getRelatedBookings = () => {
    if (typeof formData.apartment_id !== 'number' || !bookings || !Array.isArray(bookings)) {
      return [];
    }
    return bookings.filter(booking => booking.apartment_id === formData.apartment_id);
  };

  // Get all bookings for display (including the current email's booking)
  const getAllBookingsForDisplay = () => {
    const relatedBookings = getRelatedBookings();
    // If we're viewing an existing email and it has a booking, make sure it's included
    if (actuallyViewing && typeof formData.booking_id === 'number') {
      const currentBooking = bookings.find(booking => booking.id === formData.booking_id);
      if (currentBooking && !relatedBookings.find(b => b.id === currentBooking.id)) {
        relatedBookings.push(currentBooking);
      }
    }
    return relatedBookings;
  };

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      
      if (actuallyEditing && id) {
        // Update existing email
        const updateData: UpdateEmailRequest = {
          apartment_id: formData.apartment_id,
          booking_id: formData.booking_id,
          date: formData.date,
          from: formData.from,
          to: formData.to,
          subject: formData.subject,
          content: formData.content,
          type: formData.type,
          status: formData.status
        };
        await emailService.updateEmail(parseInt(id), updateData);
      } else {
        // Create new email (quick action)
        if (typeof formData.apartment_id !== 'number') {
          throw new Error('Apartment is required');
        }
        const createData: CreateEmailRequest = {
          apartment_id: formData.apartment_id,
          date: formData.date,
          from: formData.from,
          to: formData.to,
          subject: formData.subject,
          content: formData.content,
          type: formData.type,
          ...(formData.booking_id ? { booking_id: formData.booking_id } : {}),
          status: formData.status
        };
        await emailService.createEmail(createData);
      }
      
      setSaveSuccess(true);
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate back to emails list after a short delay
        setTimeout(() => {
          navigate('/emails');
        }, 1500);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save email');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/emails');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await emailService.deleteEmail(parseInt(id));
      setDeleteDialogOpen(false);
      navigate('/emails?success=true&message=Email%20deleted%20successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete email');
    } finally {
      setSubmitting(false);
    }
  };

  // In create/quick action mode (no id), fields are always editable. In view mode, lock fields only in details page.
  const fieldsLocked = actuallyViewing && !onSuccess && !onCancel;

  // Apartment field: lock if lockApartment is true and apartmentId is provided
  // Also lock if in view mode (details page)
  const apartmentFieldLocked = (fieldsLocked || (lockApartment && apartmentId !== undefined));
  
  // Determine if booking field should be locked
  const bookingFieldLocked = fieldsLocked || (bookingId !== undefined && isQuickAction);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error if non-admin user tries to access quick action mode
  if (isQuickAction && !isAdmin) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          You do not have permission to create emails. Only administrators can create emails.
        </Alert>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleBack}>
            Close
          </Button>
        </Box>
      </Container>
    );
  }

  const content = (
    <Box sx={{ width: '100%', mt: isQuickAction ? 0 : 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {id ? (actuallyViewing ? 'View Email' : actuallyEditing ? 'Edit Email' : 'Create New Email') : 'Create New Email'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Email {actuallyEditing ? 'updated' : 'created'} successfully! Redirecting...
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Date */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <DatePicker
                  label="Date *"
                  value={selectedDate}
                  onChange={handleDateChange}
                  disabled={fieldsLocked}
                  format="dd/MM/yyyy"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!formErrors.date,
                      helperText: formErrors.date,
                      required: true
                    }
                  }}
                />
              </Grid>
              {/* Email Type */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth error={!!formErrors.type} required>
                  <InputLabel>Email Type</InputLabel>
                  <Select
                    name="type"
                    value={emailService.getEmailTypeDisplayName(formData.type)}
                    onChange={handleSelectChange}
                    label="Email Type *"
                    disabled={fieldsLocked}
                  >
                    {emailService.getEmailTypeOptions().map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.type && <FormHelperText>{formErrors.type}</FormHelperText>}
                </FormControl>
              </Grid>
              {/* Status */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth error={!!formErrors.status} required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleSelectChange}
                    label="Status *"
                    disabled={fieldsLocked}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                  {formErrors.status && <FormHelperText>{formErrors.status}</FormHelperText>}
                </FormControl>
              </Grid>
              {/* Project (Village) */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Project</InputLabel>
                  <Select
                    value={projectFilter}
                    label="Project"
                    onChange={e => {
                      setProjectFilter(e.target.value);
                    }}
                    disabled={!!lockApartment}
                  >
                    <MenuItem value="">
                      <em>All Projects</em>
                    </MenuItem>
                    {villages.map(village => (
                      <MenuItem key={village.id} value={village.id.toString()}>{village.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {/* Phase */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Phase</InputLabel>
                  <Select
                    value={phaseFilter}
                    label="Phase"
                    onChange={e => {
                      setPhaseFilter(e.target.value);
                    }}
                    disabled={!projectFilter || !!lockApartment}
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
              {/* Apartment */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <ClearableSearchDropdown
                  options={getFilteredApartments().map(apartment => ({
                    id: apartment.id,
                    label: `${apartment.name} - ${apartment.village?.name} (Phase ${apartment.phase})`,
                    name: apartment.name,
                    village: apartment.village,
                    phase: apartment.phase
                  }))}
                  value={typeof formData.apartment_id === 'number' ? formData.apartment_id : null}
                  onChange={(value) => handleSelectChange({ target: { name: 'apartment_id', value: value?.toString() || '' } })}
                  onClearSelection={handleClearApartment}
                  label="Related Apartment"
                  placeholder={projectFilter && phaseFilter 
                    ? `Search apartments in ${villages.find(v => v.id === Number(projectFilter))?.name || ''} Phase ${phaseFilter}...` 
                    : projectFilter 
                      ? `Search apartments in ${villages.find(v => v.id === Number(projectFilter))?.name || ''}...` 
                      : "Search apartments by name or village..."}
                  required
                  disabled={apartmentFieldLocked}
                  error={!!formErrors.apartment_id}
                  helperText={formErrors.apartment_id || "Showing apartments based on selected filters"}
                  getOptionLabel={(option) => option.label}
                  onInputChange={handleApartmentInputChange}
                  loading={searchLoading}
                  inputValue={apartmentSearchTerm}
                  freeSolo={false}
                  serverSideSearch={false}
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
                  showClearButton={typeof formData.apartment_id === 'number'}
                />
              </Grid>
              {/* Booking (Optional) */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <ClearableSearchDropdown
                  options={[
                    { id: '', label: 'No related booking', name: 'No related booking' },
                    ...getAllBookingsForDisplay().map(booking => ({
                      id: booking.id,
                      label: `Booking #${booking.id} - ${booking.user?.name} (${booking.user_type})`,
                      name: booking.user?.name || 'Unknown',
                      user_type: booking.user_type,
                      booking_id: booking.id,
                      arrival_date: booking.arrival_date,
                      leaving_date: booking.leaving_date
                    }))
                  ]}
                  value={typeof formData.booking_id === 'number' ? formData.booking_id : null}
                  onChange={(value) => handleSelectChange({ target: { name: 'booking_id', value: value?.toString() || '' } })}
                  onClearSelection={handleClearBooking}
                  label="Related Booking (Optional)"
                  placeholder="Search bookings by user name..."
                  disabled={bookingFieldLocked || !formData.apartment_id}
                  error={!!formErrors.booking_id}
                  helperText={formErrors.booking_id || (bookingFieldLocked && bookingId ? 'Booking is locked for this action' : !formData.apartment_id ? 'Select an apartment first to see related bookings' : getAllBookingsForDisplay().length === 0 ? 'No bookings found for this apartment' : '')}
                  getOptionLabel={(option) => option.label}
                  key={`booking-dropdown-${formData.apartment_id}`}
                  loading={searchingBookings}
                  serverSideSearch={false}
                  onInputChange={handleBookingInputChange}
                  inputValue={bookingSearchTerm}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body1">{option.name}</Typography>
                        {option.user_type && (
                          <Typography variant="body2" color="text.secondary">
                            Booking #{option.booking_id} ({option.user_type})
                            {option.arrival_date && option.leaving_date && (
                              <> - {new Date(option.arrival_date).toLocaleDateString()} to {new Date(option.leaving_date).toLocaleDateString()}</>
                            )}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  )}
                  clearable={true}
                  showClearButton={typeof formData.booking_id === 'number'}
                />
              </Grid>
              {/* From */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="from"
                  label="From *"
                  type="email"
                  value={formData.from}
                  onChange={handleInputChange}
                  error={!!formErrors.from}
                  helperText={formErrors.from}
                  fullWidth
                  required
                  disabled={fieldsLocked}
                />
              </Grid>
              {/* To */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="to"
                  label="To *"
                  type="email"
                  value={formData.to}
                  onChange={handleInputChange}
                  error={!!formErrors.to}
                  helperText={formErrors.to}
                  fullWidth
                  required
                  disabled={fieldsLocked}
                />
              </Grid>
              {/* Subject */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  name="subject"
                  label="Subject *"
                  value={formData.subject}
                  onChange={handleInputChange}
                  error={!!formErrors.subject}
                  helperText={formErrors.subject}
                  fullWidth
                  required
                  disabled={fieldsLocked}
                />
              </Grid>
              {/* Content */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  name="content"
                  label="Email Content *"
                  value={formData.content}
                  onChange={handleInputChange}
                  error={!!formErrors.content}
                  helperText={formErrors.content}
                  fullWidth
                  required
                  multiline
                  rows={6}
                  disabled={fieldsLocked}
                />
              </Grid>
            </Grid>
          </form>
        </LocalizationProvider>
      </Paper>
      
      {/* Action Buttons */}
      <Box sx={{ mt: 4, mb: 3, mr: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        {actuallyViewing && !onSuccess && !onCancel && (
          <>
            <Button
              startIcon={<EditIcon />}
              variant="outlined"
              onClick={() => navigate(`/emails/${id}/edit`)}
            >
              Edit
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              color="error"
              variant="contained"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </>
        )}
        {!actuallyViewing && (
          <>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting
                ? 'Saving...'
                : (actuallyEditing ? 'Edit Email' : 'Create Email')}
            </Button>
          </>
        )}
      </Box>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Email</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this email? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={submitting}>
            {submitting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return isQuickAction ? content : (
    <Container maxWidth="md">
      {content}
    </Container>
  );
};

export default CreateEmail;