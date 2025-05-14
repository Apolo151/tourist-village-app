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
import { mockPayments, mockApartments, mockUsers, mockBookings } from '../mockData';

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'owner' | 'renter' | ''>('');
  const [bookingFilter, setBookingFilter] = useState('');
  const navigate = useNavigate();

  // Filter payments based on search and filters
  const filteredPayments = mockPayments.filter(payment => {
    const apartment = mockApartments.find(apt => apt.id === payment.apartmentId);
    const user = mockUsers.find(u => u.id === payment.userId);
    
    const matchesSearch = 
      apartment?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesApartment = apartmentFilter ? payment.apartmentId === apartmentFilter : true;
    const matchesUserType = userTypeFilter ? payment.userType === userTypeFilter : true;
    const matchesBooking = bookingFilter ? payment.bookingId === bookingFilter : true;
    
    return matchesSearch && matchesApartment && matchesUserType && matchesBooking;
  });
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleApartmentFilterChange = (event: SelectChangeEvent) => {
    setApartmentFilter(event.target.value);
  };
  
  const handleUserTypeFilterChange = (event: SelectChangeEvent) => {
    setUserTypeFilter(event.target.value as 'owner' | 'renter' | '');
  };
  
  const handleBookingFilterChange = (event: SelectChangeEvent) => {
    setBookingFilter(event.target.value);
  };
  
  const handlePaymentClick = (id: string) => {
    navigate(`/payments/${id}`);
  };
  
  const handleAddPayment = () => {
    navigate('/payments/new');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Payments</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddPayment}
        >
          Add Payment
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
            <InputLabel>User Type</InputLabel>
            <Select
              value={userTypeFilter}
              label="User Type"
              onChange={handleUserTypeFilterChange}
            >
              <MenuItem value="">
                <em>All User Types</em>
              </MenuItem>
              <MenuItem value="owner">Owner</MenuItem>
              <MenuItem value="renter">Renter</MenuItem>
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
        </Box>
      </Paper>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>User Type</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Apartment</TableCell>
              <TableCell>Booking</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPayments.length > 0 ? (
              filteredPayments.map(payment => {
                const apartment = mockApartments.find(apt => apt.id === payment.apartmentId);
                const user = mockUsers.find(u => u.id === payment.userId);
                const booking = payment.bookingId ? 
                  mockBookings.find(b => b.id === payment.bookingId) : null;
                
                return (
                  <TableRow 
                    key={payment.id} 
                    hover 
                    onClick={() => handlePaymentClick(payment.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell>
                      <Box sx={{ fontWeight: 'bold', color: payment.cost < 0 ? 'error.main' : 'success.main' }}>
                        {payment.cost.toLocaleString()} {payment.currency}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.userType === 'owner' ? 'Owner' : 'Renter'}
                        color={payment.userType === 'owner' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user?.name || 'Unknown'}</TableCell>
                    <TableCell>{apartment?.name || 'Unknown'}</TableCell>
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
                          handlePaymentClick(payment.id);
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
                  No payments found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 