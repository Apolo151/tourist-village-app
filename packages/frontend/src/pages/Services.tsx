import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  CircularProgress,
  Pagination,
  IconButton,
  Tooltip
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  Build as BuildIcon, 
  EventAvailable as EventAvailableIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  AssignmentLateOutlined as CreatedIcon,
  Visibility as ViewIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { serviceRequestService } from '../services/serviceRequestService';
import type { ServiceType, ServiceRequest } from '../services/serviceRequestService';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { userService } from '../services/userService';
import type { User } from '../services/userService';
import { format, parseISO } from 'date-fns';
import ExportButtons from '../components/ExportButtons';

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
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [tabValue, setTabValue] = useState(() => {
    const tab = searchParams.get('tab');
    return tab ? parseInt(tab) : 0;
  });
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [whoPayFilter, setWhoPayFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Pagination
  const [serviceTypesPagination, setServiceTypesPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    total_pages: 0
  });
  
  const [serviceRequestsPagination, setServiceRequestsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0
  });
  
  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  
  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [apartmentsData, usersData] = await Promise.all([
          apartmentService.getApartments({ limit: 100 }),
          userService.getUsers({ limit: 100 })
        ]);
        setApartments(apartmentsData.data);
        setUsers(usersData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);
  
  // Load service types
  useEffect(() => {
    const loadServiceTypes = async () => {
      try {
        const filters = {
          page: serviceTypesPagination.page,
          limit: serviceTypesPagination.limit,
          search: searchTerm || undefined,
          sort_by: 'name',
          sort_order: 'asc' as const
        };
        
        const response = await serviceRequestService.getServiceTypes(filters);
        setServiceTypes(response.data || []);
        
        // Check if pagination exists in response
        if (response.pagination) {
          setServiceTypesPagination({
            page: response.pagination.page || 1,
            limit: response.pagination.limit || 12,
            total: response.pagination.total || 0,
            total_pages: response.pagination.total_pages || 0
          });
        } else {
          // Fallback if pagination is missing
          setServiceTypesPagination(prev => ({ 
            ...prev, 
            total: response.data?.length || 0,
            total_pages: 1 
          }));
        }
      } catch (err) {
        console.error('Error loading service types:', err);
        setServiceTypes([]);
        setServiceTypesPagination(prev => ({ ...prev, total: 0, total_pages: 0 }));
      }
    };

    if (tabValue === 0) {
      loadServiceTypes();
    }
  }, [tabValue, searchTerm, serviceTypesPagination.page]);
  
  // Load service requests
  useEffect(() => {
    const loadServiceRequests = async () => {
      try {
        const filters = {
          page: serviceRequestsPagination.page,
          limit: serviceRequestsPagination.limit,
          search: searchTerm || undefined,
          apartment_id: apartmentFilter ? parseInt(apartmentFilter) : undefined,
          status: (statusFilter as 'Created' | 'In Progress' | 'Done' | undefined) || undefined,
          who_pays: (whoPayFilter as 'owner' | 'renter' | 'company' | undefined) || undefined,
          sort_by: 'date_created',
          sort_order: 'desc' as const
        };
        
        const response = await serviceRequestService.getServiceRequests(filters);
        setServiceRequests(response.data || []);
        
        // Check if pagination exists in response
        if (response.pagination) {
          setServiceRequestsPagination({
            page: response.pagination.page || 1,
            limit: response.pagination.limit || 20,
            total: response.pagination.total || 0,
            total_pages: response.pagination.total_pages || 0
          });
        } else {
          // Fallback if pagination is missing
          setServiceRequestsPagination(prev => ({ 
            ...prev, 
            total: response.data?.length || 0,
            total_pages: 1 
          }));
        }
      } catch (err) {
        console.error('Error loading service requests:', err);
        setServiceRequests([]);
        setServiceRequestsPagination(prev => ({ ...prev, total: 0, total_pages: 0 }));
      }
    };

    if (tabValue === 1) {
      loadServiceRequests();
    }
  }, [tabValue, searchTerm, apartmentFilter, statusFilter, whoPayFilter, serviceRequestsPagination.page]);
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Update URL with current tab
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', newValue.toString());
    navigate(`/services?${newSearchParams.toString()}`, { replace: true });
    
    // Reset pagination when changing tabs
    if (newValue === 0) {
      setServiceTypesPagination(prev => ({ ...prev, page: 1 }));
    } else {
      setServiceRequestsPagination(prev => ({ ...prev, page: 1 }));
    }
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    // Reset to first page when searching
    if (tabValue === 0) {
      setServiceTypesPagination(prev => ({ ...prev, page: 1 }));
    } else {
      setServiceRequestsPagination(prev => ({ ...prev, page: 1 }));
    }
  };
  
  const handleApartmentFilterChange = (event: SelectChangeEvent) => {
    setApartmentFilter(event.target.value);
    setServiceRequestsPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
    setServiceRequestsPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleWhoPayFilterChange = (event: SelectChangeEvent) => {
    setWhoPayFilter(event.target.value);
    setServiceRequestsPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleRequestService = (serviceType?: ServiceType) => {
    navigate('/services/requests/create' + (serviceType ? `?serviceTypeId=${serviceType.id}` : ''));
  };
  
  const handleAddServiceType = () => {
    navigate('/services/types/new');
  };
  
  const handleServiceTypeClick = (id: number) => {
    navigate(`/services/types/${id}/edit`);
  };
  
  const handleServiceRequestClick = (id: number) => {
    navigate(`/services/requests/${id}`);
  };
  
  const handleServiceTypePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setServiceTypesPagination(prev => ({ ...prev, page }));
  };
  
  const handleServiceRequestPageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setServiceRequestsPagination(prev => ({ ...prev, page }));
  };
  
  const getStatusIcon = (status: 'Created' | 'In Progress' | 'Done') => {
    switch (status) {
      case 'Done':
        return <CheckCircleIcon color="success" />;
      case 'In Progress':
        return <ScheduleIcon color="warning" />;
      case 'Created':
        return <CreatedIcon color="info" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
  };

  // Data transformer for export
  const transformServicesForExport = (servicesData: ServiceRequest[]) => {
    return servicesData.map(service => ({
      id: service.id,
      apartment: service.apartment?.name || 'Unknown',
      village: service.apartment?.village?.name || 'Unknown',
      service_type: service.type?.name || 'Unknown',
      notes: service.notes || 'No notes',
      status: service.status,
      date_action: service.date_action ? formatDate(service.date_action) : 'Not scheduled',
      date_created: formatDate(service.date_created),
      who_pays: service.who_pays === 'owner' ? 'Owner' : 
                service.who_pays === 'renter' ? 'Renter' : 'Company',
      requester: service.requester?.name || 'Unknown'
    }));
  };
  
  const showMessage = useCallback((message: string) => {
    setSnackbarMessage(message);
    setOpenSnackbar(true);
  }, []);

  // Check for operation success messages in URL
  useEffect(() => {
    const success = searchParams.get('success');
    const message = searchParams.get('message');
    
    if (success && message) {
      showMessage(decodeURIComponent(message));
      // Clean up URL parameters
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('success');
      newSearchParams.delete('message');
      navigate(`/services?${newSearchParams.toString()}`, { replace: true });
    }
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      </Container>
  );
  }

  if (error) {
  return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ mt: 3 }}>
              Services
            </Typography>
          {isAdmin && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddServiceType}
                >
                  Add Service Type
                </Button>
              )}
            </Box>
            
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="service tabs">
            <Tab label="Service Types" icon={<BuildIcon />} iconPosition="start" />
            <Tab label="Service Requests" icon={<EventAvailableIcon />} iconPosition="start" />
          </Tabs>
            </Box>
            
        {/* Search and Filters */}
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
            />
            
            {tabValue === 1 && (
              <>
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
                    {(apartments || []).map(apt => (
                      <MenuItem key={apt.id} value={apt.id.toString()}>{apt.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl sx={{ minWidth: 150 }} size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={handleStatusFilterChange}
                  >
                    <MenuItem value="">
                      <em>All Statuses</em>
                    </MenuItem>
                    <MenuItem value="Created">Created</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Done">Done</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl sx={{ minWidth: 150 }} size="small">
                  <InputLabel>Who Pays</InputLabel>
                  <Select
                    value={whoPayFilter}
                    label="Who Pays"
                    onChange={handleWhoPayFilterChange}
                  >
                    <MenuItem value="">
                      <em>All</em>
                    </MenuItem>
                    <MenuItem value="owner">Owner</MenuItem>
                    <MenuItem value="renter">Renter</MenuItem>
                    <MenuItem value="company">Company</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
              </Box>
            </Paper>
        
        {/* Export Buttons */}
        {isAdmin && (
        <ExportButtons data={transformServicesForExport(serviceRequests)} columns={["id","apartment","village","service_type","notes","status","date_action","date_created","who_pays","requester"]} excelFileName="services.xlsx" pdfFileName="services.pdf" />
        )}
        
        {/* Service Types Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box
            sx={{ 
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)'
              },
              gap: 3,
              mb: 3
            }}
          >
            {serviceTypes && serviceTypes.length > 0 ? (
              serviceTypes.map(service => (
                <Card key={service.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" 
                        onClick={() => isAdmin && handleServiceTypeClick(service.id)} 
                        sx={{ 
                          cursor: isAdmin ? 'pointer' : 'default',
                          color: 'primary.main',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <BuildIcon sx={{ mr: 1 }} fontSize="small" />
                        {service.name}
                      </Typography>
                      <Chip 
                        label={`${service.cost} ${service.currency}`} 
                        color="primary" 
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    {service.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {service.description}
                      </Typography>
                    )}
                    
                    {service.default_assignee && (
                      <Typography variant="caption" color="text.secondary">
                        Default Assignee: {service.default_assignee.name}
                      </Typography>
                    )}
                  </CardContent>
                  
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button 
                      size="small" 
                      startIcon={<EventAvailableIcon />}
                      onClick={() => handleRequestService(service)}
                      disabled={!currentUser}
                    >
                      Request Service
                    </Button>
                    {isAdmin && (
                      <Button 
                        size="small" 
                        startIcon={<EditIcon />}
                        onClick={() => handleServiceTypeClick(service.id)}
                      >
                        Edit
                      </Button>
                    )}
                  </CardActions>
                </Card>
              ))
            ) : (
              <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  No service types found
                </Typography>
                {isAdmin && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddServiceType}
                    sx={{ mt: 2 }}
                  >
                    Add First Service Type
                  </Button>
                )}
              </Box>
            )}
          </Box>
          
          {/* Service Types Pagination */}
          {serviceTypesPagination.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={serviceTypesPagination.total_pages}
                page={serviceTypesPagination.page}
                onChange={handleServiceTypePageChange}
                color="primary"
              />
            </Box>
          )}
        </TabPanel>
        
        {/* Service Requests Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Service Requests</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleRequestService()}
            >
              Request Service
            </Button>
          </Box>
            
            <TableContainer component={Paper}>
            <Table>
                <TableHead>
                  <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Service Type</TableCell>
                    <TableCell>Apartment</TableCell>
                  <TableCell>Requester</TableCell>
                  <TableCell>Action Date</TableCell>
                    <TableCell>Status</TableCell>
                  <TableCell>Who Pays</TableCell>
                  <TableCell>Assignee</TableCell>
                  <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                {serviceRequests && serviceRequests.length > 0 ? (
                  serviceRequests.map(request => (
                        <TableRow
                          key={request.id}
                          hover
                      onClick={() => handleServiceRequestClick(request.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{request.id}</TableCell>
                      <TableCell>{request.type?.name || 'Unknown'}</TableCell>
                      <TableCell>{request.apartment?.name || 'Unknown'}</TableCell>
                      <TableCell>{request.requester?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        {request.date_action ? formatDate(request.date_action) : 'Not scheduled'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={request.status}
                          color={serviceRequestService.getStatusColor(request.status)}
                          size="small"
                        />
                          </TableCell>
                          <TableCell>
                        <Chip 
                          label={request.who_pays.charAt(0).toUpperCase() + request.who_pays.slice(1)}
                          variant="outlined"
                          size="small"
                        />
                          </TableCell>
                      <TableCell>{request.assignee?.name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton 
                              size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleServiceRequestClick(request.id);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                          </TableCell>
                        </TableRow>
                  ))
                  ) : (
                    <TableRow>
                    <TableCell colSpan={9} align="center">
                        No service requests found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          
          {/* Service Requests Pagination */}
          {serviceRequestsPagination.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={serviceRequestsPagination.total_pages}
                page={serviceRequestsPagination.page}
                onChange={handleServiceRequestPageChange}
                color="primary"
              />
            </Box>
          )}
          
          {/* Results summary */}
          <Box sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">
              Showing {((serviceRequestsPagination.page - 1) * serviceRequestsPagination.limit) + 1} to{' '}
              {Math.min(serviceRequestsPagination.page * serviceRequestsPagination.limit, serviceRequestsPagination.total)} of{' '}
              {serviceRequestsPagination.total} service requests
            </Typography>
          </Box>
          </TabPanel>
        
        {/* Snackbar for messages */}
        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={() => setOpenSnackbar(false)}
          message={snackbarMessage}
        />
      </Box>
      </Container>
  );
} 