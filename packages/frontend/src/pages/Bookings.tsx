import { useState } from 'react';
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
  Chip
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { mockBookings, mockApartments, mockUsers } from '../mockData';

// Booking status colors
const statusColors: Record<string, 'info' | 'success' | 'default'> = {
  notArrived: 'info',
  inVillage: 'success',
  left: 'default'
};

export default function Bookings() {
  const [searchTerm, setSearchTerm] = useState('');
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const navigate = useNavigate();

  // Filter bookings based on search and filters
  const filteredBookings = mockBookings.filter(booking => {
    const apartment = mockApartments.find(apt => apt.id === booking.apartmentId);
    const user = mockUsers.find(u => u.id === booking.userId);
    
    const matchesSearch = 
      apartment?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesApartment = apartmentFilter ? booking.apartmentId === apartmentFilter : true;
    const matchesState = stateFilter ? booking.state === stateFilter : true;
    
    return matchesSearch && matchesApartment && matchesState;
  });
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleApartmentFilterChange = (event: SelectChangeEvent) => {
    setApartmentFilter(event.target.value);
  };
  
  const handleStateFilterChange = (event: SelectChangeEvent) => {
    setStateFilter(event.target.value);
  };
  
  const handleBookingClick = (id: string) => {
    navigate(`/bookings/${id}`);
  };
  
  const handleCreateBooking = () => {
    navigate('/bookings/new');
  };

  // Get formatted date range
  const getDateRange = (startDate: string, endDate: string) => {
    return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
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
            <InputLabel>Status</InputLabel>
            <Select
              value={stateFilter}
              label="Status"
              onChange={handleStateFilterChange}
            >
              <MenuItem value="">
                <em>All Statuses</em>
              </MenuItem>
              <MenuItem value="notArrived">Not Arrived</MenuItem>
              <MenuItem value="inVillage">In Village</MenuItem>
              <MenuItem value="left">Left</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Apartment</TableCell>
              <TableCell>Guest</TableCell>
              <TableCell>Date Range</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
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
                    <TableCell>{apartment?.name || 'Unknown'}</TableCell>
                    <TableCell>{user?.name || 'Unknown'}</TableCell>
                    <TableCell>{getDateRange(booking.arrivalDate, booking.leavingDate)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={booking.state === 'notArrived' ? 'Not Arrived' : 
                               booking.state === 'inVillage' ? 'In Village' : 'Left'}
                        color={statusColors[booking.state]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(booking.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookingClick(booking.id);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
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