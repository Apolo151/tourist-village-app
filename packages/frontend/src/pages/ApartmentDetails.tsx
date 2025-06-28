import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Container,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Divider,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  LocationOn as LocationIcon,
  Construction as ConstructionIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  EventAvailable as BookingIcon,
  Engineering as EngineeringIcon,
  Email as EmailIcon,
  WaterDrop as WaterDropIcon,
  Payments as PaymentsIcon,
  RequestPage as RequestPageIcon,
  ArticleOutlined as BillsIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { userService } from '../services/userService';
import type { User } from '../services/userService';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import type { Payment } from '../services/paymentService';
import { serviceRequestService, type ServiceRequest } from '../services/serviceRequestService';
import { utilityReadingService, type UtilityReading } from '../services/utilityReadingService';
import { emailService, type Email } from '../services/emailService';
import Dialog from '@mui/material/Dialog';
import CreateBooking from './CreateBooking';
import CreateEmail from './CreateEmail';
import CreatePayment from './CreatePayment';
import CreateServiceRequest from './CreateServiceRequest';
import CreateUtilityReading from './CreateUtilityReading';

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

export default function ApartmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State for data
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [relatedBookings, setRelatedBookings] = useState<Booking[]>([]);
  const [relatedPayments, setRelatedPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [relatedServiceRequests, setRelatedServiceRequests] = useState<ServiceRequest[]>([]);
  const [relatedUtilityReadings, setRelatedUtilityReadings] = useState<UtilityReading[]>([]);
  const [relatedEmails, setRelatedEmails] = useState<Email[]>([]);

  // Dialog state for quick actions
  const [dialogState, setDialogState] = useState({
    booking: false,
    email: false,
    payment: false,
    serviceRequest: false,
    utilityReading: false
  });

  // Dialog open/close handlers
  const openDialog = (type: keyof typeof dialogState) => setDialogState(prev => ({ ...prev, [type]: true }));
  const closeDialog = (type: keyof typeof dialogState) => setDialogState(prev => ({ ...prev, [type]: false }));

  // Helper to render dialog
  const renderDialog = (type: keyof typeof dialogState, Component: React.ElementType, extraProps = {}) => {
    const dialogProps: any = {
      apartmentId: apartment?.id,
      onSuccess: () => {
        closeDialog(type);
        refreshRelatedData();
      },
      onCancel: () => closeDialog(type),
      lockApartment: true,
      ...extraProps
    };
    // For utilityReading quick action, pass bookingId if only one related booking
    if (type === 'utilityReading' && relatedBookings.length === 1) {
      dialogProps.bookingId = relatedBookings[0].id;
    }
    return (
      <Dialog open={dialogState[type]} onClose={() => closeDialog(type)} maxWidth="md" fullWidth>
        <Component {...dialogProps} />
      </Dialog>
    );
  };

  // Load apartment data
  useEffect(() => {
    const loadApartmentData = async () => {
      if (!id) {
        setError('Apartment ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load apartment details
        const apartmentData = await apartmentService.getApartmentById(parseInt(id));
        setApartment(apartmentData);

        // Load related data in parallel
        const [bookingsResult, paymentsData, ownerData, serviceRequestsData, utilityReadingsData, emailsData] = await Promise.all([
          bookingService.getBookings({ apartment_id: parseInt(id), limit: 50, page: 1 }).then(r => r.bookings).catch(() => []),
          paymentService.getPaymentsByApartment(parseInt(id)).catch(() => []),
          apartmentData?.owner_id ? userService.getUserById(apartmentData.owner_id).catch(() => null) : Promise.resolve(null),
          serviceRequestService.getServiceRequests({ apartment_id: parseInt(id), limit: 100 }).then(r => r.data).catch(() => []),
          utilityReadingService.getUtilityReadings({ apartment_id: parseInt(id), limit: 100 }).then(r => r.data).catch(() => []),
          emailService.getEmails({ apartment_id: parseInt(id), limit: 100 }).then(r => r.data).catch(() => [])
        ]);

        setRelatedBookings((bookingsResult || [])
          .map((booking: any) => ({
            ...booking,
            arrival_date: typeof booking.arrival_date === 'string' ? booking.arrival_date : booking.arrival_date?.toISOString?.() ?? '',
            leaving_date: typeof booking.leaving_date === 'string' ? booking.leaving_date : booking.leaving_date?.toISOString?.() ?? '',
            status: booking.status === 'not_arrived' ? 'has_not_arrived' : booking.status,
            user: booking.user,
            apartment: booking.apartment
          }))
          .sort((a, b) => new Date(b.arrival_date).getTime() - new Date(a.arrival_date).getTime())
        );
        setRelatedPayments(paymentsData);
        setOwner(ownerData);
        setRelatedServiceRequests(serviceRequestsData);
        setRelatedUtilityReadings(utilityReadingsData);
        setRelatedEmails(emailsData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load apartment data');
      } finally {
        setLoading(false);
      }
    };

    loadApartmentData();
  }, [id]);

  // Calculate financial summary
  const totalMoneySpent = {
    EGP: relatedPayments.filter(p => p.currency === 'EGP').reduce((sum, p) => sum + (p.amount || 0), 0),
    GBP: relatedPayments.filter(p => p.currency === 'GBP').reduce((sum, p) => sum + (p.amount || 0), 0)
  };
  
  // For now, using empty values for service requests until implemented
  const totalMoneyRequested = { EGP: 0, GBP: 0 };
  
  const netMoney = {
    EGP: totalMoneyRequested.EGP - totalMoneySpent.EGP,
    GBP: totalMoneyRequested.GBP - totalMoneySpent.GBP
  };
  
  const handleBack = () => navigate('/apartments');
  const handleEdit = () => navigate(`/apartments/${id}/edit`);
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => setTabValue(newValue);

  // Quick actions
  const quickActions = [
    { icon: <BookingIcon />, name: 'Add a new Booking', onClick: () => openDialog('booking'), disabled: !apartment },
    { icon: <EmailIcon />, name: 'Add a new Email', onClick: () => openDialog('email'), disabled: !apartment },
    { icon: <PaymentsIcon />, name: 'Add a Payment', onClick: () => openDialog('payment'), disabled: !apartment },
    { icon: <RequestPageIcon />, name: 'Request a Service', onClick: () => openDialog('serviceRequest'), disabled: !apartment }
  ];
  
  // Helper function to convert paying status for display
  const getPayingStatusDisplay = (status: 'transfer' | 'rent' | 'non-payer') => {
    switch (status) {
      case 'transfer': return 'Payed By Transfer';
      case 'rent': return 'Payed By Rent';
      case 'non-payer': return 'Non-Payer';
      default: return status;
    }
  };

  // Determine tabs based on user role
  const getTabsForUserRole = () => {
    const commonTabs = [
      <Tab key="info" label="Information" icon={<InfoIcon />} iconPosition="start" />,
      <Tab key="owner" label="Owner" icon={<PersonIcon />} iconPosition="start" />
    ];
    
    if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
      return [
        ...commonTabs,
        <Tab key="bookings" label="Bookings" icon={<CalendarIcon />} iconPosition="start" />,
        <Tab key="services" label="Service Requests" icon={<EngineeringIcon />} iconPosition="start" />,
        <Tab key="emails" label="Emails" icon={<EmailIcon />} iconPosition="start" />,
        <Tab key="utilities" label="Utilities" icon={<WaterDropIcon />} iconPosition="start" />
      ];
    }
    
    return commonTabs;
  };

  // Handler to refresh all related data
  const refreshRelatedData = async () => {
    if (!id) return;
    const [bookingsResult, paymentsData, serviceRequestsData, utilityReadingsData, emailsData] = await Promise.all([
      bookingService.getBookings({ apartment_id: parseInt(id), limit: 50, page: 1 }).then(r => r.bookings).catch(() => []),
      paymentService.getPaymentsByApartment(parseInt(id)).catch(() => []),
      serviceRequestService.getServiceRequests({ apartment_id: parseInt(id), limit: 100 }).then(r => r.data).catch(() => []),
      utilityReadingService.getUtilityReadings({ apartment_id: parseInt(id), limit: 100 }).then(r => r.data).catch(() => []),
      emailService.getEmails({ apartment_id: parseInt(id), limit: 100 }).then(r => r.data).catch(() => [])
    ]);
    setRelatedBookings((bookingsResult || [])
      .map((booking: any) => ({
        ...booking,
        arrival_date: typeof booking.arrival_date === 'string' ? booking.arrival_date : booking.arrival_date?.toISOString?.() ?? '',
        leaving_date: typeof booking.leaving_date === 'string' ? booking.leaving_date : booking.leaving_date?.toISOString?.() ?? '',
        status: booking.status === 'not_arrived' ? 'has_not_arrived' : booking.status,
        user: booking.user,
        apartment: booking.apartment
      }))
      .sort((a, b) => new Date(b.arrival_date).getTime() - new Date(a.arrival_date).getTime())
    );
    setRelatedPayments(paymentsData);
    setRelatedServiceRequests(serviceRequestsData);
    setRelatedUtilityReadings(utilityReadingsData);
    setRelatedEmails(emailsData);
  };

  // Show loading state
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Show error state
  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Apartments
        </Button>
      </Container>
    );
  }

  if (!apartment) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>Apartment not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Apartments
        </Button>
      </Container>
    );
  }

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isOwnerOrRenter = currentUser?.role === 'owner' || currentUser?.role === 'renter';

  return (
    <>
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="text" color="primary" startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Back
            </Button>
            <Typography variant="h4" sx={{ mt: 3 }}>
              {apartment.name}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Book Apartment Button for Owner/Renter */}
            {isOwnerOrRenter && (
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<BookingIcon />}
                onClick={() => openDialog('booking')}
              >
                Book Apartment
              </Button>
            )}
          
          {isAdmin && (
            <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
              Edit
            </Button>
          )}
          </Box>
        </Box>

        {/* Quick actions speed dial (admin only) */}
        {isAdmin && (
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
        
        {/* Summary Cards */}
        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: isAdmin ? 2 : 1 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Apartment Information</Typography>
              
                <List>
                  <ListItem>
                  <ListItemAvatar><Avatar><HomeIcon /></Avatar></ListItemAvatar>
                  <ListItemText primary="Apartment Name" secondary={apartment.name} />
                  </ListItem>
                  <ListItem>
                  <ListItemAvatar><Avatar><LocationIcon /></Avatar></ListItemAvatar>
                  <ListItemText primary="Village" secondary={apartment.village?.name || 'Unknown'} />
                  </ListItem>
                  <ListItem>
                  <ListItemAvatar><Avatar><ConstructionIcon /></Avatar></ListItemAvatar>
                  <ListItemText primary="Phase" secondary={`Phase ${apartment.phase}`} />
                  </ListItem>
                {apartment.purchase_date && (
                  <ListItem>
                    <ListItemAvatar><Avatar><CalendarIcon /></Avatar></ListItemAvatar>
                    <ListItemText 
                      primary="Purchase Date" 
                      secondary={new Date(apartment.purchase_date).toLocaleDateString()} 
                    />
                  </ListItem>
                )}
                  <ListItem>
                    <ListItemText 
                      primary="Status" 
                      secondary={
                        <Chip 
                        label={apartment.status || 'Unknown'} 
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
                        label={getPayingStatusDisplay(apartment.paying_status)} 
                          size="small"
                          color={
                          apartment.paying_status === 'transfer' ? 'success' :
                          apartment.paying_status === 'rent' ? 'info' : 'error'
                          }
                          sx={{ mt: 1 }}
                        />
                      } 
                    />
                  </ListItem>
                </List>
            </Paper>
          </Box>
          
          {/* Apartment Money Section (admin only) */}
          {isAdmin && (
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Apartment Money</Typography>
                <Divider sx={{ mb: 2 }} />
                
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
                        onClick={() => navigate(`/bills?apartmentId=${id}`)}
                        fullWidth
                      >
                        View all Bills
                      </Button>
                    </Box>
                  </Paper>
            </Box>
                )}
          </Box>
        
        {/* Detailed Tabs */}
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
          
          {/* Information Tab */}
          <TabPanel value={tabValue} index={0}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Detailed Apartment Information</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                    <Box>
                    <Typography variant="subtitle2" color="text.secondary">Apartment ID</Typography>
                    <Typography variant="body1">{apartment.id}</Typography>
                  </Box>
                    <Box>
                    <Typography variant="subtitle2" color="text.secondary">Village</Typography>
                    <Typography variant="body1">{apartment.village?.name || 'Unknown'}</Typography>
                  </Box>
                    <Box>
                    <Typography variant="subtitle2" color="text.secondary">Phase</Typography>
                    <Typography variant="body1">Phase {apartment.phase}</Typography>
                    </Box>
                    <Box>
                    <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                    <Typography variant="body1">{new Date(apartment.created_at).toLocaleDateString()}</Typography>
                    </Box>
                </Box>
              </CardContent>
            </Card>
          </TabPanel>
          
          {/* Owner Tab */}
          <TabPanel value={tabValue} index={1}>
            {owner ? (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Owner Information</Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                      <Typography variant="body1">{owner.name}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                      <Typography variant="body1">{owner.email}</Typography>
                    </Box>
                    {owner.phone_number && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                        <Typography variant="body1">{owner.phone_number}</Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Role</Typography>
                      <Typography variant="body1">{owner.role}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Alert severity="warning">Owner information not found</Alert>
            )}
          </TabPanel>
          
          {/* Bookings Tab (Admin Only) */}
          {isAdmin && (
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Related Bookings</Typography>
                <Button variant="contained" startIcon={<BookingIcon />} onClick={() => openDialog('booking')}>
                New Booking
              </Button>
            </Box>
            
            {relatedBookings.length > 0 ? (
                <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="bookings table">
                  <TableHead>
                    <TableRow>
                        <TableCell>Person Name</TableCell>
                        <TableCell>User Type</TableCell>
                      <TableCell>Arrival Date</TableCell>
                      <TableCell>Leaving Date</TableCell>
                      <TableCell>Status</TableCell>
                        <TableCell>Number of People</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                      {relatedBookings.map(booking => (
                        <TableRow key={booking.id}>
                          <TableCell>{booking.user?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={booking.user_type} 
                              size="small"
                              color={booking.user_type === 'owner' ? 'primary' : 'secondary'}
                            />
                          </TableCell>
                          <TableCell>{booking.arrival_date}</TableCell>
                          <TableCell>{booking.leaving_date}</TableCell>
                          <TableCell>
                            <Chip 
                              label={booking.status} 
                              color={
                                  booking.status === 'has_not_arrived' ? 'default' : 
                                booking.status === 'in_village' ? 'primary' : 'success'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{booking.number_of_people}</TableCell>
                          <TableCell align="right">
                            <Button size="small" onClick={() => navigate(`/bookings/${booking.id}`)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No bookings found for this apartment</Alert>
            )}
          </TabPanel>
          )}
          
          {/* Service Requests Tab (Admin Only) */}
          {isAdmin && (
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Service Requests</Typography>
                  <Button variant="contained" startIcon={<EngineeringIcon />} onClick={() => openDialog('serviceRequest')}>
                  New Service Request
                </Button>
              </Box>
                {relatedServiceRequests.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="service requests table">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Who Pays</TableCell>
                          <TableCell>Date Created</TableCell>
                          <TableCell>Notes</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {relatedServiceRequests.map(sr => (
                          <TableRow key={sr.id}>
                            <TableCell>{sr.type?.name || sr.type_id}</TableCell>
                            <TableCell>{sr.status}</TableCell>
                            <TableCell>{sr.who_pays}</TableCell>
                            <TableCell>{new Date(sr.date_created).toLocaleDateString()}</TableCell>
                            <TableCell>{sr.notes || '-'}</TableCell>
                            <TableCell align="right">
                              <Button size="small" onClick={() => navigate(`/services/requests/${sr.id}`)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">No service requests found for this apartment</Alert>
                )}
            </TabPanel>
          )}
          
          {/* Emails Tab (Admin Only) */}
          {isAdmin && (
            <TabPanel value={tabValue} index={4}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Related Emails</Typography>
                  <Button variant="contained" startIcon={<EmailIcon />} onClick={() => openDialog('email')}>
                  New Email
                </Button>
              </Box>
                {relatedEmails.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="emails table">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>From</TableCell>
                          <TableCell>To</TableCell>
                          <TableCell>Subject</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {relatedEmails.map(email => (
                          <TableRow key={email.id}>
                            <TableCell>{new Date(email.date).toLocaleDateString()}</TableCell>
                            <TableCell>{email.from}</TableCell>
                            <TableCell>{email.to}</TableCell>
                            <TableCell>{email.subject}</TableCell>
                            <TableCell>{email.type}</TableCell>
                            <TableCell align="right">
                              <Button size="small" onClick={() => navigate(`/emails/${email.id}`)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">No emails found for this apartment</Alert>
                )}
            </TabPanel>
          )}
          
          {/* Utilities Tab (Admin Only) */}
          {isAdmin && (
            <TabPanel value={tabValue} index={5}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Utility Readings</Typography>
                  <Button variant="contained" startIcon={<WaterDropIcon />} onClick={() => openDialog('utilityReading')}>
                  New Reading
                </Button>
              </Box>
                {relatedUtilityReadings.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="utility readings table">
                      <TableHead>
                        <TableRow>
                          <TableCell>Start Date</TableCell>
                          <TableCell>End Date</TableCell>
                          <TableCell>Water Start</TableCell>
                          <TableCell>Water End</TableCell>
                          <TableCell>Electricity Start</TableCell>
                          <TableCell>Electricity End</TableCell>
                          <TableCell>Who Pays</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {relatedUtilityReadings.map(reading => (
                          <TableRow key={reading.id}>
                            <TableCell>{new Date(reading.start_date).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(reading.end_date).toLocaleDateString()}</TableCell>
                            <TableCell>{reading.water_start_reading ?? '-'}</TableCell>
                            <TableCell>{reading.water_end_reading ?? '-'}</TableCell>
                            <TableCell>{reading.electricity_start_reading ?? '-'}</TableCell>
                            <TableCell>{reading.electricity_end_reading ?? '-'}</TableCell>
                            <TableCell>{reading.who_pays}</TableCell>
                            <TableCell align="right">
                              <Button size="small" onClick={() => navigate(`/utilities/${reading.id}`)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
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
      {/* Dialogs */}
      <>
        {renderDialog('booking', CreateBooking)}
        {renderDialog('email', CreateEmail)}
        {renderDialog('payment', CreatePayment)}
        {renderDialog('serviceRequest', CreateServiceRequest)}
        {renderDialog('utilityReading', CreateUtilityReading)}
      </>
    </>
  );
}