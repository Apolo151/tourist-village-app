import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Grid,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
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
  Save as SaveIcon,
  Cancel as CancelIcon,
  RequestPage as RequestPageIcon,
  ArticleOutlined as BillsIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, isBefore, isAfter } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { 
  mockBookings,
  mockApartments,
  mockUsers,
  mockBills,
  mockEmails,
  mockServiceRequests,
  mockPayments
} from '../mockData';
import type { Booking, User } from '../types';

interface FormData {
  id: string;
  apartmentId: string;
  userId: string;
  userType: 'owner' | 'renter';
  personName: string;
  peopleCount: number;
  arrivalDate: Date | null;
  leavingDate: Date | null;
  state: 'notArrived' | 'inVillage' | 'left';
  notes: string;
  flightDetails: string;
}

interface FormErrors {
  apartmentId?: string;
  userId?: string;
  personName?: string;
  peopleCount?: string;
  arrivalDate?: string;
  leavingDate?: string;
}

const BookingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isNew = id === 'new';
  
  // Tab management
  const [activeTab, setActiveTab] = useState(0);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    id: '',
    apartmentId: '',
    userId: '',
    userType: 'renter',
    personName: '',
    peopleCount: 1,
    arrivalDate: null,
    leavingDate: null,
    state: 'notArrived',
    notes: '',
    flightDetails: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  
  // Filter states
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  
  // Fetch booking data if editing
  useEffect(() => {
    if (!isNew && id) {
      const booking = mockBookings.find(b => b.id === id);
      if (booking) {
        const user = mockUsers.find(u => u.id === booking.userId);
        setFormData({
          id: booking.id,
          apartmentId: booking.apartmentId,
          userId: booking.userId,
          userType: user?.role as 'owner' | 'renter' || 'renter',
          personName: user?.name || '',
          peopleCount: 1, // This would be from an extended booking model
          arrivalDate: parseISO(booking.arrivalDate),
          leavingDate: parseISO(booking.leavingDate),
          state: booking.state,
          notes: '', // This would be from an extended booking model
          flightDetails: '' // This would be from an extended booking model
        });
      } else {
        // Booking not found
        navigate('/bookings');
      }
    }
  }, [id, isNew, navigate]);
  
  // Filter users based on selected user type
  useEffect(() => {
    setFilteredUsers(mockUsers.filter(user => user.role === formData.userType));
  }, [formData.userType]);
  
  // Check if user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseInt(value, 10);
    
    if (!isNaN(numValue)) {
      setFormData(prev => ({ ...prev, [name]: numValue }));
    }
  };
  
  const handleSelectChange = (e: SelectChangeEvent<string>, field: keyof FormData) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    
    // Special case for user selection
    if (field === 'userId') {
      const user = mockUsers.find(u => u.id === e.target.value);
      if (user) {
        setFormData(prev => ({ 
          ...prev, 
          userId: user.id,
          personName: user.name
        }));
      }
    }
  };
  
  const handleDateChange = (date: Date | null, field: 'arrivalDate' | 'leavingDate') => {
    setFormData(prev => ({ ...prev, [field]: date }));
  };
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.apartmentId) {
      newErrors.apartmentId = 'Please select an apartment';
    }
    
    if (formData.userType === 'owner') {
      // For owners, must select user ID
      if (!formData.userId) {
        newErrors.userId = 'Please select an owner';
      }
    } else {
      // For renters, can enter a name
      if (!formData.personName) {
        newErrors.personName = 'Please enter the renter name';
      }
    }
    
    if (!formData.arrivalDate) {
      newErrors.arrivalDate = 'Please select an arrival date';
    }
    
    if (!formData.leavingDate) {
      newErrors.leavingDate = 'Please select a leaving date';
    }
    
    if (formData.arrivalDate && formData.leavingDate) {
      if (isAfter(formData.arrivalDate, formData.leavingDate)) {
        newErrors.leavingDate = 'Leaving date must be after arrival date';
      }
      
      // Check for booking conflicts
      if (formData.apartmentId) {
        const conflictingBookings = mockBookings.filter(b => {
          // Skip the current booking
          if (!isNew && b.id === id) return false;
          
          // Only check bookings for the same apartment
          if (b.apartmentId !== formData.apartmentId) return false;
          
          const bookingStart = parseISO(b.arrivalDate);
          const bookingEnd = parseISO(b.leavingDate);
          
          // Check if new booking overlaps with existing booking
          return !(
            isAfter(formData.arrivalDate!, bookingEnd) || 
            isBefore(formData.leavingDate!, bookingStart)
          );
        });
        
        if (conflictingBookings.length > 0) {
          newErrors.arrivalDate = 'There is a booking conflict with the selected dates';
          newErrors.leavingDate = 'There is a booking conflict with the selected dates';
        }
      }
    }
    
    if (formData.peopleCount <= 0) {
      newErrors.peopleCount = 'Number of people must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Create booking object
    const bookingData: Partial<Booking> = {
      apartmentId: formData.apartmentId,
      userId: formData.userId || 'newuser', // In a real app, would create a new user
      arrivalDate: formData.arrivalDate ? format(formData.arrivalDate, 'yyyy-MM-dd') : '',
      leavingDate: formData.leavingDate ? format(formData.leavingDate, 'yyyy-MM-dd') : '',
      state: formData.state,
      createdAt: new Date().toISOString(),
      notes: formData.notes,
      flightDetails: formData.flightDetails
    };
    
    if (isNew) {
      // In a real app, would make API call to create booking
      console.log('Creating new booking:', bookingData);
    } else {
      // In a real app, would make API call to update booking
      console.log('Updating booking:', { id, ...bookingData });
    }
    
    setSuccess(true);
    
    // Redirect after success
    setTimeout(() => {
      navigate('/bookings');
    }, 1500);
  };
  
  // Get related data for booking
  const getRelatedPayments = () => {
    if (isNew) return [];
    return mockPayments.filter(payment => payment.bookingId === id);
  };
  
  const getRelatedEmails = () => {
    if (isNew) return [];
    return mockEmails.filter(email => email.bookingId === id);
  };
  
  const getRelatedServiceRequests = () => {
    if (isNew) return [];
    return mockServiceRequests.filter(req => req.bookingId === id);
  };
  
  const getRelatedBills = () => {
    if (isNew) return [];
    
    if (formData.userType === 'renter') {
      // For renters, show bills related to this booking
      return mockBills.filter(bill => bill.bookingId === id);
    } else {
      // For owners, show all bills related to this owner
      return mockBills.filter(bill => bill.userId === formData.userId && bill.userType === 'owner');
    }
  };
  
  // Get apartment name by ID
  const getApartmentName = (id: string) => {
    const apartment = mockApartments.find(a => a.id === id);
    return apartment ? apartment.name : 'Unknown';
  };
  
  // Add new utility reading
  const handleAddUtilityReading = () => {
    navigate(`/utilities/new?bookingId=${id}&apartmentId=${formData.apartmentId}`);
  };
  
  // Add new payment
  const handleAddPayment = () => {
    // Get the user type and user ID from the booking
    const user = mockUsers.find(u => u.id === formData.userId);
    const userType = user?.role || 'renter';

    // Create a description based on the booking
    const description = `Payment for booking ${id} (${format(formData.arrivalDate!, 'MMM dd, yyyy')} - ${format(formData.leavingDate!, 'MMM dd, yyyy')})`;

    // Log the data being passed
    console.log('Adding payment with data:', {
      bookingId: id,
      apartmentId: formData.apartmentId,
      userId: formData.userId,
      userType,
      description,
      user,
      formData
    });

    // Navigate to payment creation with pre-filled data
    const url = `/payments/new?bookingId=${id}&apartmentId=${formData.apartmentId}&userId=${formData.userId}&userType=${userType}&description=${encodeURIComponent(description)}`;
    console.log('Navigating to:', url);
    navigate(url);
  };

  // Toggle edit mode
  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    // Reset form data to original booking data
    if (id) {
      const booking = mockBookings.find(b => b.id === id);
      if (booking) {
        const user = mockUsers.find(u => u.id === booking.userId);
        setFormData({
          id: booking.id,
          apartmentId: booking.apartmentId,
          userId: booking.userId,
          userType: user?.role as 'owner' | 'renter' || 'renter',
          personName: user?.name || '',
          peopleCount: 1,
          arrivalDate: parseISO(booking.arrivalDate),
          leavingDate: parseISO(booking.leavingDate),
          state: booking.state,
          notes: booking.notes || '',
          flightDetails: booking.flightDetails || ''
        });
      }
    }
    setIsEditing(false);
  };

  // Quick actions for admin
  const quickActions = [
    { icon: <PaymentIcon />, name: 'Add Payment', onClick: handleAddPayment },
    { icon: <UtilityIcon />, name: 'Add Utility Reading', onClick: handleAddUtilityReading },
    { icon: <RequestPageIcon />, name: 'Request Service', onClick: () => navigate(`/services/requests/create?bookingId=${id}&apartmentId=${formData.apartmentId}&userId=${formData.userId}`) },
    { icon: <EmailIcon />, name: 'Send Email', onClick: () => navigate(`/emails/new?bookingId=${id}&apartmentId=${formData.apartmentId}`) },
    { icon: <BillsIcon />, name: 'View Bills', onClick: () => navigate(`/bills?bookingId=${id}`) },
  ];

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              variant="text"
              color="primary"
              startIcon={<BackIcon />}
              onClick={handleBack}
              sx={{ mr: 2 }}
            >
              Back
            </Button>
            <Typography variant="h4">
              {isNew ? 'Create New Booking' : 'Booking Details'}
            </Typography>
          </Box>
          
          <Box>
            {!isNew && !isEditing && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleToggleEdit}
                sx={{ mr: 1 }}
              >
                Edit
              </Button>
            )}
            {!isNew && (
              <>
                <Button
                  variant="contained"
                  startIcon={<UtilityIcon />}
                  onClick={handleAddUtilityReading}
                  sx={{ mr: 1 }}
                >
                  Add Utility Reading
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PaymentIcon />}
                  onClick={handleAddPayment}
                >
                  Add Payment
                </Button>
              </>
            )}
          </Box>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>Success</AlertTitle>
            Booking has been {isNew ? 'created' : 'updated'} successfully. Redirecting...
          </Alert>
        )}

        {!isNew && (
          <Box sx={{ width: '100%', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="booking tabs">
              <Tab label="Details" />
              <Tab label="Payments" />
              <Tab label="Service Requests" />
              <Tab label="Emails" />
              <Tab label="Bills" />
            </Tabs>
          </Box>
        )}

        {/* Quick actions speed dial (admin only) */}
        {currentUser?.role === 'admin' && !isNew && (
          <SpeedDial
            ariaLabel="Quick actions"
            sx={{ position: 'fixed', bottom: 24, right: 24 }}
            icon={<SpeedDialIcon />}
          >
            {quickActions.map((action) => (
              <SpeedDialAction
                key={action.name}
                icon={action.icon}
                tooltipTitle={action.name}
                onClick={action.onClick}
              />
            ))}
          </SpeedDial>
        )}

        {/* Booking Details Tab */}
        {(activeTab === 0 || isNew) && (
          <Paper sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Apartment Selection */}
                <Grid size={{xs: 12, md: 6}}>
                  <FormControl fullWidth error={!!errors.apartmentId} disabled={!isEditing && !isNew}>
                    <InputLabel>Apartment</InputLabel>
                    <Select
                      name="apartmentId"
                      value={formData.apartmentId}
                      label="Apartment"
                      onChange={(e) => handleSelectChange(e, 'apartmentId')}
                    >
                      <MenuItem value="">
                        <em>Select an apartment</em>
                      </MenuItem>
                      {mockApartments.map(apt => (
                        <MenuItem key={apt.id} value={apt.id}>{apt.name} ({apt.village})</MenuItem>
                      ))}
                    </Select>
                    {errors.apartmentId && <FormHelperText>{errors.apartmentId}</FormHelperText>}
                  </FormControl>
                </Grid>

                {/* User Type Selection */}
                <Grid size={{xs: 12, md: 6}}>
                  <FormControl fullWidth disabled={!isEditing && !isNew}>
                    <InputLabel>User Type</InputLabel>
                    <Select
                      name="userType"
                      value={formData.userType}
                      label="User Type"
                      onChange={(e) => handleSelectChange(e, 'userType')}
                    >
                      <MenuItem value="owner">Owner</MenuItem>
                      <MenuItem value="renter">Renter</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* User Selection or Name Input */}
                {formData.userType === 'owner' ? (
                  <Grid size={{xs: 12, md: 6}}>
                    <FormControl fullWidth error={!!errors.userId} disabled={!isEditing && !isNew}>
                      <InputLabel>Owner</InputLabel>
                      <Select
                        name="userId"
                        value={formData.userId}
                        label="Owner"
                        onChange={(e) => handleSelectChange(e, 'userId')}
                      >
                        <MenuItem value="">
                          <em>Select an owner</em>
                        </MenuItem>
                        {filteredUsers.map(user => (
                          <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                        ))}
                      </Select>
                      {errors.userId && <FormHelperText>{errors.userId}</FormHelperText>}
                    </FormControl>
                  </Grid>
                ) : (
                  <Grid size={{xs: 12, md: 6}}>
                    <TextField
                      fullWidth
                      label="Person Name"
                      name="personName"
                      value={formData.personName}
                      onChange={handleChange}
                      error={!!errors.personName}
                      helperText={errors.personName}
                      disabled={!isEditing && !isNew}
                    />
                  </Grid>
                )}

                {/* Number of People */}
                <Grid size={{xs: 12, md: 6}}>
                  <TextField
                    fullWidth
                    label="Number of People"
                    name="peopleCount"
                    type="number"
                    value={formData.peopleCount}
                    onChange={handleNumberChange}
                    error={!!errors.peopleCount}
                    helperText={errors.peopleCount}
                    InputProps={{ inputProps: { min: 1 } }}
                    disabled={!isEditing && !isNew}
                  />
                </Grid>

                {/* Date Fields */}
                <Grid size={{xs: 12, md: 6}}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateTimePicker
                      label="Arrival Date & Time"
                      value={formData.arrivalDate}
                      onChange={(date) => handleDateChange(date, 'arrivalDate')}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.arrivalDate,
                          helperText: errors.arrivalDate,
                          disabled: !isEditing && !isNew
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid size={{xs: 12, md: 6}}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateTimePicker
                      label="Leaving Date & Time"
                      value={formData.leavingDate}
                      onChange={(date) => handleDateChange(date, 'leavingDate')}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.leavingDate,
                          helperText: errors.leavingDate,
                          disabled: !isEditing && !isNew
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>

                {/* Booking Status */}
                <Grid size={{xs: 12, md: 6}}>
                  <FormControl fullWidth disabled={!isEditing && !isNew}>
                    <InputLabel>Booking Status</InputLabel>
                    <Select
                      name="state"
                      value={formData.state}
                      label="Booking Status"
                      onChange={(e) => handleSelectChange(e, 'state')}
                    >
                      <MenuItem value="notArrived">Has Not Arrived</MenuItem>
                      <MenuItem value="inVillage">In Village</MenuItem>
                      <MenuItem value="left">Left</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Notes and Flight Details */}
                <Grid size={{xs: 12}}>
                  <TextField
                    fullWidth
                    label="Notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    multiline
                    rows={3}
                    disabled={!isEditing && !isNew}
                  />
                </Grid>

                <Grid size={{xs: 12}}>
                  <TextField
                    fullWidth
                    label="Flight Details"
                    name="flightDetails"
                    value={formData.flightDetails}
                    onChange={handleChange}
                    multiline
                    rows={2}
                    disabled={!isEditing && !isNew}
                  />
                </Grid>

                {/* Submit and Cancel Buttons */}
                <Grid size={{xs: 12}}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    {(isNew || isEditing) && (
                      <>
                        <Button 
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          onClick={isNew ? () => navigate('/bookings') : handleCancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          variant="contained" 
                          color="primary"
                          startIcon={<SaveIcon />}
                        >
                          {isNew ? 'Create Booking' : 'Save Changes'}
                        </Button>
                      </>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        )}

        {/* Payments Tab */}
        {!isNew && activeTab === 1 && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Related Payments</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddPayment}
                size="small"
              >
                Add Payment
              </Button>
            </Box>
            
            {getRelatedPayments().length > 0 ? (
              <List>
                {getRelatedPayments().map(payment => (
                  <ListItem 
                    key={payment.id}
                    component={RouterLink}
                    to={`/payments/${payment.id}`}
                    sx={{ 
                      textDecoration: 'none', 
                      color: 'inherit',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  >
                    <ListItemIcon>
                      <PaymentIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`${payment.description} - ${payment.cost} ${payment.currency}`}
                      secondary={`Payment Date: ${format(new Date(payment.createdAt), 'MMM dd, yyyy')}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">No payments found for this booking.</Typography>
            )}
          </Paper>
        )}

        {/* Service Requests Tab */}
        {!isNew && activeTab === 2 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Related Service Requests</Typography>
            
            {getRelatedServiceRequests().length > 0 ? (
              <List>
                {getRelatedServiceRequests().map(request => (
                  <ListItem 
                    key={request.id}
                    component={RouterLink}
                    to={`/services/requests/${request.id}`}
                    sx={{ 
                      textDecoration: 'none', 
                      color: 'inherit',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  >
                    <ListItemIcon>
                      <ServiceIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`Service Request for ${getApartmentName(request.apartmentId)}`}
                      secondary={`Date: ${format(new Date(request.serviceDate), 'MMM dd, yyyy')} - Status: ${request.status}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={request.status} 
                        color={request.status === 'completed' ? 'success' : request.status === 'pending' ? 'warning' : 'default'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">No service requests found for this booking.</Typography>
            )}
          </Paper>
        )}

        {/* Emails Tab */}
        {!isNew && activeTab === 3 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Related Emails</Typography>
            
            {getRelatedEmails().length > 0 ? (
              <List>
                {getRelatedEmails().map(email => (
                  <ListItem 
                    key={email.id}
                    sx={{ 
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  >
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={email.subject}
                      secondary={`From: ${email.from} | To: ${email.to} | Date: ${format(new Date(email.date), 'MMM dd, yyyy')}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={email.emailType} 
                        color="primary"
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">No emails found for this booking.</Typography>
            )}
          </Paper>
        )}

        {/* Bills Tab */}
        {!isNew && activeTab === 4 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Related Bills</Typography>
            
            {getRelatedBills().length > 0 ? (
              <List>
                {getRelatedBills().map(bill => (
                  <ListItem 
                    key={bill.id}
                    component={RouterLink}
                    to={`/bills/apartment/${bill.apartmentId}`}
                    sx={{ 
                      textDecoration: 'none', 
                      color: 'inherit',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  >
                    <ListItemIcon>
                      <BillIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`${bill.billNumber} - ${bill.description}`}
                      secondary={`Amount: ${bill.totalAmountEGP > 0 ? `${bill.totalAmountEGP} EGP` : `${bill.totalAmountGBP} GBP`} | Due: ${format(new Date(bill.dueDate), 'MMM dd, yyyy')}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={bill.isPaid ? 'Paid' : 'Unpaid'} 
                        color={bill.isPaid ? 'success' : 'error'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">No bills found related to this booking.</Typography>
            )}
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default BookingDetails; 