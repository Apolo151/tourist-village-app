import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Payment as PaymentIcon,
  Email as EmailIcon,
  Build as ServiceIcon,
  Receipt as BillIcon,
  WaterDrop as UtilityIcon,
  Add as AddIcon,
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { bookingService } from '../services/bookingService';
import type { Booking, BookingRelatedData, CreateBookingRequest, UpdateBookingRequest } from '../services/bookingService';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { userService } from '../services/userService';
import type { User } from '../services/userService';
import { invoiceService } from '../services/invoiceService';
import type { InvoiceDetailItem } from '../services/invoiceService';
import CreateUtilityReading from './CreateUtilityReading';
import CreatePayment from './CreatePayment';
import CreateEmail from './CreateEmail';
import CreateServiceRequest from './CreateServiceRequest';
import SearchableDropdown from '../components/SearchableDropdown';

interface FormData {
  apartment_id: number;
  user_id: number;
  user_name: string;
  user_type: 'owner' | 'renter';
  number_of_people: number;
  arrival_date: Date | null;
  leaving_date: Date | null;
  status: 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled';
  notes: string;
  person_name: string;
  flightDetails: string;
}

interface FormErrors {
  apartment_id?: string;
  user_id?: string;
  user_name?: string;
  arrival_date?: string;
  leaving_date?: string;
  number_of_people?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`booking-tabpanel-${index}`}
      aria-labelledby={`booking-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const BookingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const isNew = id === 'new';
  
  // State
  const [booking, setBooking] = useState<Booking | null>(null);
  const [relatedData, setRelatedData] = useState<BookingRelatedData | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tab management
  const [activeTab, setActiveTab] = useState(0);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(isNew || location.pathname.endsWith('/edit'));
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    apartment_id: 0,
    user_id: 0,
    user_name: '',
    user_type: 'renter',
    number_of_people: 0,
    arrival_date: null,
    leaving_date: null,
    status: 'Booked',
    notes: '',
    person_name: '',
    flightDetails: ''
  });
  
  // Add additional state to track input value for SearchableDropdown
  const [userNameInput, setUserNameInput] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  
  // Dialog state for quick actions
  const [dialogState, setDialogState] = useState({
    utilityReading: false,
    payment: false,
    email: false,
    serviceRequest: false
  });

  // Invoices state
  const [invoices, setInvoices] = useState<InvoiceDetailItem[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
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
        const [apartmentsData, usersData] = await Promise.all([
          apartmentService.getApartments({ limit: 100 }),
          userService.getUsers({ limit: 100 })
        ]);
        setApartments(apartmentsData.data);
        setUsers(usersData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Load booking data when apartments are loaded
  useEffect(() => {
    const loadBookingData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load booking with related data
        const bookingData = await bookingService.getBookingWithRelatedData(parseInt(id!));
        setBooking(bookingData.booking);
        setRelatedData(bookingData);

        // Set form data
        setFormData({
          apartment_id: bookingData.booking.apartment_id,
          user_id: bookingData.booking.user_id,
          user_name: bookingData.booking.user?.name || '',
          user_type: bookingData.booking.user_type === 'owner' ? 'owner' : 'renter',
          number_of_people: bookingData.booking.number_of_people,
          arrival_date: parseISO(bookingData.booking.arrival_date),
          leaving_date: parseISO(bookingData.booking.leaving_date),
          status: bookingData.booking.status,
          notes: bookingData.booking.notes || '',
          person_name: bookingData.booking.person_name || '',
          flightDetails: ''
        });
        
        // Also set the userNameInput for the SearchableDropdown - only use the name without email
        setUserNameInput(bookingData.booking.user?.name || '');

        // Extract flight details from notes if present
        if (bookingData.booking.notes && bookingData.booking.notes.includes('Flight Details:')) {
          const flightMatch = bookingData.booking.notes.match(/Flight Details:\s*(.+)/);
          if (flightMatch) {
            setFormData(prev => ({
              ...prev,
              notes: bookingData.booking.notes?.replace(/\n\nFlight Details:.*/, '') || '',
              flightDetails: flightMatch[1].trim()
            }));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load booking data');
      } finally {
        setLoading(false);
      }
    };

    if (!isNew && apartments.length > 0) {
      loadBookingData();
    }
  }, [isNew, id, apartments.length]);

  // Load invoices when booking data is loaded
  useEffect(() => {
    if (booking && !isNew) {
      loadInvoices();
    }
  }, [booking]);

  // Note: User field reset is now handled in handleSelectChange when user_type changes
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'number_of_people') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 1 }));
    } else {
    setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSelectChange = (e: SelectChangeEvent<string>, field: keyof FormData) => {
    const value = e.target.value;
    if (field === 'apartment_id') {
      const apartmentId = parseInt(value);
      setFormData(prev => ({ ...prev, apartment_id: apartmentId }));
      
      // If in owner mode, auto-select the apartment owner
      if (formData.user_type === 'owner' && apartmentId) {
        const selectedApartment = apartments.find(apt => apt.id === apartmentId);
        if (selectedApartment?.owner_id) {
          const apartmentOwner = users.find(user => user.id === selectedApartment.owner_id);
          if (apartmentOwner) {
            setFormData(prev => ({ 
              ...prev, 
              apartment_id: apartmentId,
              user_id: selectedApartment.owner_id,
              user_name: apartmentOwner.name 
            }));
            setUserNameInput(apartmentOwner.name);
          }
        }
      }
    } else if (field === 'user_id') {
      setFormData(prev => ({ ...prev, [field]: parseInt(value) }));
    } else if (field === 'user_type') {
      // Reset user fields when user type changes via UI
      if (value === 'renter') {
        // When changing from owner to renter, fully reset all user data
        setFormData(prev => ({ 
          ...prev, 
          [field]: value as 'owner' | 'renter',
          user_id: 0,  // Make sure we clear the user_id
          user_name: '' // And the user_name
        }));
        setUserNameInput(''); // Explicitly reset the search input
      } else if (value === 'owner' && formData.apartment_id) {
        // If changing to owner mode and apartment is selected, auto-select the owner
        const selectedApartment = apartments.find(apt => apt.id === formData.apartment_id);
        if (selectedApartment?.owner_id) {
          const apartmentOwner = users.find(user => user.id === selectedApartment.owner_id);
          if (apartmentOwner) {
            setFormData(prev => ({ 
              ...prev, 
              [field]: value as 'owner' | 'renter',
              user_id: apartmentOwner.id,
              user_name: apartmentOwner.name 
            }));
            setUserNameInput(apartmentOwner.name);
          } else {
            // If owner not found but apartment has owner_id
            setFormData(prev => ({ 
              ...prev, 
              [field]: value as 'owner' | 'renter',
              user_id: selectedApartment.owner_id,
              user_name: ''
            }));
            setUserNameInput('');
          }
        } else {
          // If no owner set for apartment
          setFormData(prev => ({ 
            ...prev, 
            [field]: value as 'owner' | 'renter',
            user_id: 0,
            user_name: ''
          }));
          setUserNameInput('');
        }
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };
  
  const handleDateChange = (date: Date | null, field: 'arrival_date' | 'leaving_date') => {
    setFormData(prev => ({ ...prev, [field]: date }));
  };
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.apartment_id) {
      newErrors.apartment_id = 'Please select an apartment';
    }
    
    if (formData.user_type === 'owner') {
      if (!formData.user_id) {
        newErrors.user_id = 'Please select a user for owner booking';
      }
    } else {
      if (!formData.user_name.trim()) {
        newErrors.user_name = 'Please enter the person name for renter booking';
      }
    }
    
    if (!formData.arrival_date) {
      newErrors.arrival_date = 'Please select an arrival date';
    }
    
    if (!formData.leaving_date) {
      newErrors.leaving_date = 'Please select a departure date';
    }
    
    if (formData.arrival_date && formData.leaving_date) {
      if (formData.arrival_date >= formData.leaving_date) {
        newErrors.leaving_date = 'departure date must be after arrival date';
      }
    }
    
    if (!formData.number_of_people || formData.number_of_people < 1) {
      newErrors.number_of_people = 'Number of people must be at least 1';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const bookingData: any = {
        apartment_id: formData.apartment_id,
        number_of_people: formData.number_of_people,
        arrival_date: formData.arrival_date!.toISOString(),
        leaving_date: formData.leaving_date!.toISOString(),
        status: formData.status,
        notes: formData.notes,
        person_name: formData.person_name
      };

      // Add user data based on type
      if (formData.user_type === 'owner') {
        bookingData.user_id = formData.user_id;
        bookingData.user_type = 'owner';
      } else {
        // When updating to renter mode, ensure user_name is sent and user_id is null/undefined
        // unless a specific user was selected in the dropdown
        bookingData.user_name = formData.user_name.trim();
        bookingData.user_type = 'renter';
        
        // Only send user_id if a specific user was selected
        if (formData.user_id > 0) {
          bookingData.user_id = formData.user_id;
        } else {
          // This ensures the backend knows we're creating a new user, not updating an existing one
          bookingData.user_id = null;
        }
      }

      if (isNew) {
        const newBooking = await bookingService.createBooking(bookingData as CreateBookingRequest);
        setSuccess(true);
        setTimeout(() => {
          navigate(`/bookings/${newBooking.id}`);
        }, 1500);
      } else {
        const updatedBooking = await bookingService.updateBooking(parseInt(id!), bookingData as UpdateBookingRequest);
        setBooking(updatedBooking);
        setIsEditing(false);
        setSuccess(true);
        // Navigate to view mode after successful update
        navigate(`/bookings/${id}`);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      // If the error is an Axios error with a response and status 409, show the backend message
      if (err.response && err.response.status === 409 && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save booking');
      }
    } finally {
      setSaving(false);
    }
  };
  
  const handleToggleEdit = () => {
    if (isEditing) {
      // Reset form data to original booking data
      if (booking) {
        const updatedFormData = {
          apartment_id: booking.apartment_id,
          user_id: booking.user_id,
          user_name: booking.user?.name || '',
          user_type: (booking.user_type === 'owner' ? 'owner' : 'renter') as 'owner' | 'renter',
          number_of_people: booking.number_of_people,
          arrival_date: parseISO(booking.arrival_date),
          leaving_date: parseISO(booking.leaving_date),
          status: booking.status,
          notes: booking.notes || '',
          person_name: booking.person_name || '',
          flightDetails: ''
        };
        setFormData(updatedFormData);
        
        // Also reset userNameInput when canceling edit
        setUserNameInput(booking.user?.name || '');
      }
      setErrors({});
      // Navigate to view mode
      navigate(`/bookings/${id}`);
    } else {
      // Navigate to edit mode
      navigate(`/bookings/${id}/edit`);
    }
    setIsEditing(!isEditing);
  };
  
  const handleBack = () => {
    navigate('/bookings');
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!booking) return;
    
    try {
      setDeleting(true);
      await bookingService.deleteBooking(booking.id);
      setDeleteDialogOpen(false);
      navigate('/bookings?success=true&message=Booking%20deleted%20successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete booking');
    } finally {
      setDeleting(false);
    }
  };

  // Dialog open/close handlers
  const openDialog = (type: keyof typeof dialogState) => setDialogState(prev => ({ ...prev, [type]: true }));
  const closeDialog = (type: keyof typeof dialogState) => setDialogState(prev => ({ ...prev, [type]: false }));
  
  // Refresh related data
  const refreshRelatedData = async () => {
    if (!id || isNew) return;
    try {
      const bookingData = await bookingService.getBookingWithRelatedData(parseInt(id));
      setRelatedData(bookingData);
    } catch (err) {
      console.error('Failed to refresh related data:', err);
    }
  };

  // Helper to render dialog
  const renderDialog = (type: keyof typeof dialogState, Component: React.ElementType, extraProps = {}) => (
    <Dialog open={dialogState[type]} onClose={() => closeDialog(type)} maxWidth="md" fullWidth>
      <Component
        onSuccess={() => {
          closeDialog(type);
          refreshRelatedData();
        }}
        onCancel={() => closeDialog(type)}
        {...extraProps}
      />
    </Dialog>
  );

  // Load invoices based on booking type
  const loadInvoices = async () => {
    if (!booking) return;
    
    try {
      setInvoicesLoading(true);
      
      if (booking.user_type === 'renter') {
        // For renters: show invoices related to this specific booking
        // We'll need to filter the apartment invoices by booking_id
        const apartmentInvoices = await invoiceService.getApartmentInvoices(booking.apartment_id);
        const bookingInvoices = apartmentInvoices.filter(invoice => invoice.booking_id === booking.id);
        setInvoices(bookingInvoices);
      } else {
        // For owners: show all invoices related to this owner (not just this booking)
        const apartmentInvoices = await invoiceService.getApartmentInvoices(booking.apartment_id);
        setInvoices(apartmentInvoices);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Quick actions - updated to open dialogs instead of navigating
  const handleAddUtilityReading = () => {
    openDialog('utilityReading');
  };

  const handleAddPayment = () => {
    openDialog('payment');
  };

  const handleAddServiceRequest = () => {
    openDialog('serviceRequest');
  };

  const handleAddEmail = () => {
    openDialog('email');
  };

  const speedDialActions = [
    { icon: <UtilityIcon />, name: 'Add Utility Reading', onClick: handleAddUtilityReading },
    { icon: <PaymentIcon />, name: 'Add Payment', onClick: handleAddPayment },
    { icon: <ServiceIcon />, name: 'Request Service', onClick: handleAddServiceRequest },
    { icon: <EmailIcon />, name: 'Add Email', onClick: handleAddEmail }
  ];

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Booked': return 'info';
      case 'Checked In': return 'success';
      case 'Checked Out': return 'default';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'Booked': return 'Booked';
      case 'Checked In': return 'Checked In';
      case 'Checked Out': return 'Checked Out';
      case 'Cancelled': return 'Cancelled';
      default: return status;
    }
  };

  // Helper functions for booking financial calculations
  const getBookingPaymentTotal = (currency: 'EGP' | 'GBP') => {
    return relatedData?.payments?.filter(p => p.currency === currency).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  };

  const getBookingServiceCostTotal = (currency: 'EGP' | 'GBP') => {
    return relatedData?.service_requests?.filter(sr => sr.service_type_currency === currency).reduce((sum, sr) => sum + (sr.service_type_cost || 0), 0) || 0;
  };

  const getBookingNetBalance = (currency: 'EGP' | 'GBP') => {
    return getBookingPaymentTotal(currency) - getBookingServiceCostTotal(currency);
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
        <Button startIcon={<BackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Bookings
        </Button>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button startIcon={<BackIcon />} onClick={handleBack}>
                Back to Bookings
            </Button>
            <Typography variant="h4">
                {isNew ? 'Create New Booking' : `Booking #${booking?.id}`}
            </Typography>
          </Box>
          
            {!isNew && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant={isEditing ? "outlined" : "contained"}
                  color={isEditing ? "secondary" : "primary"}
                  startIcon={isEditing ? <CancelIcon /> : <EditIcon />}
                  onClick={handleToggleEdit}
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
                {!isEditing && (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                )}
              </Box>
            )}
        </Box>

          {/* Success Alert */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
              {isNew ? 'Booking created successfully!' : 'Booking updated successfully!'}
          </Alert>
        )}

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {isEditing && formData.user_type === 'renter' && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Renter Booking:</strong> When you enter a person's name that doesn't exist in the system, 
                a new user account will be automatically created with the following default values:
                <br />• Email: [cleanname][timestamp][random]@domain.com
                <br />• Password: renterpassword
                <br />• Role: Renter
                <br />• Active: Yes
              </Typography>
            </Alert>
          )}

          {/* Speed Dial for quick actions (non-edit mode only) */}
          {/* {!isNew && !isEditing && (
          <SpeedDial
              ariaLabel="Quick actions"
              sx={{ position: 'fixed', bottom: 24, right: 24 }}
            icon={<SpeedDialIcon />}
          >
              {speedDialActions.map((action) => (
              <SpeedDialAction
                key={action.name}
                icon={action.icon}
                tooltipTitle={action.name}
                onClick={action.onClick}
              />
            ))}
          </SpeedDial>
        )} */}

          {/* Main Content */}
          {isEditing ? (
            /* Edit/Create Form */
          <Paper sx={{ p: 3 }}>
              <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={{xs: 12, md: 6}}>
                  <FormControl fullWidth error={!!errors.apartment_id}>
                    <InputLabel>Apartment</InputLabel>
                    <Select
                      value={formData.apartment_id.toString()}
                      label="Apartment"
                      onChange={(e) => handleSelectChange(e, 'apartment_id')}
                    >
                      <MenuItem value="">
                        <em>Select an apartment</em>
                      </MenuItem>
                      {apartments.map(apartment => (
                        <MenuItem key={apartment.id} value={apartment.id.toString()}>
                          {apartment.name} - {apartment.village?.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.apartment_id && <FormHelperText>{errors.apartment_id}</FormHelperText>}
                  </FormControl>
                </Grid>

                {/* User Type */}
                <Grid size={{xs: 12, md: 6}}>
                  <FormControl fullWidth>
                    <InputLabel>User Type</InputLabel>
                    <Select
                      value={formData.user_type}
                      label="User Type"
                      onChange={(e) => handleSelectChange(e, 'user_type')}
                    >
                      <MenuItem value="owner">Owner</MenuItem>
                      <MenuItem value="renter">Tenant</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* User Selection - Conditional based on user type */}
                <Grid size={{xs: 12, md: 6}}>
                  {formData.user_type === 'owner' ? (
                    (() => {
                      const selectedApartment = apartments.find(apt => apt.id === formData.apartment_id);
                      const apartmentOwner = users.find(user => user.id === selectedApartment?.owner_id);
                      return (
                        <TextField
                          fullWidth
                          required
                          label="User Name (Owner)"
                          value={apartmentOwner ? apartmentOwner.name : ''}
                          disabled
                          helperText={apartmentOwner ? `Apartment owner: ${apartmentOwner.email}` : 'Select an apartment to prefill owner'}
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
                      // Always reset the value when in renter mode to ensure a clean state
                      value={null}
                      onChange={(value) => {
                        if (value) {
                          const selectedUser = users.find(u => u.id === value);
                          if (selectedUser) {
                            setFormData(prev => ({ 
                              ...prev, 
                              user_id: selectedUser.id,
                              user_name: selectedUser.name 
                            }));
                            setUserNameInput(selectedUser.name);
                          }
                        } else {
                          setFormData(prev => ({ ...prev, user_id: 0 }));
                        }
                      }}
                      label="User Name"
                      placeholder="Search users or type new name..."
                      required
                      freeSolo={true}
                      onInputChange={(inputValue) => {
                        setFormData(prev => ({ ...prev, user_name: inputValue }));
                        setUserNameInput(inputValue);
                      }}
                      inputValue={userNameInput}
                      // This is the key change - modify how options are displayed in the input field
                      getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
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
                      error={!!errors.user_name}
                      helperText={errors.user_name || "Enter the name of the user making the booking. A new user account will be created if they don't exist."}
                    />
                  )}
                </Grid>

                {/* Person Name */}
                <Grid size={{xs: 12, md: 6}}>
                  <TextField
                    name="person_name"
                    label="Person Name (Optional)"
                    fullWidth
                    value={formData.person_name}
                    onChange={handleChange}
                    placeholder="Enter the person(s)'s name(s) for this booking"
                    helperText="Optional: Specific person name(s) for this booking"
                  />
                </Grid>

                <Grid size={{xs: 12, md: 6}}>
                  <TextField
                    name="number_of_people"
                    label="Number of People"
                    type="number"
                    fullWidth
                    value={formData.number_of_people}
                    onChange={handleChange}
                    inputProps={{ min: 1, max: 20 }}
                    error={!!errors.number_of_people}
                    helperText={errors.number_of_people}
                  />
                </Grid>

                <Grid size={{xs: 12, md: 6}}>
                  <DateTimePicker
                    label="Arrival Date"
                    value={formData.arrival_date}
                    onChange={(date) => handleDateChange(date, 'arrival_date')}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.arrival_date,
                        helperText: errors.arrival_date
                      }
                    }}
                  />
                </Grid>

                <Grid size={{xs: 12, md: 6}}>
                  <DateTimePicker
                    label="Departure Date"
                    value={formData.leaving_date}
                    onChange={(date) => handleDateChange(date, 'leaving_date')}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.leaving_date,
                        helperText: errors.leaving_date
                      }
                    }}
                  />
                </Grid>

                <Grid size={{xs: 12, md: 6}}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      label="Status"
                      onChange={(e) => handleSelectChange(e, 'status')}
                    >
                      <MenuItem value="Booked">Booked</MenuItem>
                      <MenuItem value="Checked In">Checked In</MenuItem>
                      <MenuItem value="Checked Out">Checked Out</MenuItem>
                      <MenuItem value="Cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{xs: 12}}>
                  <TextField
                    name="notes"
                    label="Notes"
                    multiline
                    rows={3}
                    fullWidth
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </Grid>

                {/* Flight Details */}
                <Grid size={{xs: 12}}>
                  <TextField
                    name="flightDetails"
                    label="Flight Details"
                    multiline
                    rows={2}
                    fullWidth
                    value={formData.flightDetails}
                    onChange={(e) => setFormData(prev => ({ ...prev, flightDetails: e.target.value }))}
                    placeholder="Flight information (optional)"
                    helperText="Include flight numbers, arrival/departure times, etc."
                  />
                </Grid>

                <Grid size={{xs: 12}}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button 
                      variant="outlined"
                      onClick={isNew ? handleBack : handleToggleEdit}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : (isNew ? 'Create Booking' : 'Save Changes')}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
              </form>
          </Paper>
          ) : (
            /* View Mode */
            booking && (
              <>
                {/* Booking Summary */}
                <Box sx={{ display: 'flex', gap: 3, mb: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                  {/* Booking Information Card */}
                  <Card sx={{ flex: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                        Booking Information
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      
                      <Grid container spacing={2}>
                        <Grid size={{xs: 12, md: 4}}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <HomeIcon color="primary" />
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">Apartment</Typography>
                              <Typography variant="body1">{booking.apartment?.name} - {booking.apartment?.village?.name}</Typography>
                            </Box>
                          </Box>
                        </Grid>
                        
                        <Grid size={{xs: 12, md: 4}}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <PersonIcon color="primary" />
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">User</Typography>
                              <Typography variant="body1">
                                {booking.user?.name} 
                                <Chip 
                                  label={booking.user_type === 'owner' ? 'Owner' : 'Tenant'} 
                                  size="small" 
                                  color={booking.user_type === 'owner' ? 'primary' : 'secondary'}
                                  sx={{ ml: 1 }}
                                />
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        
                        <Grid size={{xs: 12, md: 4}}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <CalendarIcon color="primary" />
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                              <Chip 
                                label={getStatusDisplay(booking.status)} 
                                color={getStatusColor(booking.status) as any}
                                size="small"
                              />
                            </Box>
                          </Box>
                        </Grid>
                        
                        <Grid size={{xs: 12, md: 4}}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <PersonIcon color="primary" />
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">Number of People</Typography>
                              <Typography variant="body1">{booking.number_of_people}</Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid size={{xs: 12}}>
                          <Typography variant="subtitle2" color="text.secondary">Person Name</Typography>
                          <Typography variant="body1">{booking.person_name || '-'}</Typography>
                        </Grid>
                        <Grid size={{xs: 12, md: 6}}>
                          <Typography variant="subtitle2" color="text.secondary">Arrival Date</Typography>
                          <Typography variant="body1">{formatDate(booking.arrival_date)}</Typography>
                        </Grid>
                        
                        <Grid size={{xs: 12, md: 6}}>
                          <Typography variant="subtitle2" color="text.secondary">Departure Date</Typography>
                          <Typography variant="body1">{formatDate(booking.leaving_date)}</Typography>
                        </Grid>
                        
                        <Grid size={{xs: 12, md: 6}}>
                          <Typography variant="subtitle2" color="text.secondary">Reservation Date</Typography>
                          <Typography variant="body1">{formatDate(booking.reservation_date || booking.created_at)}</Typography>
                        </Grid>
                        
                        {booking.notes && (
                          <Grid size={{xs: 12}}>
                            <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                            <Typography variant="body1">{booking.notes}</Typography>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Booking Balance Card (admin only) */}
                  {isAdmin && (
                    <Card sx={{ flex: 1 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Booking Balance</Typography>
                        <Divider sx={{ mb: 2 }} />
                        
                        <List dense>
                          <ListItem>
                            <ListItemText 
                              primary="Total Payments" 
                              secondary={
                                <Box>
                                  <Typography variant="body2">
                                    EGP: {getBookingPaymentTotal('EGP').toLocaleString()}
                                  </Typography>
                                  <Typography variant="body2">
                                    GBP: {getBookingPaymentTotal('GBP').toLocaleString()}
                                  </Typography>
                                  {getBookingPaymentTotal('EGP') === 0 && getBookingPaymentTotal('GBP') === 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                      No payments recorded for this booking
                                    </Typography>
                                  )}
                                </Box>
                              } 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Total Service Costs" 
                              secondary={
                                <Box>
                                  <Typography variant="body2">
                                    EGP: {getBookingServiceCostTotal('EGP').toLocaleString()}
                                  </Typography>
                                  <Typography variant="body2">
                                    GBP: {getBookingServiceCostTotal('GBP').toLocaleString()}
                                  </Typography>
                                  {getBookingServiceCostTotal('EGP') === 0 && getBookingServiceCostTotal('GBP') === 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                      No service requests for this booking
                                    </Typography>
                                  )}
                                </Box>
                              } 
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Net Balance" 
                              secondary={
                                <Box>
                                  <Typography 
                                    variant="body2" 
                                    color={getBookingNetBalance('EGP') >= 0 ? 'success.main' : 'error.main'}
                                  >
                                    EGP: {getBookingNetBalance('EGP').toLocaleString()}
                                  </Typography>
                                  <Typography 
                                    variant="body2" 
                                    color={getBookingNetBalance('GBP') >= 0 ? 'success.main' : 'error.main'}
                                  >
                                    GBP: {getBookingNetBalance('GBP').toLocaleString()}
                                  </Typography>
                                </Box>
                              } 
                            />
                          </ListItem>
                        </List>
                        
                        {/* Summary counts */}
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Summary:</strong> {relatedData?.payments?.length || 0} payment(s) • {relatedData?.service_requests?.length || 0} service request(s)
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                </Box>

                {/* Tabs for related data */}
                <Paper>
                  <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                  >
                    <Tab label="Payments" icon={<PaymentIcon />} iconPosition="start" />
                    <Tab label="Service Requests" icon={<ServiceIcon />} iconPosition="start" />
                    <Tab label="Emails" icon={<EmailIcon />} iconPosition="start" />
                    <Tab label="Utility Readings" icon={<UtilityIcon />} iconPosition="start" />
                    <Tab label="Invoices" icon={<BillIcon />} iconPosition="start" />
                  </Tabs>

                  {/* Related Payments */}
                  <TabPanel value={activeTab} index={0}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
              <Typography variant="h6">Related Payments</Typography>
              <Button
                variant="contained"
                        startIcon={<PaymentIcon />}
                onClick={handleAddPayment}
              >
                Add Payment
              </Button>
            </Box>
            
                    {relatedData?.payments && relatedData.payments.length > 0 ? (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Amount</TableCell>
                              <TableCell>Currency</TableCell>
                              <TableCell>Method</TableCell>
                              <TableCell>Paid By</TableCell>
                              <TableCell>Description</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {relatedData.payments.map((payment: any) => (
                              <TableRow key={payment.id}>
                                <TableCell>{formatDate(payment.date)}</TableCell>
                                <TableCell>{payment.amount}</TableCell>
                                <TableCell>{payment.currency}</TableCell>
                                <TableCell>{payment.method_name || 'N/A'}</TableCell>
                                <TableCell>{payment.user_type || 'N/A'}</TableCell>
                                <TableCell>{payment.description}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">No payments found for this booking</Alert>
                    )}
                  </TabPanel>

                  {/* Related Service Requests */}
                  <TabPanel value={activeTab} index={1}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
                      <Typography variant="h6">Related Service Requests</Typography>
                      <Button 
                        variant="contained" 
                        startIcon={<ServiceIcon />}
                        onClick={handleAddServiceRequest}
                      >
                        Request Service
                      </Button>
                    </Box>
                    
                    {relatedData?.service_requests && relatedData.service_requests.length > 0 ? (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Service Type</TableCell>
                              <TableCell>Request Date</TableCell>
                              <TableCell>Action Date</TableCell>
                              <TableCell>Cost</TableCell>
                              <TableCell>Paid By</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Notes</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {relatedData.service_requests.map((request: any) => (
                              <TableRow key={request.id}>
                                <TableCell>{request.service_type_name}</TableCell>
                                <TableCell>{formatDate(request.date_created)}</TableCell>
                                <TableCell>{request.date_action ? formatDate(request.date_action) : 'N/A'}</TableCell>
                                <TableCell>{request.service_type_cost} {request.service_type_currency}</TableCell>
                                <TableCell>{request.who_pays || 'N/A'}</TableCell>
                                
                                <TableCell>
                      <Chip 
                                    label={request.status || 'Pending'} 
                        size="small"
                                    color={request.status === 'Done' ? 'success' : request.status === 'In Progress' ? 'warning' : 'default'}
                                  />
                                </TableCell>
                                <TableCell>{request.notes}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">No service requests found for this booking</Alert>
                    )}
                  </TabPanel>

                  {/* Related Emails */}
                  <TabPanel value={activeTab} index={2}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
                      <Typography variant="h6">Related Emails</Typography>
                      <Button 
                        variant="contained" 
                        startIcon={<EmailIcon />} 
                        onClick={handleAddEmail}
                      >
                        Add Email
                      </Button>
                    </Box>
                    {relatedData?.emails && relatedData.emails.length > 0 ? (
                      <TableContainer component={Paper}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Subject</TableCell>
                              <TableCell>From</TableCell>
                              <TableCell>To</TableCell>
                              <TableCell>Date</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {relatedData.emails.map((email: any) => (
                              <TableRow key={email.id}>
                                <TableCell>{email.subject}</TableCell>
                                <TableCell>{email.from_email || email.from}</TableCell>
                                <TableCell>{email.to_email || email.to}</TableCell>
                                <TableCell>{formatDate(email.date)}</TableCell>
                                <TableCell>
                                  <Chip label={email.status} color={email.status === 'completed' ? 'success' : 'default'} size="small" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">No emails found for this booking</Alert>
                    )}
                  </TabPanel>

                  {/* Related Utility Readings */}
                  <TabPanel value={activeTab} index={3}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
                      <Typography variant="h6">Utility Readings</Typography>
                      <Button 
                        variant="contained" 
                        startIcon={<UtilityIcon />}
                        onClick={handleAddUtilityReading}
                      >
                        Add Reading
                      </Button>
                    </Box>
                    
                    {relatedData?.utility_readings && relatedData.utility_readings.length > 0 ? (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Utility Type</TableCell>
                              <TableCell>Start Reading</TableCell>
                              <TableCell>End Reading</TableCell>
                              <TableCell>Start Date</TableCell>
                              <TableCell>End Date</TableCell>
                              <TableCell>Consumption</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {relatedData.utility_readings.map((reading: any) => (
                              <TableRow key={reading.id}>
                                <TableCell>{reading.utility_type}</TableCell>
                                <TableCell>{reading.start_reading}</TableCell>
                                <TableCell>{reading.end_reading}</TableCell>
                                <TableCell>{formatDate(reading.start_date)}</TableCell>
                                <TableCell>{formatDate(reading.end_date)}</TableCell>
                                <TableCell>{reading.end_reading - reading.start_reading}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">No utility readings found for this booking</Alert>
                    )}
                  </TabPanel>

                  {/* Related Invoices */}
                  <TabPanel value={activeTab} index={4}>
                    <Box sx={{ mb: 2, px: 2 }}>
                      <Typography variant="h6">
                        {booking?.user_type === 'renter' ? 'Booking Invoices' : 'Owner Invoices'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {booking?.user_type === 'renter' 
                          ? 'Invoices related to this specific booking'
                          : 'All invoices for this apartment owner'
                        }
                      </Typography>
                    </Box>
                    
                    {invoicesLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <Box sx={{ px: 2 }}>
                        {invoices.length > 0 ? (
                          <TableContainer component={Paper}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Type</TableCell>
                                  <TableCell>Description</TableCell>
                                  <TableCell>Amount</TableCell>
                                  <TableCell>Date</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {invoices.map((invoice) => (
                                  <TableRow key={invoice.id}>
                                    <TableCell>
                                      <Chip 
                                        label={invoice.type}
                                        color={invoice.type === 'Payment' ? 'success' : 'warning'}
                                        size="small"
                                      />
                                    </TableCell>
                                    <TableCell>{invoice.description}</TableCell>
                                    <TableCell>
                                      {invoice.amount.toLocaleString()} {invoice.currency}
                                    </TableCell>
                                    <TableCell>
                                      {new Date(invoice.date).toLocaleDateString()}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        ) : (
                          <Alert severity="info">
                            No invoices found for this {booking?.user_type === 'renter' ? 'booking' : 'owner'}.
                          </Alert>
                        )}
                      </Box>
                    )}
                  </TabPanel>
                </Paper>
              </>
            )
        )}
      </Box>
      
      {/* Dialogs */}
      {renderDialog('utilityReading', CreateUtilityReading, {
        bookingId: booking?.id,
        apartmentId: booking?.apartment_id,
        lockApartment: true
      })}
      {renderDialog('payment', CreatePayment, {
        bookingId: booking?.id,
        apartmentId: booking?.apartment_id,
        userId: booking?.user_id,
        lockApartment: true,
        lockUser: true
      })}
      {renderDialog('email', CreateEmail, {
        bookingId: booking?.id,
        apartmentId: booking?.apartment_id,
        lockApartment: true
      })}
      {renderDialog('serviceRequest', CreateServiceRequest, {
        bookingId: booking?.id,
        apartmentId: booking?.apartment_id,
        lockApartment: true
      })}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Booking</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this booking? 
            This action cannot be undone and will also delete all related payments, service requests, and utility readings.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </LocalizationProvider>
  );
};

export default BookingDetails;