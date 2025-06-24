import React, { useState, useEffect } from 'react';
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
  FormHelperText
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../context/AuthContext';
import { emailService } from '../services/emailService';
import type { CreateEmailRequest, UpdateEmailRequest, Email, UIEmailType, BackendEmailType } from '../services/emailService';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';

export interface CreateEmailProps {
  apartmentId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  lockApartment?: boolean;
}

const CreateEmail: React.FC<CreateEmailProps> = ({ apartmentId, onSuccess, onCancel, lockApartment }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // Determine mode based on URL
  const isEditing = Boolean(id) && location.pathname.includes('/edit');
  const isViewing = Boolean(id) && !location.pathname.includes('/edit');
  const isCreating = !Boolean(id);

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Data
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [email, setEmail] = useState<Email | null>(null);

  // Form data
  const [formData, setFormData] = useState<CreateEmailRequest>({
    apartment_id: undefined as any,
    booking_id: undefined,
    date: new Date().toISOString().split('T')[0],
    from: currentUser?.email || '',
    to: '',
    subject: '',
    content: '',
    type: 'inquiry' as BackendEmailType
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Selected date for date picker
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Check admin access
  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      navigate('/unauthorized');
    }
  }, [currentUser?.role, navigate]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Load apartments and bookings
        const [apartmentsData, bookingsData] = await Promise.all([
          apartmentService.getApartments({ limit: 100 }),
          bookingService.getBookings({ limit: 100 })
        ]);
        
        setApartments(apartmentsData.data);
        setBookings(bookingsData.bookings);

        // If editing or viewing, load the email
        if ((isEditing || isViewing) && id) {
          const emailData = await emailService.getEmailById(parseInt(id));
          setEmail(emailData);
          
          // Populate form with email data
          setFormData({
            apartment_id: emailData.apartment_id,
            booking_id: emailData.booking_id,
            date: emailData.date.split('T')[0], // Convert to YYYY-MM-DD format
            from: emailData.from,
            to: emailData.to,
            subject: emailData.subject,
            content: emailData.content,
            type: emailData.type
          });
          
          setSelectedDate(new Date(emailData.date));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isEditing, isViewing, id]);

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
      setFormData(prev => ({ 
        ...prev, 
        apartment_id: value ? parseInt(value) : undefined as any,
        booking_id: undefined // Reset booking when apartment changes
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

  // Get bookings for selected apartment
  const getRelatedBookings = () => {
    if (!formData.apartment_id || !bookings || !Array.isArray(bookings)) {
      return [];
    }
    return bookings.filter(booking => booking.apartment_id === formData.apartment_id);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      if (isEditing && id) {
        // Update existing email
        const updateData: UpdateEmailRequest = {
          apartment_id: formData.apartment_id,
          booking_id: formData.booking_id,
          date: formData.date,
          from: formData.from,
          to: formData.to,
          subject: formData.subject,
          content: formData.content,
          type: formData.type
        };
        
        await emailService.updateEmail(parseInt(id), updateData);
      } else {
        // Create new email
        await emailService.createEmail(formData);
      }
      
      setSaveSuccess(true);
      
      // Navigate back to emails list after a short delay
      setTimeout(() => {
        navigate('/emails');
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save email');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/emails');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {isViewing ? 'View Email' : isEditing ? 'Edit Email' : 'Create New Email'}
        </Typography>
        {isViewing && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/emails/${id}/edit`)}
          >
            Edit Email
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Email {isEditing ? 'updated' : 'created'} successfully! Redirecting...
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
                  disabled={isViewing}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!formErrors.date,
                      helperText: formErrors.date,
                      required: !isViewing
                    }
                  }}
                />
              </Grid>

              {/* Email Type */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth error={!!formErrors.type} required={!isViewing}>
                  <InputLabel>Email Type</InputLabel>
                  <Select
                    name="type"
                    value={emailService.getEmailTypeDisplayName(formData.type)}
                    onChange={handleSelectChange}
                    label={isViewing ? "Email Type" : "Email Type *"}
                    disabled={isViewing}
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

              {/* Apartment */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth error={!!formErrors.apartment_id} required={!isViewing}>
                  <InputLabel>Related Apartment</InputLabel>
                  <Select
                    name="apartment_id"
                    value={formData.apartment_id ? formData.apartment_id.toString() : ''}
                    onChange={handleSelectChange}
                    label={isViewing ? "Related Apartment" : "Related Apartment *"}
                    disabled={isViewing}
                  >
                    <MenuItem value="">Select an apartment</MenuItem>
                    {apartments.map(apartment => (
                      <MenuItem key={apartment.id} value={apartment.id.toString()}>
                        {apartment.name} - {apartment.village?.name} (Phase {apartment.phase})
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.apartment_id && <FormHelperText>{formErrors.apartment_id}</FormHelperText>}
                </FormControl>
              </Grid>

              {/* Booking (Optional) */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth error={!!formErrors.booking_id} disabled={!formData.apartment_id || isViewing}>
                  <InputLabel>Related Booking (Optional)</InputLabel>
                  <Select
                    name="booking_id"
                    value={formData.booking_id?.toString() || ''}
                    onChange={handleSelectChange}
                    label="Related Booking (Optional)"
                  >
                    <MenuItem value="">No related booking</MenuItem>
                    {getRelatedBookings().map(booking => (
                      <MenuItem key={booking.id} value={booking.id.toString()}>
                        Booking #{booking.id} - {booking.user?.name} ({booking.user_type})
                      </MenuItem>
                    ))}
                  </Select>
                  {!formData.apartment_id && (
                    <FormHelperText>Select an apartment first to see related bookings</FormHelperText>
                  )}
                  {formData.apartment_id && getRelatedBookings().length === 0 && (
                    <FormHelperText>No bookings found for this apartment</FormHelperText>
                  )}
                  {formErrors.booking_id && <FormHelperText>{formErrors.booking_id}</FormHelperText>}
                </FormControl>
              </Grid>

              {/* From */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="from"
                  label={isViewing ? "From" : "From *"}
                  type="email"
                  value={formData.from}
                  onChange={handleInputChange}
                  error={!!formErrors.from}
                  helperText={formErrors.from}
                  fullWidth
                  required={!isViewing}
                  disabled={isViewing}
                />
              </Grid>

              {/* To */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="to"
                  label={isViewing ? "To" : "To *"}
                  type="email"
                  value={formData.to}
                  onChange={handleInputChange}
                  error={!!formErrors.to}
                  helperText={formErrors.to}
                  fullWidth
                  required={!isViewing}
                  disabled={isViewing}
                />
              </Grid>

              {/* Subject */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  name="subject"
                  label={isViewing ? "Subject" : "Subject *"}
                  value={formData.subject}
                  onChange={handleInputChange}
                  error={!!formErrors.subject}
                  helperText={formErrors.subject}
                  fullWidth
                  required={!isViewing}
                  disabled={isViewing}
                />
              </Grid>

              {/* Content */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  name="content"
                  label={isViewing ? "Email Content" : "Email Content *"}
                  value={formData.content}
                  onChange={handleInputChange}
                  error={!!formErrors.content}
                  helperText={formErrors.content}
                  fullWidth
                  required={!isViewing}
                  multiline
                  rows={6}
                  disabled={isViewing}
                />
              </Grid>

              {/* Action Buttons */}
              {!isViewing && (
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : (isEditing ? 'Update Email' : 'Create Email')}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleBack}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Grid>
              )}
            </Grid>
          </form>
        </LocalizationProvider>
      </Paper>
    </Box>
  );
};

export default CreateEmail; 