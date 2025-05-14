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
import { mockUtilityReadings, mockApartments, mockBookings } from '../mockData';
import type { UtilityType, ReadingType } from '../types';

// Helper function to format utility types
const formatUtilityType = (type: UtilityType): string => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Helper function to format reading types
const formatReadingType = (type: ReadingType): string => {
  return type === 'start' ? 'Start' : 'End';
};

export default function Utilities() {
  const [searchTerm, setSearchTerm] = useState('');
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [utilityTypeFilter, setUtilityTypeFilter] = useState<UtilityType | ''>('');
  const [readingTypeFilter, setReadingTypeFilter] = useState<ReadingType | ''>('');
  const navigate = useNavigate();
  
  // Filter utility readings based on search and filters
  const filteredReadings = mockUtilityReadings.filter(reading => {
    const apartment = mockApartments.find(apt => apt.id === reading.apartmentId);
    
    const matchesSearch = 
      apartment?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reading.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reading.utilityType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesApartment = apartmentFilter ? reading.apartmentId === apartmentFilter : true;
    const matchesBooking = bookingFilter ? reading.bookingId === bookingFilter : true;
    const matchesUtilityType = utilityTypeFilter ? reading.utilityType === utilityTypeFilter : true;
    const matchesReadingType = readingTypeFilter ? reading.type === readingTypeFilter : true;
    
    return matchesSearch && matchesApartment && matchesBooking && matchesUtilityType && matchesReadingType;
  });
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleApartmentFilterChange = (event: SelectChangeEvent) => {
    setApartmentFilter(event.target.value);
  };
  
  const handleBookingFilterChange = (event: SelectChangeEvent) => {
    setBookingFilter(event.target.value);
  };
  
  const handleUtilityTypeFilterChange = (event: SelectChangeEvent) => {
    setUtilityTypeFilter(event.target.value as UtilityType | '');
  };
  
  const handleReadingTypeFilterChange = (event: SelectChangeEvent) => {
    setReadingTypeFilter(event.target.value as ReadingType | '');
  };
  
  const handleReadingClick = (id: string) => {
    navigate(`/utilities/${id}`);
  };
  
  const handleAddReading = () => {
    navigate('/utilities/new');
  };

  // Function to calculate utility costs
  const calculateUtilityCost = (utilityType: UtilityType, value: number): string => {
    let rate = 0;
    
    switch (utilityType) {
      case 'electricity':
        rate = 1.5; // Example rate per unit for electricity
        break;
      case 'water':
        rate = 0.75; // Example rate per unit for water
        break;
      case 'gas':
        rate = 1.2; // Example rate per unit for gas
        break;
    }
    
    const cost = rate * value;
    return `${cost.toLocaleString()} EGP`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Utilities Readings</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddReading}
        >
          Add Reading
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
            <InputLabel>Booking</InputLabel>
            <Select
              value={bookingFilter}
              label="Booking"
              onChange={handleBookingFilterChange}
            >
              <MenuItem value="">
                <em>All Bookings</em>
              </MenuItem>
              {mockBookings.map(booking => {
                const apartment = mockApartments.find(apt => apt.id === booking.apartmentId);
                return (
                  <MenuItem key={booking.id} value={booking.id}>
                    {apartment?.name || 'Unknown'} ({new Date(booking.arrivalDate).toLocaleDateString()})
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 150 }} size="small">
            <InputLabel>Utility Type</InputLabel>
            <Select
              value={utilityTypeFilter}
              label="Utility Type"
              onChange={handleUtilityTypeFilterChange}
            >
              <MenuItem value="">
                <em>All Types</em>
              </MenuItem>
              <MenuItem value="electricity">Electricity</MenuItem>
              <MenuItem value="water">Water</MenuItem>
              <MenuItem value="gas">Gas</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 150 }} size="small">
            <InputLabel>Reading Type</InputLabel>
            <Select
              value={readingTypeFilter}
              label="Reading Type"
              onChange={handleReadingTypeFilterChange}
            >
              <MenuItem value="">
                <em>All Types</em>
              </MenuItem>
              <MenuItem value="start">Start</MenuItem>
              <MenuItem value="end">End</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Apartment</TableCell>
              <TableCell>Utility Type</TableCell>
              <TableCell>Reading Type</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Estimated Cost</TableCell>
              <TableCell>Booking</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReadings.length > 0 ? (
              filteredReadings.map(reading => {
                const apartment = mockApartments.find(apt => apt.id === reading.apartmentId);
                const booking = reading.bookingId ? 
                  mockBookings.find(b => b.id === reading.bookingId) : null;
                
                return (
                  <TableRow 
                    key={reading.id} 
                    hover 
                    onClick={() => handleReadingClick(reading.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{new Date(reading.date).toLocaleDateString()}</TableCell>
                    <TableCell>{apartment?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip
                        label={formatUtilityType(reading.utilityType)}
                        color={reading.utilityType === 'electricity' ? 'primary' : 
                              reading.utilityType === 'water' ? 'info' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatReadingType(reading.type)}
                        color={reading.type === 'start' ? 'success' : 'warning'}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{reading.value}</TableCell>
                    <TableCell>{calculateUtilityCost(reading.utilityType, reading.value)}</TableCell>
                    <TableCell>
                      {booking ? 
                        `${new Date(booking.arrivalDate).toLocaleDateString()} - ${new Date(booking.leavingDate).toLocaleDateString()}` 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReadingClick(reading.id);
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
                <TableCell colSpan={8} align="center">
                  No utility readings found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 