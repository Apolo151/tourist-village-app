import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Container,
  Divider,
  Card,
  Alert,
  Grid,
  CircularProgress,
  FormHelperText
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon,
  Email as EmailIcon,
  Visibility as VisibilityIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { mockEmails, mockApartments, mockUsers, mockBookings } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { Email } from '../types';

// Email Form Component for adding or editing emails
function EmailForm({ email, isEdit, onSave, onCancel }: { 
  email?: Email, 
  isEdit: boolean,
  onSave: (data: Partial<Email>) => void,
  onCancel: () => void
}) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const apartmentIdFromUrl = searchParams.get('apartmentId');
  
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<Partial<Email>>(
    email || {
      date: new Date().toISOString().split('T')[0],
      from: currentUser?.email || '',
      to: '',
      subject: '',
      content: '',
      apartmentId: apartmentIdFromUrl || '',
      bookingId: '',
      emailType: 'Inquiry',
      createdById: currentUser?.id || ''
    }
  );
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Get related bookings for the selected apartment
  const relatedBookings = formData.apartmentId 
    ? mockBookings.filter(booking => booking.apartmentId === formData.apartmentId)
    : [];
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If apartment changes, reset the booking
    if (name === 'apartmentId') {
      setFormData(prev => ({ ...prev, bookingId: '' }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.from) newErrors.from = 'Sender is required';
    if (!formData.to) newErrors.to = 'Recipient is required';
    if (!formData.subject) newErrors.subject = 'Subject is required';
    if (!formData.content) newErrors.content = 'Content is required';
    if (!formData.apartmentId) newErrors.apartmentId = 'Related apartment is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.emailType) newErrors.emailType = 'Email type is required';
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.from && !emailRegex.test(formData.from)) {
      newErrors.from = 'Invalid email format';
    }
    if (formData.to && !emailRegex.test(formData.to)) {
      newErrors.to = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSave(formData);
    }
  };
  
  // Look up creator information if available
  const creator = formData.createdById ? mockUsers.find(user => user.id === formData.createdById) : null;
  
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Email Information</Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              required
              fullWidth
              type="date"
              label="Date"
              name="date"
              value={formData.date || ''}
              onChange={handleChange}
              error={!!errors.date}
              helperText={errors.date}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth required error={!!errors.emailType}>
              <InputLabel>Email Type</InputLabel>
              <Select
                name="emailType"
                value={formData.emailType || ''}
                label="Email Type"
                onChange={handleSelectChange}
              >
                <MenuItem value="Complaint">Complaint</MenuItem>
                <MenuItem value="Booking Request">Booking Request</MenuItem>
                <MenuItem value="Service Request">Service Request</MenuItem>
                <MenuItem value="Inquiry">Inquiry</MenuItem>
              </Select>
              {errors.emailType && <FormHelperText>{errors.emailType}</FormHelperText>}
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth required error={!!errors.apartmentId}>
              <InputLabel>Related Apartment</InputLabel>
              <Select
                name="apartmentId"
                value={formData.apartmentId || ''}
                label="Related Apartment"
                onChange={handleSelectChange}
              >
                {mockApartments.map(apt => (
                  <MenuItem key={apt.id} value={apt.id}>{apt.name}</MenuItem>
                ))}
              </Select>
              {errors.apartmentId && <FormHelperText>{errors.apartmentId}</FormHelperText>}
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth disabled={!formData.apartmentId || relatedBookings.length === 0}>
              <InputLabel>Related Booking (Optional)</InputLabel>
              <Select
                name="bookingId"
                value={formData.bookingId || ''}
                label="Related Booking (Optional)"
                onChange={handleSelectChange}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {relatedBookings.map(booking => (
                  <MenuItem key={booking.id} value={booking.id}>
                    {`${new Date(booking.arrivalDate).toLocaleDateString()} - ${new Date(booking.leavingDate).toLocaleDateString()}`}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {!formData.apartmentId 
                  ? 'Select an apartment first' 
                  : relatedBookings.length === 0 
                    ? 'No bookings found for this apartment' 
                    : 'Optional: Select a related booking'}
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              required
              fullWidth
              label="From (Sender)"
              name="from"
              value={formData.from || ''}
              onChange={handleChange}
              error={!!errors.from}
              helperText={errors.from}
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              required
              fullWidth
              label="To (Recipient)"
              name="to"
              value={formData.to || ''}
              onChange={handleChange}
              error={!!errors.to}
              helperText={errors.to}
            />
          </Grid>
          
          <Grid size={12}>
            <TextField
              required
              fullWidth
              label="Subject"
              name="subject"
              value={formData.subject || ''}
              onChange={handleChange}
              error={!!errors.subject}
              helperText={errors.subject}
            />
          </Grid>
          
          {formData.createdById && (
            <Grid size={12}>
              <TextField
                fullWidth
                label="Created By"
                value={creator ? `${creator.name} (${creator.email})` : formData.createdById}
                InputProps={{
                  readOnly: true,
                }}
                variant="filled"
                helperText="User who created this email"
              />
            </Grid>
          )}
          
          <Grid size={12}>
            <TextField
              required
              fullWidth
              multiline
              rows={8}
              label="Content"
              name="content"
              value={formData.content || ''}
              onChange={handleChange}
              error={!!errors.content}
              helperText={errors.content}
              placeholder="Write your email content here..."
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<CancelIcon />}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          startIcon={<SaveIcon />}
        >
          {isEdit ? 'Save Changes' : 'Send Email'}
        </Button>
      </Box>
    </Box>
  );
}

// Email Detail Component
function EmailDetail({ email, onEdit, onBack }: { 
  email: Email, 
  onEdit: () => void,
  onBack: () => void
}) {
  const fromUser = mockUsers.find(user => user.email === email.from);
  const toUser = mockUsers.find(user => user.email === email.to);
  const apartment = mockApartments.find(apt => apt.id === email.apartmentId);
  const booking = email.bookingId ? mockBookings.find(b => b.id === email.bookingId) : null;
  const { currentUser } = useAuth();
  
  // Find creator if available
  const creator = email.createdById ? mockUsers.find(user => user.id === email.createdById) : null;
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="text"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
          >
            Back
          </Button>
          <Typography variant="h4">Email Details</Typography>
        </Box>
        
        {currentUser?.role === 'admin' && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={onEdit}
          >
            Edit
          </Button>
        )}
      </Box>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="text.secondary">Date</Typography>
              <Typography variant="body1">{new Date(email.date).toLocaleDateString()}</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="text.secondary">Email Type</Typography>
              <Typography variant="body1">
                <Chip 
                  label={email.emailType} 
                  size="small"
                  color={
                    email.emailType === 'Complaint' ? 'error' :
                    email.emailType === 'Booking Request' ? 'primary' :
                    email.emailType === 'Service Request' ? 'warning' : 'info'
                  }
                />
              </Typography>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="text.secondary">Related Apartment</Typography>
              <Typography variant="body1">
                <Chip 
                  label={apartment?.name || 'Unknown'} 
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Typography>
            </Grid>
            
            {booking && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Related Booking</Typography>
                <Typography variant="body1">
                  <Chip 
                    label={`${new Date(booking.arrivalDate).toLocaleDateString()} - ${new Date(booking.leavingDate).toLocaleDateString()}`} 
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                </Typography>
              </Grid>
            )}
            
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="text.secondary">From</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EmailIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                <Box>
                  <Typography variant="body1">{fromUser?.name || 'Unknown'}</Typography>
                  <Typography variant="caption" color="text.secondary">{email.from}</Typography>
                </Box>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="text.secondary">To</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EmailIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                <Box>
                  <Typography variant="body1">{toUser?.name || 'Unknown'}</Typography>
                  <Typography variant="caption" color="text.secondary">{email.to}</Typography>
                </Box>
              </Box>
            </Grid>
            
            {email.createdById && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Created By</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body1">{creator?.name || 'Unknown'}</Typography>
                    <Typography variant="caption" color="text.secondary">{creator?.email || email.createdById}</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>Content</Typography>
        <Card variant="outlined" sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {email.content}
          </Typography>
        </Card>
      </Paper>
    </Box>
  );
}

// Main Emails Component
export default function Emails() {
  const [searchTerm, setSearchTerm] = useState('');
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [emailTypeFilter, setEmailTypeFilter] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // Redirect non-admin users
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);
  
  // Show loading while checking permissions
  if (!currentUser) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  // Determine if we're in create mode
  const isCreating = location.pathname === '/emails/new';
  
  // Get email if in detail or edit mode
  const email = id ? mockEmails.find(email => email.id === id) : undefined;
  
  // Filter emails based on search and filters for list view
  const filteredEmails = mockEmails.filter(email => {
    const matchesSearch = 
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesApartment = apartmentFilter ? email.apartmentId === apartmentFilter : true;
    const matchesEmailType = emailTypeFilter ? email.emailType === emailTypeFilter : true;
    
    return matchesSearch && matchesApartment && matchesEmailType;
  });
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleApartmentFilterChange = (event: SelectChangeEvent) => {
    setApartmentFilter(event.target.value);
  };
  
  const handleEmailTypeFilterChange = (event: SelectChangeEvent) => {
    setEmailTypeFilter(event.target.value);
  };
  
  const handleEmailClick = (emailId: string) => {
    navigate(`/emails/${emailId}`);
  };
  
  const handleAddEmail = () => {
    navigate('/emails/new');
  };
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleSaveEmail = (data: Partial<Email>) => {
    console.log('Saving email:', data);
    
    // In a real app, this would send the data to an API
    // For now, just navigate back
    if (isEditing) {
      setIsEditing(false);
      navigate(`/emails/${id}`);
    } else {
      navigate('/emails');
    }
  };
  
  const handleCancelEdit = () => {
    if (isEditing) {
      setIsEditing(false);
      navigate(`/emails/${id}`);
    } else {
      navigate('/emails');
    }
  };
  
  // Helper function to get user's name from email
  const getUserNameFromEmail = (email: string): string => {
    const user = mockUsers.find(user => user.email === email);
    return user ? user.name : email;
  };
  
  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Render the appropriate view based on the current mode
  // 1. Email Form (Create/Edit)
  if (isCreating || isEditing) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Typography variant="h4" sx={{ mb: 3 }}>
            {isEditing ? 'Edit Email' : 'Create New Email'}
          </Typography>
          
          <EmailForm 
            email={isEditing ? email : undefined}
            isEdit={isEditing}
            onSave={handleSaveEmail}
            onCancel={handleCancelEdit}
          />
        </Box>
      </Container>
    );
  }
  
  // 2. Email Detail View
  if (id && email) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <EmailDetail 
            email={email}
            onEdit={handleEdit}
            onBack={handleBack}
          />
        </Box>
      </Container>
    );
  }
  
  // 3. Email Not Found
  if (id && !email) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>Email not found</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Back to Emails
          </Button>
        </Box>
      </Container>
    );
  }
  
  // 4. Email List View (default)
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Emails</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddEmail}
          >
            Add a new Email
          </Button>
        </Box>
        
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="Search"
              variant="outlined"
              size="small"
              sx={{ flexGrow: 1, minWidth: '200px' }}
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              placeholder="Search by subject, sender, receiver or content"
            />
            
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Apartment</InputLabel>
              <Select
                value={apartmentFilter}
                label="Apartment"
                onChange={handleApartmentFilterChange}
              >
                <MenuItem value="">
                  <em>All Apartments</em>
                </MenuItem>
                {mockApartments.map(apt => (
                  <MenuItem key={apt.id} value={apt.id}>{apt.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Email Type</InputLabel>
              <Select
                value={emailTypeFilter}
                label="Email Type"
                onChange={handleEmailTypeFilterChange}
              >
                <MenuItem value="">
                  <em>All Types</em>
                </MenuItem>
                <MenuItem value="Complaint">Complaint</MenuItem>
                <MenuItem value="Booking Request">Booking Request</MenuItem>
                <MenuItem value="Service Request">Service Request</MenuItem>
                <MenuItem value="Inquiry">Inquiry</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="10%">Date</TableCell>
                <TableCell width="18%">From</TableCell>
                <TableCell width="18%">To</TableCell>
                <TableCell width="18%">Subject</TableCell>
                <TableCell width="12%">Type</TableCell>
                <TableCell width="14%">Apartment</TableCell>
                <TableCell width="10%">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmails.length > 0 ? (
                filteredEmails.map(email => {
                  const apartment = mockApartments.find(apt => apt.id === email.apartmentId);
                  const fromName = getUserNameFromEmail(email.from);
                  const toName = getUserNameFromEmail(email.to);
                  
                  return (
                    <TableRow 
                      key={email.id} 
                      hover 
                      onClick={() => handleEmailClick(email.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{new Date(email.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <EmailIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                          <Box>
                            <Typography variant="body2">{fromName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {truncateText(email.from, 20)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{toName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {truncateText(email.to, 20)}
                        </Typography>
                      </TableCell>
                      <TableCell>{truncateText(email.subject, 30)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={email.emailType} 
                          size="small"
                          color={
                            email.emailType === 'Complaint' ? 'error' :
                            email.emailType === 'Booking Request' ? 'primary' :
                            email.emailType === 'Service Request' ? 'warning' : 'info'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={apartment?.name || 'Unknown'} 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Email">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmailClick(email.id);
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No emails found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
} 