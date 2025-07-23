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
  Delete as DeleteIcon,
  Info as InfoIcon,
  EventAvailable as BookingIcon,
  Engineering as EngineeringIcon,
  Email as EmailIcon,
  WaterDrop as WaterDropIcon,
  Payments as PaymentsIcon,
  RequestPage as RequestPageIcon,
  ArticleOutlined as InvoiceIcon,
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
import {
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import CreateBooking from './CreateBooking';
import CreateEmail from './CreateEmail';
import CreatePayment from './CreatePayment';
import CreateServiceRequest from './CreateServiceRequest';
import CreateUtilityReading from './CreateUtilityReading';
import { invoiceService } from '../services/invoiceService';

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
  const [financialSummary, setFinancialSummary] = useState<{
    total_money_spent: { EGP: number; GBP: number };
    total_money_requested: { EGP: number; GBP: number };
    net_money: { EGP: number; GBP: number };
  } | null>(null);
  const [relatedInvoices, setRelatedInvoices] = useState<any[]>([]);

  // Dialog state for quick actions
  const [dialogState, setDialogState] = useState({
    booking: false,
    email: false,
    payment: false,
    serviceRequest: false,
    utilityReading: false
  });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Owner details dialog state
  const [showOwnerDetails, setShowOwnerDetails] = useState(false);

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

    // Add specific props for service requests
    if (type === 'serviceRequest' && apartment) {
      dialogProps.whoPays = 'owner'; // Default to owner for apartment-level service requests
      dialogProps.disableEditMode = true; // Disable edit mode when used in dialog
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

        // Load financial summary
        try {
          const summary = await apartmentService.getApartmentFinancialSummary(parseInt(id));
          setFinancialSummary({
            total_money_spent: summary.total_money_spent,
            total_money_requested: summary.total_money_requested,
            net_money: summary.net_money
          });
        } catch (e) {
          setFinancialSummary(null);
        }

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
            status: booking.status,
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

        // Fetch invoices for this apartment
        try {
          const invoiceDetails = await invoiceService.getApartmentDetails(parseInt(id));
          setRelatedInvoices(invoiceDetails.invoices || []);
        } catch (e) {
          setRelatedInvoices([]);
        }

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

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!apartment) return;
    
    try {
      setDeleting(true);
      await apartmentService.deleteApartment(apartment.id);
      setDeleteDialogOpen(false);
      navigate('/apartments?success=true&message=Apartment%20deleted%20successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete apartment');
    } finally {
      setDeleting(false);
    }
  };

  // Automated Apartment Status logic
  const getAutomatedApartmentStatus = () => {
    if (!relatedBookings.length) return 'Available';
    if (relatedBookings.some(b => b.status === 'Checked In')) return 'Not Available';
    return 'Available';
  };

  // Quick actions
  const quickActions = [
    { icon: <BookingIcon />, name: 'Add a new Booking', onClick: () => openDialog('booking'), disabled: !apartment },
    { icon: <EmailIcon />, name: 'Add a new Email', onClick: () => openDialog('email'), disabled: !apartment },
    { icon: <PaymentsIcon />, name: 'Add a Payment', onClick: () => openDialog('payment'), disabled: !apartment },
    { icon: <RequestPageIcon />, name: 'Request a Service', onClick: () => openDialog('serviceRequest'), disabled: !apartment }
  ];
  
  // Helper function to convert paying status for display
  const getPayingStatusDisplay = (apartment: Apartment) => {
    return apartmentService.getPayingStatusDisplayName(apartment);
  };

  const getSalesStatusDisplay = (apartment: Apartment) => {
    return apartmentService.getSalesStatusDisplayName(apartment);
  };

  const getPayingStatusColor = (apartment: Apartment) => {
    return apartmentService.getPayingStatusColor(apartment);
  };

  const getSalesStatusColor = (apartment: Apartment) => {
    return apartmentService.getSalesStatusColor(apartment);
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
        <Tab key="payments" label="Payments" icon={<PaymentsIcon />} iconPosition="start" />,
        <Tab key="services" label="Service Requests" icon={<EngineeringIcon />} iconPosition="start" />,
        <Tab key="emails" label="Emails" icon={<EmailIcon />} iconPosition="start" />,
        <Tab key="utilities" label="Utilities" icon={<WaterDropIcon />} iconPosition="start" />,
        <Tab key="invoices" label="Invoices" icon={<InvoiceIcon />} iconPosition="start" />
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
        status: booking.status,
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
            <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
              Edit
            </Button>
              <Button 
                variant="contained" 
                color="error" 
                startIcon={<DeleteIcon />} 
                onClick={handleDelete}
              >
                Delete
              </Button>
            </Box>
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
                  <ListItemText primary="Project" secondary={apartment.village?.name || 'Unknown'} />
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
                          label={getAutomatedApartmentStatus()} 
                          size="small"
                          color={
                            getAutomatedApartmentStatus() === 'Available' ? 'success' : 'warning'
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
                        label={getPayingStatusDisplay(apartment)} 
                          size="small"
                          color={
                            getPayingStatusColor(apartment) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
                          }
                          sx={{ mt: 1 }}
                        />
                      } 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Sales Status"
                      secondary={
                        <Chip
                          label={getSalesStatusDisplay(apartment)}
                          color={
                            getSalesStatusColor(apartment) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
                          }
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar><Avatar><PersonIcon /></Avatar></ListItemAvatar>
                    <ListItemText 
                      primary="Created By" 
                      secondary={apartment.created_by_user?.name || 'Unknown User'} 
                    />
                  </ListItem>
                </List>
            </Paper>
          </Box>
          
          {/* Apartment Balance Section (admin only) */}
          {isAdmin && (
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Apartment Balance</Typography>
                <Divider sx={{ mb: 2 }} />
                
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Total Payment" 
                          secondary={
                            financialSummary ? (
                            <Box>
                                <Typography variant="body2">EGP: {financialSummary.total_money_spent.EGP.toLocaleString()}</Typography>
                                <Typography variant="body2">GBP: {financialSummary.total_money_spent.GBP.toLocaleString()}</Typography>
                            </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">Loading...</Typography>
                            )
                          } 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Total Outstanding" 
                          secondary={
                            financialSummary ? (
                            <Box>
                                <Typography variant="body2">EGP: {financialSummary.total_money_requested.EGP.toLocaleString()}</Typography>
                                <Typography variant="body2">GBP: {financialSummary.total_money_requested.GBP.toLocaleString()}</Typography>
                            </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">Loading...</Typography>
                            )
                          } 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Net Balance" 
                          secondary={
                            financialSummary ? (
                            <Box>
                                <Typography variant="body2" color={financialSummary.net_money.EGP >= 0 ? 'success.main' : 'error.main'}>
                                  EGP: {financialSummary.net_money.EGP.toLocaleString()}
                              </Typography>
                                <Typography variant="body2" color={financialSummary.net_money.GBP >= 0 ? 'success.main' : 'error.main'}>
                                  GBP: {financialSummary.net_money.GBP.toLocaleString()}
                              </Typography>
                            </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">Loading...</Typography>
                            )
                          } 
                        />
                      </ListItem>
                    </List>
                
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<InvoiceIcon />}
                        onClick={() => navigate(`/invoices?apartmentId=${id}`)}
                        fullWidth
                      >
                        View all Invoices
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
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
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
                    <Typography variant="subtitle2" color="text.secondary">Project</Typography>
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
                  <Button sx={{ mt: 2 }} variant="outlined" onClick={() => setShowOwnerDetails(true)}>
                    More Details
                  </Button>
                  <Dialog open={showOwnerDetails} onClose={() => setShowOwnerDetails(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Owner Details</DialogTitle>
                    <DialogContent>
                      <List>
                        <ListItem><ListItemText primary="Name" secondary={owner.name} /></ListItem>
                        <ListItem><ListItemText primary="Email" secondary={owner.email} /></ListItem>
                        {owner.phone_number && <ListItem><ListItemText primary="Phone" secondary={owner.phone_number} /></ListItem>}
                        <ListItem><ListItemText primary="Role" secondary={owner.role} /></ListItem>
                        <ListItem><ListItemText primary="Active" secondary={owner.is_active ? 'Yes' : 'No'} /></ListItem>
                        {owner.passport_number && <ListItem><ListItemText primary="Passport Number" secondary={owner.passport_number} /></ListItem>}
                        {owner.passport_expiry_date && <ListItem><ListItemText primary="Passport Expiry Date" secondary={owner.passport_expiry_date} /></ListItem>}
                        {owner.address && <ListItem><ListItemText primary="Address" secondary={owner.address} /></ListItem>}
                        {owner.next_of_kin_name && <ListItem><ListItemText primary="Next of Kin Name" secondary={owner.next_of_kin_name} /></ListItem>}
                        {owner.next_of_kin_address && <ListItem><ListItemText primary="Next of Kin Address" secondary={owner.next_of_kin_address} /></ListItem>}
                        {owner.next_of_kin_email && <ListItem><ListItemText primary="Next of Kin Email" secondary={owner.next_of_kin_email} /></ListItem>}
                        {owner.next_of_kin_phone && <ListItem><ListItemText primary="Next of Kin Phone" secondary={owner.next_of_kin_phone} /></ListItem>}
                        {owner.next_of_kin_will && <ListItem><ListItemText primary="Next of Kin Will" secondary={owner.next_of_kin_will} /></ListItem>}
                      </List>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setShowOwnerDetails(false)}>Close</Button>
                    </DialogActions>
                  </Dialog>
                </CardContent>
              </Card>
            ) : (
              <Alert severity="warning">Owner information not found</Alert>
            )}
          </TabPanel>
          
          {/* Bookings Tab (Admin Only) */}
          {isAdmin && (
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
                <Typography variant="h6">Related Bookings</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" startIcon={<BookingIcon />} onClick={() => openDialog('booking')}>
                    New Booking
                  </Button>
                </Box>
            </Box>
            
            {relatedBookings.length > 0 ? (
                <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="bookings table">
                  <TableHead>
                    <TableRow>
                        <TableCell>Person Name</TableCell>
                        <TableCell>User Type</TableCell>
                      <TableCell>Arrival Date</TableCell>
                      <TableCell>Departure Date</TableCell>
                      <TableCell>Reservation Date</TableCell>
                      <TableCell>Status</TableCell>
                        {/* <TableCell>Number of People</TableCell> */}
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                      {relatedBookings.map(booking => (
                        <TableRow key={booking.id}>
                          <TableCell>{booking.user?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={booking.user_type === 'owner' ? 'Owner' : 'Tenant'} 
                              size="small"
                              color={booking.user_type === 'owner' ? 'primary' : 'secondary'}
                            />
                          </TableCell>
                          <TableCell>{booking.arrival_date}</TableCell>
                          <TableCell>{booking.leaving_date}</TableCell>
                          <TableCell>{new Date(booking.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip 
                              label={booking.status} 
                              color={
                                  booking.status === 'Booked' ? 'info' : 
                                booking.status === 'Checked In' ? 'success' : 
                                booking.status === 'Checked Out' ? 'default' : 'error'
                              }
                              size="small"
                            />
                          </TableCell>
                          {/* <TableCell>{booking.number_of_people}</TableCell> */}
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
          
          {/* Payments Tab (Admin Only) */}
          {isAdmin && (
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
                <Typography variant="h6">Related Payments</Typography>
                <Button variant="contained" startIcon={<PaymentsIcon />} onClick={() => openDialog('payment')}>
                  Add Payment
                </Button>
              </Box>
              {relatedPayments.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table sx={{ minWidth: 650 }} aria-label="payments table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Currency</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relatedPayments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                          <TableCell>{payment.amount}</TableCell>
                          <TableCell>{payment.currency}</TableCell>
                          <TableCell>{typeof payment.payment_method === 'string' ? payment.payment_method : payment.payment_method?.name || '-'}</TableCell>
                          <TableCell>{payment.description || '-'}</TableCell>
                          <TableCell align="right">
                            <Button size="small" onClick={() => navigate(`/payments/${payment.id}`)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No payments found for this apartment</Alert>
              )}
            </TabPanel>
          )}
          
          {/* Invoices Tab (Admin Only) */}
          {isAdmin && (
            <TabPanel value={tabValue} index={7}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
                <Typography variant="h6">Related Invoices</Typography>
                <Button variant="outlined" startIcon={<InvoiceIcon />} onClick={() => navigate(`/invoices?apartmentId=${apartment.id}`)}>
                  View All Invoices
                </Button>
              </Box>
              {relatedInvoices.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table sx={{ minWidth: 650 }} aria-label="invoices table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Currency</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relatedInvoices.map(invoice => (
                        <TableRow key={invoice.id}>
                          <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                          <TableCell>{invoice.type}</TableCell>
                          <TableCell>{invoice.amount}</TableCell>
                          <TableCell>{invoice.currency}</TableCell>
                          <TableCell>{invoice.description || '-'}</TableCell>
                          <TableCell align="right">
                            <Button size="small" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No invoices found for this apartment</Alert>
              )}
            </TabPanel>
          )}
          
          {/* Service Requests Tab (Admin Only) */}
          {isAdmin && (
            <TabPanel value={tabValue} index={4}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
                <Typography variant="h6">Related Service Requests</Typography>
                <Button variant="contained" startIcon={<EngineeringIcon />} onClick={() => openDialog('serviceRequest')}>
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
                          <TableCell>Action Date</TableCell>
                          <TableCell>Cost</TableCell>
                          <TableCell>Paid By</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Notes</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {relatedServiceRequests.map((request: any) => (
                          <TableRow key={request.id}>
                            <TableCell>{request.service_type_name || request.type?.name || request.type_id}</TableCell>
                            <TableCell>{new Date(request.date_created).toLocaleDateString()}</TableCell>
                            <TableCell>{request.date_action ? new Date(request.date_action).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell>{request.cost} {request.currency}</TableCell>
                            <TableCell>{request.who_pays || 'N/A'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={request.status || 'Pending'} 
                                size="small"
                                color={request.status === 'Done' ? 'success' : request.status === 'In Progress' ? 'warning' : 'default'}
                              />
                            </TableCell>
                            <TableCell>{request.notes || '-'}</TableCell>
                            <TableCell align="right">
                              <Button size="small" onClick={() => navigate(`/services/requests/${request.id}`)}>
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
            <TabPanel value={tabValue} index={5}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
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
            <TabPanel value={tabValue} index={6}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Apartment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the apartment "{apartment?.name}"? 
            This action cannot be undone and will also delete all related bookings, payments, and service requests.
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
    </>
  );
}