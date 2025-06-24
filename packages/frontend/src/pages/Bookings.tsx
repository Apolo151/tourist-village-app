import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Pagination
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  FilterAlt as FilterIcon,
  ClearAll as ClearIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { bookingService } from '../services/bookingService';
import type { BookingFilters } from '../services/bookingService';
import { apartmentService } from '../services/apartmentService';
import { villageService } from '../services/villageService';
import type { Booking, Apartment, Village } from '../types';
import ExportButtons from '../components/ExportButtons';

// Booking status colors
const statusColors: Record<string, 'info' | 'success' | 'default'> = {
  not_arrived: 'info',
  in_village: 'success',
  left: 'default'
};

interface BookingFilter {
  searchTerm: string;
  apartmentId: string;
  state: string;
  village: string;
  userType: string;
  arrivalDateStart: Date | null;
  arrivalDateEnd: Date | null;
  leavingDateStart: Date | null;
  leavingDateEnd: Date | null;
}

export default function Bookings() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0
  });
  
  // Tab state (0: Current & Upcoming, 1: Past, 2: All)
  const [tabValue, setTabValue] = useState<number>(0);
  
  // Filter state
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<BookingFilter>({
    searchTerm: '',
    apartmentId: '',
    state: '',
    village: '',
    userType: '',
    arrivalDateStart: null,
    arrivalDateEnd: null,
    leavingDateStart: null,
    leavingDateEnd: null
  });

  // Check if user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load bookings when filters, pagination, or tab changes
  useEffect(() => {
    if (apartments.length > 0) {
      loadBookings();
    }
  }, [tabValue, pagination.page, filters, apartments.length]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const [apartmentsResult, villagesResult] = await Promise.all([
        apartmentService.getApartments({ limit: 100 }),
        villageService.getVillages({ limit: 100 })
      ]);

      setApartments(apartmentsResult.data.map(apartment => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { village, owner, ...rest } = apartment;
        return {
          ...rest,
          purchase_date: apartment.purchase_date ?? '',
          paying_status:
            apartment.paying_status === 'transfer' ? 'payed_by_transfer' :
            apartment.paying_status === 'rent' ? 'payed_by_rent' :
            'non_payer',
          village: undefined,
          owner: undefined
        } as Apartment;
      }));
      setVillages(villagesResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError('');

      // Build API filters
      const apiFilters: BookingFilters = {
        page: pagination.page,
        limit: pagination.limit,
        sort_by: 'arrival_date',
        sort_order: 'desc'
      };

      // Apply tab-specific filters
      const today = new Date().toISOString().split('T')[0];
      
      if (tabValue === 0) {
        // Current & Upcoming - show bookings that haven't ended yet
        apiFilters.leaving_date_start = today;
      } else if (tabValue === 1) {
        // Past - show bookings that have ended
        apiFilters.leaving_date_end = today;
      }
      // Tab 2 (All) - no date filter

      // Apply user filters
      if (filters.searchTerm) {
        apiFilters.search = filters.searchTerm;
      }
      if (filters.apartmentId) {
        apiFilters.apartment_id = parseInt(filters.apartmentId);
      }
      if (filters.state) {
        apiFilters.status = filters.state as 'not_arrived' | 'in_village' | 'left';
      }
      if (filters.village) {
        const village = villages.find(v => v.name === filters.village);
        if (village) {
          apiFilters.village_id = village.id;
        }
      }
      if (filters.userType) {
        apiFilters.user_type = filters.userType as 'owner' | 'renter';
      }
      if (filters.arrivalDateStart) {
        apiFilters.arrival_date_start = filters.arrivalDateStart.toISOString().split('T')[0];
      }
      if (filters.arrivalDateEnd) {
        apiFilters.arrival_date_end = filters.arrivalDateEnd.toISOString().split('T')[0];
      }
      if (filters.leavingDateStart) {
        apiFilters.leaving_date_start = filters.leavingDateStart.toISOString().split('T')[0];
      }
      if (filters.leavingDateEnd) {
        apiFilters.leaving_date_end = filters.leavingDateEnd.toISOString().split('T')[0];
      }

      const response = await bookingService.getBookings(apiFilters);
      setBookings(response.bookings);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        total_pages: response.total_pages
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = async (bookingId: number) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) {
      return;
    }

    try {
      await bookingService.deleteBooking(bookingId);
      // Reload bookings
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete booking');
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchTerm: event.target.value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleSelectChange = (event: SelectChangeEvent, filterName: keyof BookingFilter) => {
    setFilters(prev => ({ ...prev, [filterName]: event.target.value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleDateChange = (date: Date | null, filterName: keyof BookingFilter) => {
    setFilters(prev => ({ ...prev, [filterName]: date }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleBookingClick = (id: number) => {
    navigate(`/bookings/${id}`);
  };

  const handleCreateBooking = () => {
    navigate('/bookings/create');
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      apartmentId: '',
      state: '',
      village: '',
      userType: '',
      arrivalDateStart: null,
      arrivalDateEnd: null,
      leavingDateStart: null,
      leavingDateEnd: null
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'not_arrived':
        return 'Has not Arrived';
      case 'in_village':
        return 'In Village';
      case 'left':
        return 'Left';
      default:
        return status;
    }
  };

  const getUserTypeDisplay = (userType: string) => {
    switch (userType) {
      case 'owner':
        return 'Owner';
      case 'renter':
        return 'Renter';
      default:
        return userType;
    }
  };

  // Data transformer for export
  const transformBookingsForExport = (bookingsData: Booking[]) => {
    return bookingsData.map(booking => ({
      id: booking.id,
      apartment: booking.apartment?.name || 'Unknown',
      village: booking.apartment?.village?.name || 'Unknown',
      user: booking.user?.name || 'Unknown',
      user_type: getUserTypeDisplay(booking.user_type),
      number_of_people: booking.number_of_people,
      arrival_date: formatDate(booking.arrival_date),
      leaving_date: formatDate(booking.leaving_date),
      status: getStatusDisplayName(booking.status),
      notes: booking.notes || ''
    }));
  };

  if (loading && bookings.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h4" gutterBottom>
          Bookings
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Header with Create Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateBooking}
          >
            Create a new Booking
          </Button>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Toggle Filters">
              <IconButton onClick={toggleFilters}>
                <FilterIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear Filters">
              <IconButton onClick={clearFilters}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Current & Upcoming" />
            <Tab label="Past" />
            <Tab label="All" />
          </Tabs>
        </Paper>

        {/* Filters */}
        {showFilters && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            
            {/* Search and basic filters */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <TextField
                label="Search"
                value={filters.searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by user name, apartment name, notes..."
                sx={{ flex: '1 1 300px' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              
              <FormControl sx={{ flex: '1 1 200px' }}>
                <InputLabel>Apartment</InputLabel>
                <Select
                  value={filters.apartmentId}
                  label="Apartment"
                  onChange={(e) => handleSelectChange(e, 'apartmentId')}
                >
                  <MenuItem value="">All Apartments</MenuItem>
                  {apartments.map(apartment => (
                    <MenuItem key={apartment.id} value={apartment.id.toString()}>
                      {apartment.name} ({apartment.village?.name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ flex: '1 1 150px' }}>
                <InputLabel>Village</InputLabel>
                <Select
                  value={filters.village}
                  label="Village"
                  onChange={(e) => handleSelectChange(e, 'village')}
                >
                  <MenuItem value="">All Villages</MenuItem>
                  {villages.map(village => (
                    <MenuItem key={village.id} value={village.name}>
                      {village.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <FormControl sx={{ flex: '1 1 150px' }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.state}
                  label="Status"
                  onChange={(e) => handleSelectChange(e, 'state')}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="not_arrived">Has not Arrived</MenuItem>
                  <MenuItem value="in_village">In Village</MenuItem>
                  <MenuItem value="left">Left</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ flex: '1 1 150px' }}>
                <InputLabel>User Type</InputLabel>
                <Select
                  value={filters.userType}
                  label="User Type"
                  onChange={(e) => handleSelectChange(e, 'userType')}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="owner">Owner</MenuItem>
                  <MenuItem value="renter">Renter</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Date filters */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Arrival Date Range
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <DatePicker
                label="Arrival Date From"
                value={filters.arrivalDateStart}
                onChange={(date) => handleDateChange(date, 'arrivalDateStart')}
                slotProps={{ textField: { sx: { flex: '1 1 200px' } } }}
              />
              <DatePicker
                label="Arrival Date To"
                value={filters.arrivalDateEnd}
                onChange={(date) => handleDateChange(date, 'arrivalDateEnd')}
                slotProps={{ textField: { sx: { flex: '1 1 200px' } } }}
              />
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Leaving Date Range
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <DatePicker
                label="Leaving Date From"
                value={filters.leavingDateStart}
                onChange={(date) => handleDateChange(date, 'leavingDateStart')}
                slotProps={{ textField: { sx: { flex: '1 1 200px' } } }}
              />
              <DatePicker
                label="Leaving Date To"
                value={filters.leavingDateEnd}
                onChange={(date) => handleDateChange(date, 'leavingDateEnd')}
                slotProps={{ textField: { sx: { flex: '1 1 200px' } } }}
              />
            </Box>
          </Paper>
        )}

        {/* Export Buttons */}
        <ExportButtons data={transformBookingsForExport(bookings)} columns={["id","apartment","village","user","user_type","number_of_people","arrival_date","leaving_date","status","notes"]} excelFileName="bookings.xlsx" pdfFileName="bookings.pdf" />

        {/* Bookings Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Booking ID</TableCell>
                  <TableCell>User Name</TableCell>
                  <TableCell>User Type</TableCell>
                  <TableCell>Apartment</TableCell>
                  <TableCell>Arrival DateTime</TableCell>
                  <TableCell>Leaving DateTime</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>People</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="text.secondary">
                        No bookings found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (bookings || []).map((booking) => (
                    <TableRow
                      key={booking.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleBookingClick(booking.id)}
                    >
                      <TableCell>#{booking.id}</TableCell>
                      <TableCell>{booking.user?.name || 'Unknown User'}</TableCell>
                      <TableCell>
                        <Chip
                          label={getUserTypeDisplay(booking.user_type)}
                          size="small"
                          color={booking.user_type === 'owner' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        {booking.apartment?.name || 'Unknown Apartment'}
                        {booking.apartment?.village && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {booking.apartment.village.name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(booking.arrival_date)}</TableCell>
                      <TableCell>{formatDate(booking.leaving_date)}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusDisplayName(booking.status)}
                          size="small"
                          color={statusColors[booking.status] || 'default'}
                        />
                      </TableCell>
                      <TableCell>{booking.number_of_people}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookingClick(booking.id);
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Booking">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBooking(booking.id);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination
                count={pagination.total_pages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Paper>

        {/* Summary */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {bookings.length} of {pagination.total} bookings
          </Typography>
          {tabValue === 0 && (
            <Typography variant="body2" color="text.secondary">
              Default filter: Current and upcoming bookings only
            </Typography>
          )}
        </Box>
      </Box>
    </LocalizationProvider>
  );
} 