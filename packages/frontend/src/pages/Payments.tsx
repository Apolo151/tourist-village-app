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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Visibility as ViewIcon, Edit as EditIcon } from '@mui/icons-material';
import { mockPayments, mockApartments, mockUsers, mockBookings, mockPaymentMethods } from '../mockData';
import { useAuth } from '../context/AuthContext';

// Payment form data interface
interface PaymentFormData {
  cost: number;
  currency: 'EGP' | 'GBP';
  description: string;
  placeOfPayment: string;
  userType: 'owner' | 'renter';
  userId: string;
  apartmentId: string;
  bookingId?: string;
}

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'owner' | 'renter' | ''>('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [openAddPaymentDialog, setOpenAddPaymentDialog] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    cost: 0,
    currency: 'EGP',
    description: '',
    placeOfPayment: '',
    userType: 'owner',
    userId: '',
    apartmentId: '',
  });
  
  const navigate = useNavigate();
  const { currentUser } = useAuth();

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
  
  const handleAddPayment = () => {
    setOpenAddPaymentDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenAddPaymentDialog(false);
    setPaymentFormData({
      cost: 0,
      currency: 'EGP',
      description: '',
      placeOfPayment: '',
      userType: 'owner',
      userId: '',
      apartmentId: '',
    });
  };
  
  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentFormData(prev => ({
      ...prev,
      [name]: name === 'cost' ? parseFloat(value) : value
    }));
  };
  
  const handlePaymentSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setPaymentFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmitPayment = () => {
    // In a real app, this would submit to an API
    const newPayment = {
      ...paymentFormData,
      id: `payment${Date.now()}`,  // Generate a unique ID
      createdById: currentUser?.id || 'user1', // Use current user ID or fallback
      createdAt: new Date().toISOString(),
    };
    
    console.log('Creating new payment:', newPayment);
    
    // In a real app, you would save this to your backend
    // For now we'll just close the dialog
    handleCloseDialog();
    
    // You could add the payment to local state here in a real implementation
    // For example: setPayments([...payments, newPayment]);
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
      
      {/* Add Payment Dialog */}
      <Dialog open={openAddPaymentDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Payment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Apartment *</InputLabel>
              <Select
                name="apartmentId"
                value={paymentFormData.apartmentId}
                label="Apartment *"
                onChange={handlePaymentSelectChange}
                required
              >
                {mockApartments.map(apt => (
                  <MenuItem key={apt.id} value={apt.id}>{apt.name} ({apt.village})</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>User Type *</InputLabel>
              <Select
                name="userType"
                value={paymentFormData.userType}
                label="User Type *"
                onChange={handlePaymentSelectChange}
                required
              >
                <MenuItem value="owner">Owner</MenuItem>
                <MenuItem value="renter">Renter</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>User *</InputLabel>
              <Select
                name="userId"
                value={paymentFormData.userId}
                label="User *"
                onChange={handlePaymentSelectChange}
                required
              >
                {mockUsers
                  .filter(user => 
                    (paymentFormData.userType === 'owner' && user.role === 'owner') ||
                    (paymentFormData.userType === 'renter' && user.role === 'renter')
                  )
                  .map(user => (
                    <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                  ))
                }
              </Select>
            </FormControl>
            
            {paymentFormData.userType === 'renter' && paymentFormData.apartmentId && (
              <FormControl fullWidth>
                <InputLabel>Related Booking {paymentFormData.userType === 'renter' ? '*' : ''}</InputLabel>
                <Select
                  name="bookingId"
                  value={paymentFormData.bookingId || ''}
                  label={`Related Booking ${paymentFormData.userType === 'renter' ? '*' : ''}`}
                  onChange={handlePaymentSelectChange}
                  required={paymentFormData.userType === 'renter'}
                >
                  {mockBookings
                    .filter(booking => 
                      booking.apartmentId === paymentFormData.apartmentId && 
                      booking.userId === paymentFormData.userId
                    )
                    .map(booking => (
                      <MenuItem key={booking.id} value={booking.id}>
                        {new Date(booking.arrivalDate).toLocaleDateString()} - {new Date(booking.leavingDate).toLocaleDateString()}
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
            )}
            
            <TextField
              name="description"
              label="Description *"
              fullWidth
              value={paymentFormData.description}
              onChange={handlePaymentInputChange}
              required
            />
            
            <TextField
              name="cost"
              label="Amount *"
              type="number"
              fullWidth
              value={paymentFormData.cost || ''}
              onChange={handlePaymentInputChange}
              inputProps={{ min: 0, step: 0.01 }}
              required
            />
            
            <FormControl fullWidth>
              <InputLabel>Currency *</InputLabel>
              <Select
                name="currency"
                value={paymentFormData.currency}
                label="Currency *"
                onChange={handlePaymentSelectChange}
                required
              >
                <MenuItem value="EGP">EGP</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Payment Type *</InputLabel>
              <Select
                name="placeOfPayment"
                value={paymentFormData.placeOfPayment}
                label="Payment Type *"
                onChange={handlePaymentSelectChange}
                required
              >
                {mockPaymentMethods.map(method => (
                  <MenuItem key={method.id} value={method.name}>{method.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitPayment} 
            variant="contained"
            disabled={
              !paymentFormData.apartmentId || 
              !paymentFormData.userId || 
              !paymentFormData.description || 
              !paymentFormData.cost || 
              !paymentFormData.placeOfPayment ||
              (paymentFormData.userType === 'renter' && !paymentFormData.bookingId)
            }
          >
            Add Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 