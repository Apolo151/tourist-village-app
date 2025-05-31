import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Visibility as ViewIcon, Edit as EditIcon } from '@mui/icons-material';
import { mockPayments, mockApartments, mockUsers, mockBookings } from '../mockData';

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'owner' | 'renter' | ''>('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  
  const navigate = useNavigate();

  // Filter payments based on search and filters
  const filteredPayments = mockPayments.filter(payment => {
    const apartment = mockApartments.find(apt => apt.id === payment.apartmentId);
    const user = mockUsers.find(u => u.id === payment.userId);
    
    const matchesSearch = 
      searchTerm === '' ||
      apartment?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesApartment = apartmentFilter ? payment.apartmentId === apartmentFilter : true;
    const matchesUserType = userTypeFilter ? payment.userType === userTypeFilter : true;
    const matchesBooking = bookingFilter ? payment.bookingId === bookingFilter : true;
    const matchesUser = userFilter ? payment.userId === userFilter : true;
    const matchesPaymentType = paymentTypeFilter ? payment.placeOfPayment === paymentTypeFilter : true;
    
    return matchesSearch && matchesApartment && matchesUserType && matchesBooking && matchesUser && matchesPaymentType;
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
  
  const handleUserFilterChange = (event: SelectChangeEvent) => {
    setUserFilter(event.target.value);
  };
  
  const handlePaymentTypeFilterChange = (event: SelectChangeEvent) => {
    setPaymentTypeFilter(event.target.value);
  };
  
  const handlePaymentClick = (id: string) => {
    navigate(`/payments/${id}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Payments</Typography>
        <Button
          component={RouterLink}
          to="/payments/new"
          variant="contained"
          startIcon={<AddIcon />}
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
            <InputLabel>User</InputLabel>
            <Select
              value={userFilter}
              label="User"
              onChange={handleUserFilterChange}
            >
              <MenuItem value="">
                <em>All Users</em>
              </MenuItem>
              {mockUsers.map(user => (
                <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
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
            <InputLabel>Payment Type</InputLabel>
            <Select
              value={paymentTypeFilter}
              label="Payment Type"
              onChange={handlePaymentTypeFilterChange}
            >
              <MenuItem value="">
                <em>All Payment Types</em>
              </MenuItem>
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Bank transfer">Bank Transfer</MenuItem>
              <MenuItem value="Credit Card">Credit Card</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Payment Type</TableCell>
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
                  >
                    <TableCell>{payment.id.substring(0, 8)}</TableCell>
                    <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell>
                      <Box sx={{ fontWeight: 'bold', color: payment.cost < 0 ? 'error.main' : 'success.main' }}>
                        {payment.cost.toLocaleString()} {payment.currency}
                      </Box>
                    </TableCell>
                    <TableCell>{payment.placeOfPayment}</TableCell>
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
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          size="small" 
                          variant="outlined"
                          startIcon={<ViewIcon />}
                          onClick={() => handlePaymentClick(payment.id)}
                        >
                          View
                        </Button>
                        <Button 
                          size="small" 
                          variant="contained"
                          startIcon={<EditIcon />}
                          onClick={() => navigate(`/payments/${payment.id}/edit`)}
                        >
                          Edit
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10} align="center">
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