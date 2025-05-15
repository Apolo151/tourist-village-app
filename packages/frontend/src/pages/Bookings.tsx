import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Tooltip
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  FilterAlt as FilterIcon,
  ClearAll as ClearIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { mockBookings, mockApartments, mockUsers, mockVillages } from '../mockData';
import { format, parseISO, isAfter, isBefore} from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Booking status colors
const statusColors: Record<string, 'info' | 'success' | 'default'> = {
  notArrived: 'info',
  inVillage: 'success',
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
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Tab state
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

  // Set default filter to show current and upcoming bookings
  useEffect(() => {
    if (tabValue === 0) { // Current/Upcoming tab
      setFilters(prev => ({
        ...prev,
        state: 'notArrived,inVillage'
      }));
    } else if (tabValue === 1) { // Past tab
      setFilters(prev => ({
        ...prev,
        state: 'left'
      }));
    } else { // All tab
      setFilters(prev => ({
        ...prev,
        state: ''
      }));
    }
  }, [tabValue]);

  // If direct access to a booking detail, navigate to that page
  useEffect(() => {
    if (id && id !== 'new') {
      navigate(`/bookings/${id}`);
    } else if (id === 'new') {
      navigate('/bookings/new');
    }
  }, [id, navigate]);

  // Check if user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);

  // Filter bookings based on search and filters
  const filteredBookings = mockBookings.filter(booking => {
    const apartment = mockApartments.find(apt => apt.id === booking.apartmentId);
    const user = mockUsers.find(u => u.id === booking.userId);
    
    // Search term filter
    const matchesSearch = filters.searchTerm ? (
      apartment?.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      user?.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      booking.id.toLowerCase().includes(filters.searchTerm.toLowerCase())
    ) : true;
    
    // Apartment filter
    const matchesApartment = filters.apartmentId ? booking.apartmentId === filters.apartmentId : true;
    
    // Village filter
    const matchesVillage = filters.village 
      ? apartment?.village === filters.village
      : true;
      
    // User type filter
    const matchesUserType = filters.userType
      ? user?.role === filters.userType
      : true;
    
    // State filter (can include multiple states)
    const stateArray = filters.state ? filters.state.split(',') : [];
    const matchesState = stateArray.length > 0 
      ? stateArray.includes(booking.state)
      : true;
    
    // Date filters
    const bookingArrivalDate = parseISO(booking.arrivalDate);
    const bookingLeavingDate = parseISO(booking.leavingDate);
    
    const matchesArrivalStart = filters.arrivalDateStart
      ? !isBefore(bookingArrivalDate, filters.arrivalDateStart)
      : true;
      
    const matchesArrivalEnd = filters.arrivalDateEnd
      ? !isAfter(bookingArrivalDate, filters.arrivalDateEnd)
      : true;
      
    const matchesLeavingStart = filters.leavingDateStart
      ? !isBefore(bookingLeavingDate, filters.leavingDateStart)
      : true;
      
    const matchesLeavingEnd = filters.leavingDateEnd
      ? !isAfter(bookingLeavingDate, filters.leavingDateEnd)
      : true;
    
    return matchesSearch && 
           matchesApartment && 
           matchesState && 
           matchesVillage && 
           matchesUserType && 
           matchesArrivalStart && 
           matchesArrivalEnd && 
           matchesLeavingStart && 
           matchesLeavingEnd;
  });
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, searchTerm: event.target.value });
  };
  
  const handleSelectChange = (event: SelectChangeEvent, filterName: keyof BookingFilter) => {
    setFilters({ ...filters, [filterName]: event.target.value });
  };
  
  const handleDateChange = (date: Date | null, filterName: keyof BookingFilter) => {
    setFilters({ ...filters, [filterName]: date });
  };
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleBookingClick = (id: string) => {
    navigate(`/bookings/${id}`);
  };
  
  const handleCreateBooking = () => {
    navigate('/bookings/new');
  };
  
  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      apartmentId: '',
      state: tabValue === 0 ? 'notArrived,inVillage' : 
             tabValue === 1 ? 'left' : '',
      village: '',
      userType: '',
      arrivalDateStart: null,
      arrivalDateEnd: null,
      leavingDateStart: null,
      leavingDateEnd: null
    });
  };
  
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Get formatted date 
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  };
  
  // Get booking status display name
  const getStatusDisplayName = (status: string) => {
    switch(status) {
      case 'notArrived': return 'Not Arrived';
      case 'inVillage': return 'In Village';
      case 'left': return 'Left';
      default: return status;
    }
  };
  
  // Get user type display name
  const getUserType = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId);
    return user?.role === 'owner' ? 'Owner' : 'Renter';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Bookings</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateBooking}
        >
          Create Booking
        </Button>
      </Box>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="booking tabs">
          <Tab label="Current & Upcoming" />
          <Tab label="Past" />
          <Tab label="All Bookings" />
        </Tabs>
      </Box>
      
      {/* Basic Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            sx={{ flexGrow: 1, minWidth: '200px' }}
            value={filters.searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl sx={{ minWidth: 150 }} size="small">
            <InputLabel>Apartment</InputLabel>
            <Select
              value={filters.apartmentId}
              label="Apartment"
              onChange={(e) => handleSelectChange(e, 'apartmentId')}
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
            <InputLabel>Village</InputLabel>
            <Select
              value={filters.village}
              label="Village"
              onChange={(e) => handleSelectChange(e, 'village')}
            >
              <MenuItem value="">
                <em>All Villages</em>
              </MenuItem>
              {mockVillages.map(village => (
                <MenuItem key={village.id} value={village.name}>{village.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Tooltip title="Toggle Advanced Filters">
            <IconButton onClick={toggleFilters} color={showFilters ? "primary" : "default"}>
              <FilterIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Clear All Filters">
            <IconButton onClick={clearFilters}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        {/* Advanced Filters */}
        {showFilters && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', pt: 2, borderTop: '1px solid #eee' }}>
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>User Type</InputLabel>
              <Select
                value={filters.userType}
                label="User Type"
                onChange={(e) => handleSelectChange(e, 'userType')}
              >
                <MenuItem value="">
                  <em>All Types</em>
                </MenuItem>
                <MenuItem value="owner">Owner</MenuItem>
                <MenuItem value="renter">Renter</MenuItem>
              </Select>
            </FormControl>
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Arrival From"
                value={filters.arrivalDateStart}
                onChange={(date) => handleDateChange(date, 'arrivalDateStart')}
                slotProps={{ textField: { size: 'small' } }}
              />
              
              <DatePicker
                label="Arrival To"
                value={filters.arrivalDateEnd}
                onChange={(date) => handleDateChange(date, 'arrivalDateEnd')}
                slotProps={{ textField: { size: 'small' } }}
              />
              
              <DatePicker
                label="Leaving From"
                value={filters.leavingDateStart}
                onChange={(date) => handleDateChange(date, 'leavingDateStart')}
                slotProps={{ textField: { size: 'small' } }}
              />
              
              <DatePicker
                label="Leaving To"
                value={filters.leavingDateEnd}
                onChange={(date) => handleDateChange(date, 'leavingDateEnd')}
                slotProps={{ textField: { size: 'small' } }}
              />
            </LocalizationProvider>
          </Box>
        )}
      </Paper>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>User Name</TableCell>
              <TableCell>User Type</TableCell>
              <TableCell>Apartment</TableCell>
              <TableCell>Village</TableCell>
              <TableCell>Arrival Date</TableCell>
              <TableCell>Leaving Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBookings.length > 0 ? (
              filteredBookings.map(booking => {
                const apartment = mockApartments.find(apt => apt.id === booking.apartmentId);
                const user = mockUsers.find(u => u.id === booking.userId);
                
                return (
                  <TableRow 
                    key={booking.id} 
                    hover 
                    onClick={() => handleBookingClick(booking.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{booking.id}</TableCell>
                    <TableCell>{user?.name || 'Unknown'}</TableCell>
                    <TableCell>{getUserType(booking.userId)}</TableCell>
                    <TableCell>{apartment?.name || 'Unknown'}</TableCell>
                    <TableCell>{apartment?.village || 'Unknown'}</TableCell>
                    <TableCell>{formatDate(booking.arrivalDate)}</TableCell>
                    <TableCell>{formatDate(booking.leavingDate)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusDisplayName(booking.state)}
                        color={statusColors[booking.state]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Booking Details">
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
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No bookings found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 