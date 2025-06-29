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
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';
import { userService } from '../services/userService';
import type { User } from '../services/userService';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import SearchableDropdown from '../components/SearchableDropdown';

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

  // Form data
  const [formData, setFormData] = useState<CreateEmailRequest>({
    apartment_id: apartmentId || undefined as any,
    booking_id: bookingId || undefined,
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
        // Load apartments, bookings, users
        const [apartmentsData, bookingsData, usersData] = await Promise.all([
          apartmentService.getApartments({ limit: 100 }),
          bookingService.getBookings({ limit: 100 }),
          userService.getUsers({ limit: 100 })
        ]);
        setApartments(apartmentsData.data);
        setBookings(bookingsData.bookings);
        setUsers(usersData.data);
        // Only fetch email details if id is present AND in edit or view mode (not quick action/modal)
        if (id && !onSuccess && !onCancel) {
          setLoading(true);
          const emailData = await emailService.getEmailById(parseInt(id));
          setFormData({ ...emailData });
        } else {
          // Prefill apartment if provided (create/quick action mode)
          if (apartmentId) {
            setFormData(prev => ({ ...prev, apartment_id: apartmentId }));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [id, apartmentId]);

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
      setSubmitting(true);
      
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
        // Create new email (quick action)
        const createData: CreateEmailRequest = {
          apartment_id: formData.apartment_id,
          date: formData.date,
          from: formData.from,
          to: formData.to,
          subject: formData.subject,
          content: formData.content,
          type: formData.type,
          ...(formData.booking_id ? { booking_id: formData.booking_id } : {})
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
  const fieldsLocked = isViewing && !onSuccess && !onCancel;

  // Apartment field: lock if lockApartment is true and apartmentId is provided
  const apartmentFieldLocked = lockApartment && apartmentId !== undefined;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ width: '100%', mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ flex: 1 }}>
          {id ? (isViewing ? 'View Email' : isEditing ? 'Edit Email' : 'Create New Email') : 'Create New Email'}
        </Typography>
        {isViewing && !onSuccess && !onCancel && (
            <>
          <Button
            startIcon={<EditIcon />}
            onClick={() => navigate(`/emails/${id}/edit`)}
            sx={{ ml: 2 }}
          >
            Edit
          </Button>
              <Button
                startIcon={<DeleteIcon />}
                color="error"
                variant="contained"
                onClick={() => setDeleteDialogOpen(true)}
                sx={{ ml: 2 }}
              >
                Delete
              </Button>
            </>
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
                  disabled={fieldsLocked}
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
              {/* Apartment */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <SearchableDropdown
                  options={apartments.map(apartment => ({
                    id: apartment.id,
                    label: `${apartment.name} - ${apartment.village?.name} (Phase ${apartment.phase})`,
                    name: apartment.name,
                    village: apartment.village,
                    phase: apartment.phase
                  }))}
                  value={formData.apartment_id || null}
                  onChange={(value) => handleSelectChange({ target: { name: 'apartment_id', value: value?.toString() || '' } })}
                  label="Related Apartment"
                  placeholder="Search apartments by name..."
                  required
                  disabled={apartmentFieldLocked}
                  error={!!formErrors.apartment_id}
                  helperText={formErrors.apartment_id}
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
                />
              </Grid>
              {/* Booking (Optional) */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <SearchableDropdown
                  options={[
                    { id: '', label: 'No related booking', name: 'No related booking' },
                    ...getRelatedBookings().map(booking => ({
                      id: booking.id,
                      label: `Booking #${booking.id} - ${booking.user?.name} (${booking.user_type})`,
                      name: booking.user?.name || 'Unknown',
                      user_type: booking.user_type,
                      booking_id: booking.id
                    }))
                  ]}
                  value={formData.booking_id || null}
                  onChange={(value) => handleSelectChange({ target: { name: 'booking_id', value: value?.toString() || '' } })}
                  label="Related Booking (Optional)"
                  placeholder="Search bookings by user name..."
                  disabled={!formData.apartment_id}
                  error={!!formErrors.booking_id}
                  helperText={formErrors.booking_id || (!formData.apartment_id ? 'Select an apartment first to see related bookings' : getRelatedBookings().length === 0 ? 'No bookings found for this apartment' : '')}
                  getOptionLabel={(option) => option.label}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body1">{option.name}</Typography>
                        {option.user_type && (
                          <Typography variant="body2" color="text.secondary">
                            Booking #{option.booking_id} ({option.user_type})
                          </Typography>
                        )}
                      </Box>
                    </li>
                  )}
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
              {/* Action Buttons */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : (id && isEditing ? 'Update Email' : 'Create Email')}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleBack}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </LocalizationProvider>
      </Paper>

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
    </Container>
  );
};

export default CreateEmail; 