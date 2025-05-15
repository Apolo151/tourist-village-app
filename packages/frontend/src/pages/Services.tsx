import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Card,
  CardContent,
  CardActions,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Container,
  Divider,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormHelperText
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  Build as BuildIcon, 
  EventAvailable as EventAvailableIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { mockServiceTypes, mockApartments, mockServiceRequests, mockBookings } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { ServiceType, ServiceRequest } from '../types';

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
      id={`services-tabpanel-${index}`}
      aria-labelledby={`services-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Services() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [requestDate, setRequestDate] = useState<Date | null>(new Date());
  const [serviceDate, setServiceDate] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [notes, setNotes] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Filter services based on search
  const filteredServices = mockServiceTypes.filter(service => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Filter service requests
  const filteredRequests = mockServiceRequests.filter(request => {
    // Filter by apartment if selected
    if (apartmentFilter && request.apartmentId !== apartmentFilter) {
      return false;
    }
    
    // Filter by status if selected
    if (statusFilter && request.status !== statusFilter) {
      return false;
    }
    
    // Filter by search term (match against service type name)
    if (searchTerm) {
      const serviceType = mockServiceTypes.find(type => type.id === request.serviceTypeId);
      if (!serviceType || !serviceType.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleApartmentFilterChange = (event: SelectChangeEvent) => {
    setApartmentFilter(event.target.value);
  };
  
  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
  };
  
  const handleOpenRequestDialog = (service: ServiceType | null = null) => {
    setSelectedService(service);
    setRequestDate(new Date());
    setOpenRequestDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenRequestDialog(false);
    setSelectedService(null);
    setSelectedApartment('');
    setSelectedBooking('');
    setRequestDate(new Date());
    setServiceDate(null);
    setNotes('');
  };
  
  const handleApartmentChange = (event: SelectChangeEvent) => {
    setSelectedApartment(event.target.value);
    // Reset booking when apartment changes
    setSelectedBooking('');
  };
  
  const handleBookingChange = (event: SelectChangeEvent) => {
    setSelectedBooking(event.target.value);
  };
  
  const handleServiceChange = (event: SelectChangeEvent) => {
    const serviceId = event.target.value;
    const service = mockServiceTypes.find(type => type.id === serviceId);
    setSelectedService(service || null);
  };
  
  const handleRequestSubmit = () => {
    // In a real app, this would send data to an API
    const newServiceRequest: Partial<ServiceRequest> = {
      serviceTypeId: selectedService?.id,
      apartmentId: selectedApartment,
      requestDate: requestDate ? requestDate.toISOString().split('T')[0] : '',
      serviceDate: serviceDate ? serviceDate.toISOString().split('T')[0] : '',
      notes: notes,
      status: 'pending',
      userId: currentUser?.id,
      bookingId: selectedBooking || undefined
    };
    
    console.log('Creating service request:', newServiceRequest);
    
    // Show success message and close dialog
    setOpenSnackbar(true);
    handleCloseDialog();
  };
  
  const handleAddServiceType = () => {
    navigate('/services/types/new');
  };
  
  const handleServiceTypeClick = (id: string) => {
    navigate(`/services/types/${id}`);
  };
  
  const handleServiceRequestClick = (id: string) => {
    navigate(`/services/requests/${id}`);
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'pending':
        return <ScheduleIcon color="warning" />;
      case 'cancelled':
        return <CancelIcon color="error" />;
      default:
        return null;
    }
  };

  // Box component returning ServiceType grid
  const renderServiceTypeGrid = () => (
    <Box
      sx={{ 
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)'
        },
        gap: 3
      }}
    >
      {filteredServices.length > 0 ? (
        filteredServices.map(service => (
          <Card key={service.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" 
                  onClick={() => currentUser?.role === 'admin' && handleServiceTypeClick(service.id)} 
                  sx={{ 
                    cursor: currentUser?.role === 'admin' ? 'pointer' : 'default',
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <BuildIcon sx={{ mr: 1 }} fontSize="small" />
                  {service.name}
                </Typography>
                <Chip 
                  label={`${service.cost} EGP`} 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {service.description}
              </Typography>
            </CardContent>
            
            <CardActions sx={{ p: 2, pt: 0 }}>
              {currentUser?.role !== 'admin' && (
                <Button 
                  size="small" 
                  color="primary"
                  startIcon={<EventAvailableIcon />}
                  onClick={() => handleOpenRequestDialog(service)}
                  fullWidth
                  variant="contained"
                >
                  Request Service
                </Button>
              )}
              {currentUser?.role === 'admin' && (
                <Button 
                  size="small" 
                  color="primary"
                  startIcon={<InfoIcon />}
                  onClick={() => handleServiceTypeClick(service.id)}
                  fullWidth
                  variant="outlined"
                >
                  View Details
                </Button>
              )}
            </CardActions>
          </Card>
        ))
      ) : (
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography>
              No services found matching your criteria.
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4">Services</Typography>
          </Box>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="service tabs">
              <Tab label="Service Types" id="services-tab-0" aria-controls="services-tabpanel-0" />
              <Tab label="Service Requests" id="services-tab-1" aria-controls="services-tabpanel-1" />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Service Types</Typography>
              {currentUser?.role === 'admin' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddServiceType}
                >
                  Add Service Type
                </Button>
              )}
            </Box>
            
            <Paper sx={{ p: 2, mb: 3 }}>
              <TextField
                label="Search Services"
                variant="outlined"
                size="small"
                fullWidth
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="Search by service name or description"
              />
            </Paper>
            
            {renderServiceTypeGrid()}
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Service Requests</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenRequestDialog()}
              >
                Create a Service Request
              </Button>
            </Box>
            
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <TextField
                  label="Search Services"
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
                  placeholder="Search by service name"
                />
                
                <FormControl size="small" sx={{ minWidth: '200px' }}>
                  <InputLabel id="apartment-filter-label">Apartment</InputLabel>
                  <Select
                    labelId="apartment-filter-label"
                    value={apartmentFilter}
                    label="Apartment"
                    onChange={handleApartmentFilterChange}
                  >
                    <MenuItem value="">All Apartments</MenuItem>
                    {mockApartments.map(apt => (
                      <MenuItem key={apt.id} value={apt.id}>{apt.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: '150px' }}>
                  <InputLabel id="status-filter-label">Status</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    value={statusFilter}
                    label="Status"
                    onChange={handleStatusFilterChange}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Paper>
            
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="service requests table">
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell>Apartment</TableCell>
                    <TableCell>Request Date</TableCell>
                    <TableCell>Service Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequests.length > 0 ? (
                    filteredRequests.map(request => {
                      const serviceType = mockServiceTypes.find(type => type.id === request.serviceTypeId);
                      const apartment = mockApartments.find(apt => apt.id === request.apartmentId);
                      
                      return (
                        <TableRow
                          key={request.id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          hover
                        >
                          <TableCell component="th" scope="row">
                            {serviceType?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>{apartment?.name || 'Unknown'}</TableCell>
                          <TableCell>{request.requestDate}</TableCell>
                          <TableCell>{request.serviceDate}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getStatusIcon(request.status)}
                              <Typography sx={{ ml: 1, textTransform: 'capitalize' }}>
                                {request.status}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              onClick={() => handleServiceRequestClick(request.id)}
                              variant="outlined"
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No service requests found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Box>
        
        {/* Service Request Dialog */}
        <Dialog open={openRequestDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {selectedService ? `Request Service: ${selectedService.name}` : 'Create a Service Request'}
          </DialogTitle>
          <DialogContent dividers>
            <Box component="form" sx={{ mt: 1 }}>
              {!selectedService && (
                <FormControl fullWidth margin="normal" required>
                  <InputLabel id="service-select-label">Service Type</InputLabel>
                  <Select
                    labelId="service-select-label"
                    value={selectedService ? String((selectedService as ServiceType).id) : ''}
                    label="Service Type"
                    onChange={handleServiceChange}
                  >
                    {mockServiceTypes.map(service => (
                      <MenuItem key={service.id} value={String(service.id)}>{service.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              <FormControl fullWidth margin="normal" required>
                <InputLabel id="apartment-select-label">Related Apartment</InputLabel>
                <Select
                  labelId="apartment-select-label"
                  value={selectedApartment}
                  label="Related Apartment"
                  onChange={handleApartmentChange}
                >
                  {mockApartments.map(apt => (
                    <MenuItem key={apt.id} value={apt.id}>{apt.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {selectedApartment && (
                <FormControl fullWidth margin="normal">
                  <InputLabel id="booking-select-label">Related Booking (Optional)</InputLabel>
                  <Select
                    labelId="booking-select-label"
                    value={selectedBooking}
                    label="Related Booking (Optional)"
                    onChange={handleBookingChange}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {mockBookings
                      .filter(booking => booking.apartmentId === selectedApartment)
                      .map(booking => (
                        <MenuItem key={booking.id} value={booking.id}>
                          {booking.arrivalDate} - {booking.leavingDate} ({booking.state})
                        </MenuItem>
                      ))}
                  </Select>
                  <FormHelperText>
                    {mockBookings.filter(booking => booking.apartmentId === selectedApartment).length === 0 
                      ? 'No bookings found for this apartment' 
                      : 'Select a booking if this service is related to a specific booking'}
                  </FormHelperText>
                </FormControl>
              )}
              
              <Box sx={{ mt: 2 }}>
                <DatePicker
                  label="Request Date"
                  value={requestDate}
                  onChange={(newValue) => {
                    setRequestDate(newValue);
                  }}
                  disablePast={false}
                  readOnly
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: "normal",
                      required: true,
                      helperText: "Date when the request is created (today)"
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <DatePicker
                  label="Wanted Service Date"
                  value={serviceDate}
                  onChange={(newValue) => {
                    setServiceDate(newValue);
                  }}
                  disablePast
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: "normal",
                      required: true,
                      helperText: "When would you like the service to be performed"
                    }
                  }}
                />
              </Box>
              
              <TextField
                margin="normal"
                fullWidth
                id="notes"
                label="Notes"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional information that might be helpful"
              />
              
              {selectedService && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>Service Details:</Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Service:</strong> {selectedService.name}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Cost:</strong> {selectedService.cost} EGP
                  </Typography>
                  <Typography variant="body2">
                    <strong>Description:</strong> {selectedService.description}
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleRequestSubmit}
              variant="contained"
              disabled={!selectedService || !selectedApartment || !serviceDate}
            >
              Submit Request
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Success Snackbar */}
        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={() => setOpenSnackbar(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
            Service request submitted successfully!
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
} 