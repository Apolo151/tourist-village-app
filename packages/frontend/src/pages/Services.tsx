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
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
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
import { mockServiceTypes, mockApartments, mockServiceRequests} from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { ServiceType } from '../types';

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
    navigate('/services/requests/create' + (service ? `?serviceId=${service.id}` : ''));
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