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
  Grid,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
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
  Cancel as CancelIcon,
  RequestPage as RequestPageIcon,
  Payments as PaymentsIcon,
  ArticleOutlined as BillsIcon,
} from '@mui/icons-material';
import { mockApartments, mockUsers, mockBookings, mockServiceRequests, mockEmails, mockUtilities, mockServiceTypes, mockPayments } from '../mockData';
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
      ownerId: '',
      ownerName: '',
      village: 'Sharm',
      phase: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      status: 'Available',
      payingStatus: 'Non-Payer',
      size: 0,
      bedrooms: 1,
      bathrooms: 1,
      description: '',
      amenities: []
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Get phases for the selected village
  const getPhases = (village: string) => {
    switch (village) {
      case 'Sharm':
        return ['Phase 1', 'Phase 2', 'Phase 3'];
      case 'Luxor':
        return ['Phase 1', 'Phase 2'];
      case 'International Resort':
        return ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];
      default:
        return [];
    }
  };
  
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
    
    // If village changed, reset phase
    if (name === 'village') {
      setFormData(prev => ({ ...prev, phase: '' }));
    }
    
    // If ownerId changed, get the owner name
    if (name === 'ownerId' && value) {
      const owner = mockUsers.find(user => user.id === value);
      if (owner) {
        setFormData(prev => ({ ...prev, ownerName: owner.name }));
      }
    }
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.ownerId) newErrors.ownerId = 'Owner is required';
    if (!formData.village) newErrors.village = 'Village is required';
    if (!formData.phase) newErrors.phase = 'Phase is required';
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
        
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <TextField
            required
            fullWidth
            label="Apartment Name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
          />
          
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
          
          <FormControl fullWidth required error={!!errors.village}>
            <InputLabel>Village</InputLabel>
            <Select
              name="village"
              value={formData.village || ''}
              label="Village"
              onChange={handleSelectChange}
            >
              <MenuItem value="Sharm">Sharm</MenuItem>
              <MenuItem value="Luxor">Luxor</MenuItem>
              <MenuItem value="International Resort">International Resort</MenuItem>
            </Select>
            {errors.village && <FormHelperText>{errors.village}</FormHelperText>}
          </FormControl>
          
          <FormControl fullWidth required error={!!errors.phase}>
            <InputLabel>Apartment Phase</InputLabel>
            <Select
              name="phase"
              value={formData.phase || ''}
              label="Apartment Phase"
              onChange={handleSelectChange}
              disabled={!formData.village}
            >
              {getPhases(formData.village as string).map(phase => (
                <MenuItem key={phase} value={phase}>{phase}</MenuItem>
              ))}
            </Select>
            {errors.phase && <FormHelperText>{errors.phase}</FormHelperText>}
          </FormControl>
          
          <TextField
            required
            label="Purchase Date"
            name="purchaseDate"
            type="date"
            value={formData.purchaseDate || ''}
            onChange={handleChange}
            fullWidth
            error={!!errors.purchaseDate}
            helperText={errors.purchaseDate}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
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
  const utilityReadings = apartment ? mockUtilities.filter(utility => utility.apartmentId === id) : [];
  
  // Get payments for this apartment
  const relatedPayments = apartment ? mockPayments.filter(payment => payment.apartmentId === id) : [];
  
  // Calculate total money spent (sum of all payments)
  const totalMoneySpent = {
    EGP: relatedPayments.filter(p => p.currency === 'EGP').reduce((sum, p) => sum + p.cost, 0),
    GBP: relatedPayments.filter(p => p.currency === 'GBP').reduce((sum, p) => sum + p.cost, 0)
  };
  
  // Calculate total money requested (sum of all service requests)
  const totalMoneyRequested = {
    EGP: relatedServiceRequests.reduce((sum, sr) => {
      const serviceType = mockServiceTypes.find(s => s.id === sr.serviceTypeId);
      return sum + (serviceType?.cost || 0);
    }, 0),
    GBP: 0 // Assuming service costs are in EGP only
  };
  
  // Calculate net money
  const netMoney = {
    EGP: totalMoneyRequested.EGP - totalMoneySpent.EGP,
    GBP: totalMoneyRequested.GBP - totalMoneySpent.GBP
  };
  
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
  
  const handleAddBooking = () => {
    navigate(`/bookings/new?apartmentId=${id}`);
  };
  
  const handleAddEmail = () => {
    navigate(`/emails/new?apartmentId=${id}`);
  };
  
  const handleAddPayment = () => {
    navigate(`/payments/new?apartmentId=${id}&userId=${apartment?.ownerId}`);
  };
  
  const handleRequestService = () => {
    navigate(`/services/requests/create?apartmentId=${id}&userId=${apartment?.ownerId}`);
  };
  
  const handleViewBills = () => {
    navigate(`/payments?apartmentId=${id}`);
  };
  
  // Quick actions for admin
  const quickActions = [
    { icon: <BookingIcon />, name: 'Add a new Booking', onClick: handleAddBooking },
    { icon: <EmailIcon />, name: 'Add a new Email', onClick: handleAddEmail },
    { icon: <PaymentsIcon />, name: 'Add a Payment', onClick: handleAddPayment },
    { icon: <RequestPageIcon />, name: 'Request a Service', onClick: handleRequestService }
  ];
  
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

        {/* Quick actions speed dial (admin only) */}
        {currentUser?.role === 'admin' && (
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
        
        <Paper sx={{ mb: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>
                  Apartment Information
                </Typography>
                <List>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        <HomeIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Apartment Name" 
                      secondary={apartment.name} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        <LocationIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Village" 
                      secondary={apartment.village} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        <ConstructionIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Phase" 
                      secondary={apartment.phase} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        <CalendarIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Purchase Date" 
                      secondary={new Date(apartment.purchaseDate).toLocaleDateString()} 
                    />
                  </ListItem>
                </List>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>
                  Status Information
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Status" 
                      secondary={
                        <Chip 
                          label={apartment.status} 
                          size="small"
                          color={
                            apartment.status === 'Available' ? 'success' :
                            apartment.status === 'Occupied by Owner' ? 'primary' : 'warning'
                          }
                          sx={{ mt: 1 }}
                        />
                      } 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Paying Status" 
                      secondary={
                        <Chip 
                          label={apartment.payingStatus} 
                          size="small"
                          color={
                            apartment.payingStatus === 'Payed By Transfer' ? 'success' :
                            apartment.payingStatus === 'Payed By Rent' ? 'info' : 'error'
                          }
                          sx={{ mt: 1 }}
                        />
                      } 
                    />
                  </ListItem>
                </List>
                
                {/* Apartment Money Section (admin only) */}
                {currentUser?.role === 'admin' && (
                  <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Apartment Money
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Total Money Spent" 
                          secondary={
                            <Box>
                              <Typography variant="body2">EGP: {totalMoneySpent.EGP.toLocaleString()}</Typography>
                              <Typography variant="body2">GBP: {totalMoneySpent.GBP.toLocaleString()}</Typography>
                            </Box>
                          } 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Total Money Requested" 
                          secondary={
                            <Box>
                              <Typography variant="body2">EGP: {totalMoneyRequested.EGP.toLocaleString()}</Typography>
                              <Typography variant="body2">GBP: {totalMoneyRequested.GBP.toLocaleString()}</Typography>
                            </Box>
                          } 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Net Money" 
                          secondary={
                            <Box>
                              <Typography variant="body2" color={netMoney.EGP >= 0 ? 'success.main' : 'error.main'}>
                                EGP: {netMoney.EGP.toLocaleString()}
                              </Typography>
                              <Typography variant="body2" color={netMoney.GBP >= 0 ? 'success.main' : 'error.main'}>
                                GBP: {netMoney.GBP.toLocaleString()}
                              </Typography>
                            </Box>
                          } 
                        />
                      </ListItem>
                    </List>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<BillsIcon />}
                        onClick={handleViewBills}
                        fullWidth
                      >
                        View all Bills
                      </Button>
                    </Box>
                  </Paper>
                )}
              </Grid>
            </Grid>
          </Box>
        </Paper>
        
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {getTabsForUserRole()}
          </Tabs>
          
          {/* Tab panels - using existing implementation */}
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
                      <TableCell>Name</TableCell>
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
                  onClick={handleRequestService}
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
                        <TableCell>Related Booking</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relatedServiceRequests.map(request => {
                        const serviceType = mockServiceTypes.find(type => type.id === request.serviceTypeId);
                        const relatedBooking = request.bookingId ? mockBookings.find(b => b.id === request.bookingId) : null;
                        const bookingUser = relatedBooking ? mockUsers.find(u => u.id === relatedBooking.userId) : null;
                        
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
                            <TableCell>
                              {relatedBooking ? (
                                <Box>
                                  <Typography variant="body2">
                                    {bookingUser?.name || 'Unknown'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(relatedBooking.arrivalDate).toLocaleDateString()} - {new Date(relatedBooking.leavingDate).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              ) : (
                                '-'
                              )}
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
                        <TableCell>Utility</TableCell>
                        <TableCell>Start Reading</TableCell>
                        <TableCell>End Reading</TableCell>
                        <TableCell>Start Date</TableCell>
                        <TableCell>End Date</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {utilityReadings.map(utility => {
                        const booking = utility.bookingId 
                          ? mockBookings.find(b => b.id === utility.bookingId) 
                          : null;
                        return (
                          <TableRow key={utility.id}>
                            <TableCell>
                              {booking 
                                ? `${new Date(booking.arrivalDate).toLocaleDateString()} - ${new Date(booking.leavingDate).toLocaleDateString()}` 
                                : '-'
                              }
                            </TableCell>
                            <TableCell>{utility.utilityType}</TableCell>
                            <TableCell>{utility.startReading}</TableCell>
                            <TableCell>{utility.endReading || '-'}</TableCell>
                            <TableCell>{new Date(utility.startDate).toLocaleDateString()}</TableCell>
                            <TableCell>{utility.endDate ? new Date(utility.endDate).toLocaleDateString() : '-'}</TableCell>
                            <TableCell>
                              {utility.startNotes || utility.endNotes ? (
                                <>
                                  {utility.startNotes && <div>Start: {utility.startNotes}</div>}
                                  {utility.endNotes && <div>End: {utility.endNotes}</div>}
                                </>
                              ) : (
                                '-'
                              )}
                            </TableCell>
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
        </Paper>
      </Box>
    </Container>
  );
}