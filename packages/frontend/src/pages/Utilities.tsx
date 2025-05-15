import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { mockUtilities, mockApartments, mockBookings, mockSettings } from '../mockData';
import type { Utility, Apartment, Booking } from '../types';
import { format } from 'date-fns';

const Utilities: React.FC = () => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredUtilities, setFilteredUtilities] = useState<Utility[]>([]);
  
  // Filters
  const [apartmentFilter, setApartmentFilter] = useState<string>('');
  const [bookingFilter, setBookingFilter] = useState<string>('');
  const [utilityTypeFilter, setUtilityTypeFilter] = useState<string>('');
  const [completionFilter, setCompletionFilter] = useState<string>('');

  useEffect(() => {
    // Load the data
    setApartments(mockApartments);
    setBookings(mockBookings);
    setFilteredUtilities(mockUtilities);
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = [...mockUtilities];
    
    if (apartmentFilter) {
      filtered = filtered.filter(utility => utility.apartmentId === apartmentFilter);
    }
    
    if (bookingFilter) {
      filtered = filtered.filter(utility => utility.bookingId === bookingFilter);
    }
    
    if (utilityTypeFilter) {
      filtered = filtered.filter(utility => utility.utilityType === utilityTypeFilter);
    }
    
    if (completionFilter) {
      if (completionFilter === 'complete') {
        filtered = filtered.filter(utility => utility.endReading !== undefined);
      } else if (completionFilter === 'incomplete') {
        filtered = filtered.filter(utility => utility.endReading === undefined);
      }
    }
    
    setFilteredUtilities(filtered);
  }, [apartmentFilter, bookingFilter, utilityTypeFilter, completionFilter]);

  const handleApartmentFilterChange = (event: SelectChangeEvent) => {
    setApartmentFilter(event.target.value);
  };

  const handleBookingFilterChange = (event: SelectChangeEvent) => {
    setBookingFilter(event.target.value);
  };

  const handleUtilityTypeFilterChange = (event: SelectChangeEvent) => {
    setUtilityTypeFilter(event.target.value);
  };
  
  const handleCompletionFilterChange = (event: SelectChangeEvent) => {
    setCompletionFilter(event.target.value);
  };

  const clearFilters = () => {
    setApartmentFilter('');
    setBookingFilter('');
    setUtilityTypeFilter('');
    setCompletionFilter('');
  };

  // Group utilities by booking and utility type
  const groupedUtilities: Record<string, Record<string, Utility[]>> = {};

  filteredUtilities.forEach(utility => {
    if (!groupedUtilities[utility.bookingId]) {
      groupedUtilities[utility.bookingId] = {};
    }
    
    if (!groupedUtilities[utility.bookingId][utility.utilityType]) {
      groupedUtilities[utility.bookingId][utility.utilityType] = [];
    }
    
    // Add the utility to the appropriate group
    groupedUtilities[utility.bookingId][utility.utilityType].push(utility);
  });

  // Calculate bill for a utility
  const calculateBill = (utility: Utility) => {
    if (utility.endReading === undefined) return null;
    
    const consumption = utility.endReading - utility.startReading;
    
    if (consumption <= 0) return null;
    
    let unitPrice = 0;
    if (utility.utilityType === 'water') {
      unitPrice = mockSettings.waterPrice;
    } else if (utility.utilityType === 'electricity') {
      unitPrice = mockSettings.electricityPrice;
    }
    
    return {
      consumption,
      cost: consumption * unitPrice,
      currency: 'EGP'
    };
  };
  
  // Get apartment name by ID
  const getApartmentName = (apartmentId: string) => {
    const apartment = apartments.find(apt => apt.id === apartmentId);
    return apartment ? apartment.name : 'Unknown';
  };
  
  // Get booking dates by ID
  const getBookingDates = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return 'Unknown';
    
    return `${format(new Date(booking.arrivalDate), 'dd MMM yyyy')} - ${format(new Date(booking.leavingDate), 'dd MMM yyyy')}`;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Utilities
          </Typography>
          <Button 
            component={RouterLink} 
            to="/utilities/new" 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
          >
            Add New Reading
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Box sx={{ width: '100%', md: '25%', px: 1 }}>
              <FormControl fullWidth>
                <InputLabel id="apartment-filter-label">Apartment</InputLabel>
                <Select
                  labelId="apartment-filter-label"
                  id="apartment-filter"
                  value={apartmentFilter}
                  label="Apartment"
                  onChange={handleApartmentFilterChange}
                >
                  <MenuItem value="">
                    <em>All Apartments</em>
                  </MenuItem>
                  {apartments.map((apartment) => (
                    <MenuItem key={apartment.id} value={apartment.id}>
                      {apartment.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: '100%', md: '25%', px: 1 }}>
              <FormControl fullWidth>
                <InputLabel id="booking-filter-label">Booking</InputLabel>
                <Select
                  labelId="booking-filter-label"
                  id="booking-filter"
                  value={bookingFilter}
                  label="Booking"
                  onChange={handleBookingFilterChange}
                >
                  <MenuItem value="">
                    <em>All Bookings</em>
                  </MenuItem>
                  {bookings.map((booking) => (
                    <MenuItem key={booking.id} value={booking.id}>
                      {getApartmentName(booking.apartmentId)} ({format(new Date(booking.arrivalDate), 'dd MMM yyyy')})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: '100%', md: '25%', px: 1 }}>
              <FormControl fullWidth>
                <InputLabel id="utility-type-filter-label">Utility Type</InputLabel>
                <Select
                  labelId="utility-type-filter-label"
                  id="utility-type-filter"
                  value={utilityTypeFilter}
                  label="Utility Type"
                  onChange={handleUtilityTypeFilterChange}
                >
                  <MenuItem value="">
                    <em>All Types</em>
                  </MenuItem>
                  <MenuItem value="water">Water</MenuItem>
                  <MenuItem value="electricity">Electricity</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: '100%', md: '25%', px: 1 }}>
              <FormControl fullWidth>
                <InputLabel id="completion-filter-label">Status</InputLabel>
                <Select
                  labelId="completion-filter-label"
                  id="completion-filter"
                  value={completionFilter}
                  label="Status"
                  onChange={handleCompletionFilterChange}
                >
                  <MenuItem value="">
                    <em>All Statuses</em>
                  </MenuItem>
                  <MenuItem value="complete">Complete (Start & End)</MenuItem>
                  <MenuItem value="incomplete">Incomplete (Start Only)</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: '100%', px: 1, display: 'flex', alignItems: 'center', mt: 2 }}>
              <Button variant="outlined" onClick={clearFilters}>
                Clear Filters
              </Button>
            </Box>
          </Grid>
        </Paper>

        {/* Utilities List */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Utilities List
          </Typography>

          {Object.keys(groupedUtilities).length > 0 ? (
            Object.keys(groupedUtilities).map(bookingId => (
              <Box key={bookingId} sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Booking: {getBookingDates(bookingId)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Apartment: {getApartmentName(bookings.find(b => b.id === bookingId)?.apartmentId || '')}
                </Typography>
                
                {Object.keys(groupedUtilities[bookingId]).map(utilityType => {
                  const utilities = groupedUtilities[bookingId][utilityType];
                  
                  return (
                    <Box key={utilityType} sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                          {utilityType}
                        </Typography>
                        
                        {utilities.map(utility => {
                          const bill = calculateBill(utility);
                          if (bill) {
                            return (
                              <Chip 
                                key={utility.id}
                                label={`Consumption: ${bill.consumption} units (${bill.cost.toFixed(2)} ${bill.currency})`}
                                color="primary"
                                size="small"
                                sx={{ ml: 2 }}
                              />
                            );
                          }
                          return null;
                        })}
                      </Box>
                      
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Utility</TableCell>
                              <TableCell>Start Reading</TableCell>
                              <TableCell>End Reading</TableCell>
                              <TableCell>Start Date</TableCell>
                              <TableCell>End Date</TableCell>
                              <TableCell>Notes</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {utilities.map(utility => (
                              <TableRow key={utility.id}>
                                <TableCell sx={{ textTransform: 'capitalize' }}>
                                  {utility.utilityType}
                                </TableCell>
                                <TableCell>{utility.startReading}</TableCell>
                                <TableCell>{utility.endReading || '-'}</TableCell>
                                <TableCell>{format(new Date(utility.startDate), 'dd MMM yyyy')}</TableCell>
                                <TableCell>
                                  {utility.endDate ? format(new Date(utility.endDate), 'dd MMM yyyy') : '-'}
                                </TableCell>
                                <TableCell>
                                  {utility.startNotes || utility.endNotes ? (
                                    <Typography variant="body2" component="span">
                                      {utility.startNotes && <span>Start: {utility.startNotes}</span>}
                                      {utility.startNotes && utility.endNotes && <br />}
                                      {utility.endNotes && <span>End: {utility.endNotes}</span>}
                                    </Typography>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    component={RouterLink}
                                    to={utility.endReading 
                                      ? `/utilities/${utility.id}`
                                      : `/utilities/${utility.id}-end`}
                                    size="small"
                                    variant="outlined"
                                    color={utility.endReading ? "primary" : "success"}
                                    startIcon={utility.endReading ? null : <AddIcon />}
                                  >
                                    {utility.endReading ? 'View' : 'Add End Reading'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  );
                })}
              </Box>
            ))
          ) : (
            <Typography variant="body1">No utilities found. Try clearing filters or add a new reading.</Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Utilities; 