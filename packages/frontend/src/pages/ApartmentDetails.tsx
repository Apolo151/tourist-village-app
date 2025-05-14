import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Tabs, 
  Tab, 
  Chip,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Container,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Edit as EditIcon, 
  Person as PersonIcon, 
  CalendarToday as CalendarIcon,
  Email as EmailIcon,
  Engineering as EngineeringIcon,
  WaterDrop as WaterDropIcon,
  ArrowBack as ArrowBackIcon,
  EventAvailable as BookingIcon,
  Info as InfoIcon,
  Home as HomeIcon,
  LocationOn as LocationIcon,
  Construction as ConstructionIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { mockApartments, mockUsers, mockBookings, mockServiceRequests, mockEmails, mockUtilityReadings, mockServiceTypes } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { Apartment } from '../types';

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
      id={`apartment-tabpanel-${index}`}
      aria-labelledby={`apartment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Apartment form for creating/editing apartments
function ApartmentForm({ apartment, isNew, onSave, onCancel }: { 
  apartment: Partial<Apartment> | null, 
  isNew: boolean,
  onSave: (data: Partial<Apartment>) => void,
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<Partial<Apartment>>(
    apartment || {
      name: '',
      city: '',
      address: '',
      ownerId: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      size: 0,
      bedrooms: 1,
      bathrooms: 1,
      description: '',
      amenities: []
    }
  );
  const [amenity, setAmenity] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? '' : Number(value);
    setFormData(prev => ({ ...prev, [name]: numValue }));
  };
  
  const handleAddAmenity = () => {
    if (amenity.trim() === '') return;
    
    setFormData(prev => ({
      ...prev,
      amenities: [...(prev.amenities || []), amenity.trim()]
    }));
    
    setAmenity('');
  };
  
  const handleRemoveAmenity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities?.filter((_, i) => i !== index)
    }));
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.ownerId) newErrors.ownerId = 'Owner is required';
    if (!formData.purchaseDate) newErrors.purchaseDate = 'Purchase date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSave(formData);
    }
  };
  
  // Available owners for selection
  const owners = mockUsers.filter(user => user.role === 'owner');
  
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Basic Information</Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ mb: 3 }}>
          <TextField
            required
            fullWidth
            label="Apartment Name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            sx={{ mb: { xs: 2, md: 0 } }}
          />
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth required error={!!errors.ownerId}>
            <InputLabel>Owner</InputLabel>
            <Select
              name="ownerId"
              value={formData.ownerId || ''}
              label="Owner"
              onChange={handleSelectChange}
            >
              {owners.map(owner => (
                <MenuItem key={owner.id} value={owner.id}>
                  {owner.name}
                </MenuItem>
              ))}
            </Select>
            {errors.ownerId && <FormHelperText>{errors.ownerId}</FormHelperText>}
          </FormControl>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 3 }}>
          <TextField
            required
            fullWidth
            label="City"
            name="city"
            value={formData.city || ''}
            onChange={handleChange}
            error={!!errors.city}
            helperText={errors.city}
            sx={{ mb: { xs: 2, md: 0 } }}
          />
          
          <TextField
            required
            fullWidth
            label="Address"
            name="address"
            value={formData.address || ''}
            onChange={handleChange}
            error={!!errors.address}
            helperText={errors.address}
          />
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <TextField
            required
            fullWidth
            type="date"
            label="Purchase Date"
            name="purchaseDate"
            value={formData.purchaseDate || ''}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            error={!!errors.purchaseDate}
            helperText={errors.purchaseDate}
          />
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Property Details</Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 3 }}>
          <TextField
            fullWidth
            type="number"
            label="Size (m²)"
            name="size"
            value={formData.size === undefined ? '' : formData.size}
            onChange={handleNumberChange}
            InputProps={{
              endAdornment: <InputAdornment position="end">m²</InputAdornment>,
            }}
            sx={{ mb: { xs: 2, md: 0 } }}
          />
          
          <TextField
            fullWidth
            type="number"
            label="Bedrooms"
            name="bedrooms"
            value={formData.bedrooms === undefined ? '' : formData.bedrooms}
            onChange={handleNumberChange}
            inputProps={{ min: 0 }}
            sx={{ mb: { xs: 2, md: 0 } }}
          />
          
          <TextField
            fullWidth
            type="number"
            label="Bathrooms"
            name="bathrooms"
            value={formData.bathrooms === undefined ? '' : formData.bathrooms}
            onChange={handleNumberChange}
            inputProps={{ min: 0 }}
          />
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Enter a detailed description of the apartment"
          />
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Amenities</Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TextField
            fullWidth
            label="Add Amenity"
            value={amenity}
            onChange={(e) => setAmenity(e.target.value)}
            placeholder="e.g., Pool, WiFi, Beach access"
            sx={{ mr: 1 }}
          />
          <Button 
            variant="outlined" 
            onClick={handleAddAmenity}
            disabled={!amenity.trim()}
          >
            Add
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {formData.amenities?.map((item, index) => (
            <Chip
              key={index}
              label={item}
              onDelete={() => handleRemoveAmenity(index)}
            />
          ))}
          {formData.amenities?.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No amenities added yet
            </Typography>
          )}
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Images</Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Alert severity="info" sx={{ mb: 2 }}>
          Image upload functionality would be implemented here. Currently using placeholder images.
        </Alert>
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
          {isNew ? 'Create Apartment' : 'Save Changes'}
        </Button>
      </Box>
    </Box>
  );
}

interface ApartmentDetailsProps {
  isEditing?: boolean;
  isNew?: boolean;
}

export default function ApartmentDetails({ isEditing, isNew }: ApartmentDetailsProps) {
  const { id } = useParams<{ id: string }>();
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Get apartment data
  const apartment = !isNew ? mockApartments.find(apt => apt.id === id) : null;
  
  // Get owner data
  const owner = apartment ? mockUsers.find(user => user.id === apartment.ownerId) : null;
  
  // Get related bookings
  const relatedBookings = apartment ? mockBookings.filter(booking => booking.apartmentId === id) : [];
  
  // Get related service requests
  const relatedServiceRequests = apartment ? mockServiceRequests.filter(req => req.apartmentId === id) : [];
  
  // Get related emails
  const relatedEmails = apartment ? mockEmails.filter(email => email.apartmentId === id) : [];
  
  // Get utility readings
  const utilityReadings = apartment ? mockUtilityReadings.filter(reading => reading.apartmentId === id) : [];
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleEdit = () => {
    navigate(`/apartments/${id}/edit`);
  };
  
  const handleBook = () => {
    navigate(`/bookings/new?apartmentId=${id}`);
  };
  
  const handleSaveApartment = (data: Partial<Apartment>) => {
    // In a real application, this would send data to the backend
    console.log('Saving apartment data:', data);
    
    // Navigate back to apartments list or detail view after saving
    if (isNew) {
      navigate('/apartments');
    } else {
      navigate(`/apartments/${id}`);
    }
  };
  
  const handleCancel = () => {
    // Navigate back without saving
    if (isNew) {
      navigate('/apartments');
    } else {
      navigate(`/apartments/${id}`);
    }
  };
  
  // Show form for new/edit apartment, or error if apartment not found in view mode
  if (isNew || isEditing) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button 
                startIcon={<ArrowBackIcon />} 
                onClick={() => navigate('/apartments')}
                sx={{ mr: 2 }}
              >
                Back
              </Button>
              <Typography variant="h4">
                {isNew ? "Create New Apartment" : `Edit ${apartment?.name || 'Apartment'}`}
              </Typography>
            </Box>
          </Box>
          
          <ApartmentForm 
            apartment={isEditing && apartment ? apartment : null}
            isNew={!!isNew}
            onSave={handleSaveApartment}
            onCancel={handleCancel}
          />
        </Box>
      </Container>
    );
  }
  
  if (!apartment) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>Apartment not found</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/apartments')}
          sx={{ mt: 2 }}
        >
          Back to Apartments
        </Button>
      </Container>
    );
  }

  // Determine which tabs to show based on user role
  const getTabsForUserRole = () => {
    // Tabs common for all users
    const commonTabs = [
      <Tab key="info" label="Information" icon={<InfoIcon />} iconPosition="start" />,
      <Tab key="owner" label="Owner" icon={<PersonIcon />} iconPosition="start" />,
      <Tab key="bookings" label="Bookings" icon={<CalendarIcon />} iconPosition="start" />
    ];
    
    // Additional tabs for admin
    if (currentUser?.role === 'admin') {
      return [
        ...commonTabs,
        <Tab key="services" label="Service Requests" icon={<EngineeringIcon />} iconPosition="start" />,
        <Tab key="emails" label="Emails" icon={<EmailIcon />} iconPosition="start" />,
        <Tab key="utilities" label="Utilities" icon={<WaterDropIcon />} iconPosition="start" />
      ];
    }
    
    return commonTabs;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              startIcon={<ArrowBackIcon />} 
              onClick={() => navigate('/apartments')}
              sx={{ mr: 2 }}
            >
              Back
            </Button>
            <Typography variant="h4">{apartment.name}</Typography>
          </Box>
          
          {currentUser?.role === 'admin' ? (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<BookingIcon />}
              onClick={handleBook}
            >
              Book Now
            </Button>
          )}
        </Box>
        
        <Paper sx={{ mb: 3, overflow: 'hidden' }}>
          <Box sx={{ 
            height: 300, 
            backgroundImage: `url(${apartment.images?.[0] || 'https://via.placeholder.com/1200x400?text=No+Image'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip label={apartment.city} color="primary" />
              {apartment.amenities?.map(amenity => (
                <Chip key={amenity} label={amenity} variant="outlined" size="small" />
              ))}
            </Box>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              {apartment.description || 'No description available.'}
            </Typography>
            
            <Box sx={{ 
              display: 'grid', 
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }
            }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Address
                </Typography>
                <Typography variant="body1">
                  {apartment.address}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Size
                </Typography>
                <Typography variant="body1">
                  {apartment.size} m²
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Purchase Date
                </Typography>
                <Typography variant="body1">
                  {new Date(apartment.purchaseDate).toLocaleDateString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Bedrooms
                </Typography>
                <Typography variant="body1">
                  {apartment.bedrooms}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Bathrooms
                </Typography>
                <Typography variant="body1">
                  {apartment.bathrooms}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="apartment details tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            {getTabsForUserRole()}
          </Tabs>
        </Box>
        
        {/* Information Tab */}
        <TabPanel value={tabValue} index={0}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Apartment Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <HomeIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="subtitle2">Property Type</Typography>
                    <Typography variant="body1">Apartment</Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="subtitle2">Location</Typography>
                    <Typography variant="body1">{apartment.city}, {apartment.address}</Typography>
                  </Box>
                </Box>
                
                {apartment.amenities && apartment.amenities.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Amenities</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {apartment.amenities.map(amenity => (
                        <Chip key={amenity} label={amenity} variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Box>
                )}
                
                {apartment.images && apartment.images.length > 1 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Photos</Typography>
                    <Box sx={{ 
                      display: 'grid', 
                      gap: 1,
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))'
                    }}>
                      {apartment.images.map((image, index) => (
                        <Box 
                          key={index}
                          component="img"
                          src={image || 'https://via.placeholder.com/150x150?text=No+Image'}
                          alt={`Apartment ${index + 1}`}
                          sx={{ 
                            width: '100%', 
                            height: 150, 
                            objectFit: 'cover',
                            borderRadius: 1
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </TabPanel>
        
        {/* Owner Tab */}
        <TabPanel value={tabValue} index={1}>
          {owner ? (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Owner Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ 
                  display: 'grid', 
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }
                }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                    <Typography variant="body1">{owner.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                    <Typography variant="body1">{owner.email}</Typography>
                  </Box>
                  {owner.phone && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                      <Typography variant="body1">{owner.phone}</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Alert severity="warning">Owner information not found</Alert>
          )}
        </TabPanel>
        
        {/* Bookings Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Bookings
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<BookingIcon />}
              onClick={handleBook}
            >
              New Booking
            </Button>
          </Box>
          
          {relatedBookings.length > 0 ? (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table sx={{ minWidth: 650 }} aria-label="bookings table">
                <TableHead>
                  <TableRow>
                    <TableCell>Renter</TableCell>
                    <TableCell>Arrival Date</TableCell>
                    <TableCell>Leaving Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {relatedBookings.map(booking => {
                    const renter = mockUsers.find(user => user.id === booking.userId);
                    return (
                      <TableRow key={booking.id}>
                        <TableCell>{renter?.name || 'Unknown'}</TableCell>
                        <TableCell>{new Date(booking.arrivalDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(booking.leavingDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip 
                            label={booking.state} 
                            color={
                              booking.state === 'notArrived' ? 'default' : 
                              booking.state === 'inVillage' ? 'primary' : 
                              'success'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{new Date(booking.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <Button 
                            size="small" 
                            onClick={() => navigate(`/bookings/${booking.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No bookings found for this apartment</Alert>
          )}
        </TabPanel>
        
        {/* Service Requests Tab (Admin Only) */}
        {currentUser?.role === 'admin' && (
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Service Requests
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<ConstructionIcon />}
                onClick={() => navigate(`/services/new?apartmentId=${id}`)}
              >
                New Service Request
              </Button>
            </Box>
            
            {relatedServiceRequests.length > 0 ? (
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="service requests table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Service Type</TableCell>
                      <TableCell>Request Date</TableCell>
                      <TableCell>Service Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {relatedServiceRequests.map(request => {
                      const serviceType = mockServiceTypes.find(type => type.id === request.serviceTypeId);
                      return (
                        <TableRow key={request.id}>
                          <TableCell>{serviceType?.name || 'Unknown'}</TableCell>
                          <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(request.serviceDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip 
                              label={request.status} 
                              color={
                                request.status === 'pending' ? 'warning' : 
                                request.status === 'completed' ? 'success' : 
                                'error'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{request.notes || '-'}</TableCell>
                          <TableCell align="right">
                            <Button 
                              size="small" 
                              onClick={() => navigate(`/services/${request.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No service requests found for this apartment</Alert>
            )}
          </TabPanel>
        )}
        
        {/* Emails Tab (Admin Only) */}
        {currentUser?.role === 'admin' && (
          <TabPanel value={tabValue} index={4}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Related Emails
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<EmailIcon />}
                onClick={() => navigate(`/emails/new?apartmentId=${id}`)}
              >
                New Email
              </Button>
            </Box>
            
            {relatedEmails.length > 0 ? (
              <List>
                {relatedEmails.map(email => (
                  <Paper key={email.id} sx={{ mb: 2 }}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar><EmailIcon /></Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={email.subject}
                        secondary={
                          <>
                            <Typography component="span" variant="body2">
                              From: {email.from} | To: {email.to}
                            </Typography>
                            <br />
                            <Typography component="span" variant="body2">
                              Date: {new Date(email.date).toLocaleString()}
                            </Typography>
                          </>
                        }
                      />
                      <Button 
                        size="small" 
                        onClick={() => navigate(`/emails/${email.id}`)}
                      >
                        View
                      </Button>
                    </ListItem>
                  </Paper>
                ))}
              </List>
            ) : (
              <Alert severity="info">No emails found for this apartment</Alert>
            )}
          </TabPanel>
        )}
        
        {/* Utilities Tab (Admin Only) */}
        {currentUser?.role === 'admin' && (
          <TabPanel value={tabValue} index={5}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Utility Readings
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<WaterDropIcon />}
                onClick={() => navigate(`/utilities/new?apartmentId=${id}`)}
              >
                New Reading
              </Button>
            </Box>
            
            {utilityReadings.length > 0 ? (
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="utilities table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Booking</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Utility</TableCell>
                      <TableCell>Reading</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {utilityReadings.map(reading => {
                      const booking = reading.bookingId 
                        ? mockBookings.find(b => b.id === reading.bookingId) 
                        : null;
                      return (
                        <TableRow key={reading.id}>
                          <TableCell>
                            {booking 
                              ? `${new Date(booking.arrivalDate).toLocaleDateString()} - ${new Date(booking.leavingDate).toLocaleDateString()}` 
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={reading.type} 
                              color={reading.type === 'start' ? 'primary' : 'secondary'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{reading.utilityType}</TableCell>
                          <TableCell>{reading.value}</TableCell>
                          <TableCell>{new Date(reading.date).toLocaleDateString()}</TableCell>
                          <TableCell>{reading.notes || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No utility readings found for this apartment</Alert>
            )}
          </TabPanel>
        )}
      </Box>
    </Container>
  );
}