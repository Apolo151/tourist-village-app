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
import { billService } from '../services/billService';
import type { BillDetailItem } from '../services/billService';
import CreateUtilityReading from './CreateUtilityReading';
import CreatePayment from './CreatePayment';
import CreateEmail from './CreateEmail';
import CreateServiceRequest from './CreateServiceRequest';

interface FormData {
  apartment_id: number;
  user_id: number;
  number_of_people: number;
  arrival_date: Date | null;
  leaving_date: Date | null;
  status: 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled';
  notes: string;
}

interface FormErrors {
  apartment_id?: string;
  user_id?: string;
  arrival_date?: string;
  leaving_date?: string;
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
    number_of_people: 0,
    arrival_date: null,
    leaving_date: null,
    status: 'Booked',
    notes: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  
  // Dialog state for quick actions
  const [dialogState, setDialogState] = useState({
    utilityReading: false,
    payment: false,
    email: false,
    serviceRequest: false
  });

  // Bills state
  const [bills, setBills] = useState<BillDetailItem[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  
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

  // Load booking data if editing
  useEffect(() => {
    const loadBookingData = async () => {
    if (!isNew && id) {
        try {
          setLoading(true);
          const [bookingData, relatedBookingData] = await Promise.all([
            bookingService.getBookingById(parseInt(id)),
            bookingService.getBookingWithRelatedData(parseInt(id))
          ]);
          
          setBooking(bookingData);
          setRelatedData(relatedBookingData);
        setFormData({
            apartment_id: bookingData.apartment_id,
            user_id: bookingData.user_id,
            number_of_people: bookingData.number_of_people,
            arrival_date: parseISO(bookingData.arrival_date),
            leaving_date: parseISO(bookingData.leaving_date),
            status: bookingData.status,
            notes: bookingData.notes || ''
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load booking data');
        } finally {
          setLoading(false);
        }
      }
    };

    if (!isNew && apartments.length > 0) {
      loadBookingData();
    }
  }, [isNew, id, apartments.length]);

  // Load bills when booking data is loaded
  useEffect(() => {
    if (booking && !isNew) {
      loadBills();
    }
  }, [booking]);
  
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
    if (field === 'apartment_id' || field === 'user_id') {
      setFormData(prev => ({ ...prev, [field]: parseInt(value) }));
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
    
    if (!formData.user_id) {
      newErrors.user_id = 'Please select a user';
    }
    
    if (!formData.arrival_date) {
      newErrors.arrival_date = 'Please select an arrival date';
    }
    
    if (!formData.leaving_date) {
      newErrors.leaving_date = 'Please select a leaving date';
    }
    
    if (formData.arrival_date && formData.leaving_date) {
      if (formData.arrival_date >= formData.leaving_date) {
        newErrors.leaving_date = 'Leaving date must be after arrival date';
      }
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
      
      const bookingData = {
        apartment_id: formData.apartment_id,
        user_id: formData.user_id,
        number_of_people: formData.number_of_people,
        arrival_date: formData.arrival_date!.toISOString(),
        leaving_date: formData.leaving_date!.toISOString(),
        status: formData.status,
        notes: formData.notes
    };
    
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save booking');
    } finally {
      setSaving(false);
    }
  };
  
  const handleToggleEdit = () => {
    if (isEditing) {
      // Reset form data to original booking data
      if (booking) {
        setFormData({
          apartment_id: booking.apartment_id,
          user_id: booking.user_id,
          number_of_people: booking.number_of_people,
          arrival_date: parseISO(booking.arrival_date),
          leaving_date: parseISO(booking.leaving_date),
          status: booking.status,
          notes: booking.notes || ''
        });
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

  // Refresh related data after quick actions
  const refreshRelatedData = async () => {
    if (!isNew && id) {
      try {
        const relatedBookingData = await bookingService.getBookingWithRelatedData(parseInt(id));
        setRelatedData(relatedBookingData);
        
        // Also refresh bills if they exist
        if (bills.length > 0) {
          await loadBills();
        }
      } catch (err) {
        console.error('Failed to refresh related data:', err);
      }
    }
  };

  // Load bills based on booking type
  const loadBills = async () => {
    if (!booking) return;
    
    try {
      setBillsLoading(true);
      
      if (booking.user_type === 'Tenant') {
        // For tenants: show bills related to this specific booking
        // We'll need to filter the apartment bills by booking_id
        const apartmentBills = await billService.getApartmentBills(booking.apartment_id);
        const bookingBills = apartmentBills.filter(bill => bill.booking_id === booking.id);
        setBills(bookingBills);
      } else {
        // For owners: show all bills related to this owner (not just this booking)
        const apartmentBills = await billService.getApartmentBills(booking.apartment_id);
        setBills(apartmentBills);
      }
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setBillsLoading(false);
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

          {/* Speed Dial for quick actions (non-edit mode only) */}
          {!isNew && !isEditing && (
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
        )}

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

                  <Grid size={{xs: 12, md: 6}}>
                    <FormControl fullWidth error={!!errors.user_id}>
                      <InputLabel>User</InputLabel>
                    <Select
                        value={formData.user_id.toString()}
                        label="User"
                        onChange={(e) => handleSelectChange(e, 'user_id')}
                      >
                        <MenuItem value="">
                          <em>Select a user</em>
                        </MenuItem>
                        {users.map(user => (
                          <MenuItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.role})
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.user_id && <FormHelperText>{errors.user_id}</FormHelperText>}
                    </FormControl>
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
                      label="Leaving Date"
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
                <Card sx={{ mb: 3 }}>
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
                            <Typography variant="subtitle2" color="text.secondary">Guest</Typography>
                            <Typography variant="body1">
                              {booking.user?.name} 
                              <Chip 
                                label={booking.user_type} 
                                size="small" 
                                color={booking.user_type === 'Owner' ? 'primary' : 'secondary'}
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
                      
                      <Grid size={{xs: 12, md: 6}}>
                        <Typography variant="subtitle2" color="text.secondary">Arrival Date</Typography>
                        <Typography variant="body1">{formatDate(booking.arrival_date)}</Typography>
                      </Grid>
                      
                      <Grid size={{xs: 12, md: 6}}>
                        <Typography variant="subtitle2" color="text.secondary">Leaving Date</Typography>
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

                {/* Tabs for related data */}
                <Paper>
                  <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                  >
                    <Tab label="Payments" icon={<PaymentIcon />} iconPosition="start" />
                    <Tab label="Service Requests" icon={<ServiceIcon />} iconPosition="start" />
                    <Tab label="Emails" icon={<EmailIcon />} iconPosition="start" />
                    <Tab label="Utility Readings" icon={<UtilityIcon />} iconPosition="start" />
                    <Tab label="Bills" icon={<BillIcon />} iconPosition="start" />
                  </Tabs>

                  {/* Related Payments */}
                  <TabPanel value={activeTab} index={0}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                              <TableCell>Description</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {relatedData.payments.map((payment: any) => (
                              <TableRow key={payment.id}>
                                <TableCell>{formatDate(payment.date)}</TableCell>
                                <TableCell>{payment.cost}</TableCell>
                                <TableCell>{payment.currency}</TableCell>
                                <TableCell>{payment.method_name || 'N/A'}</TableCell>
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
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                              <TableCell>Date Requested</TableCell>
                              <TableCell>Wanted Date</TableCell>
                              <TableCell>Cost</TableCell>
                              <TableCell>Assignee</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {relatedData.service_requests.map((request: any) => (
                              <TableRow key={request.id}>
                                <TableCell>{request.service_type_name}</TableCell>
                                <TableCell>{formatDate(request.date_created)}</TableCell>
                                <TableCell>{request.wanted_service_date ? formatDate(request.wanted_service_date) : 'N/A'}</TableCell>
                                <TableCell>{request.service_type_cost} {request.service_type_currency}</TableCell>
                                <TableCell>{request.assignee_name || 'Unassigned'}</TableCell>
                                <TableCell>
                      <Chip 
                                    label={request.status || 'Pending'} 
                        size="small"
                                    color={request.status === 'completed' ? 'success' : 'default'}
                                  />
                                </TableCell>
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
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <List>
                        {relatedData.emails.map((email: any) => (
                          <ListItem key={email.id} divider>
                    <ListItemText 
                      primary={email.subject}
                              secondary={
                                <>
                                  <Typography variant="body2">
                                    From: {email.from_email} | To: {email.to_email}
                                  </Typography>
                                  <Typography variant="caption">
                                    {formatDate(email.date)}
                                  </Typography>
                                </>
                              }
                            />
                  </ListItem>
                ))}
              </List>
            ) : (
                      <Alert severity="info">No emails found for this booking</Alert>
                    )}
                  </TabPanel>

                  {/* Related Utility Readings */}
                  <TabPanel value={activeTab} index={3}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                  {/* Related Bills */}
                  <TabPanel value={activeTab} index={4}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6">
                        {booking?.user_type === 'Tenant' ? 'Booking Bills' : 'Owner Bills'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {booking?.user_type === 'Tenant' 
                          ? 'Bills related to this specific booking'
                          : 'All bills for this apartment owner'
                        }
                      </Typography>
                    </Box>
                    
                    {billsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                      </Box>
                    ) : bills.length > 0 ? (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Type</TableCell>
                              <TableCell>Description</TableCell>
                              <TableCell>Amount</TableCell>
                              <TableCell>Currency</TableCell>
                              <TableCell>Date</TableCell>
                              <TableCell>User Type</TableCell>
                              {booking?.user_type === 'Tenant' && <TableCell>Booking Date</TableCell>}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {bills.map((bill) => (
                              <TableRow key={bill.id}>
                                <TableCell>
                                  <Chip 
                                    label={bill.type.replace('_', ' ')} 
                                    size="small"
                                    color={bill.type === 'payment' ? 'success' : 'default'}
                                  />
                                </TableCell>
                                <TableCell>{bill.description}</TableCell>
                                <TableCell>{bill.amount}</TableCell>
                                <TableCell>{bill.currency}</TableCell>
                                <TableCell>{formatDate(bill.date)}</TableCell>
                                <TableCell>
                                  <Chip 
                                    label={bill.user_type === 'owner' ? 'Owner' : 'Tenant'} 
                                    size="small"
                                    color={bill.user_type === 'owner' ? 'primary' : 'secondary'}
                                  />
                                </TableCell>
                                {booking?.user_type === 'Tenant' && (
                                  <TableCell>
                                    {bill.booking_arrival_date ? formatDate(bill.booking_arrival_date) : 'N/A'}
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">
                        {booking?.user_type === 'Tenant' 
                          ? 'No bills found for this booking'
                          : 'No bills found for this apartment owner'
                        }
                      </Alert>
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