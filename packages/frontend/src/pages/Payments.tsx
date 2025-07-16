import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  CircularProgress,
  Pagination,
  Container,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  Visibility as ViewIcon, 
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/paymentService';
import type { Payment, PaymentFilters, PaymentMethod } from '../services/paymentService';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';
import { userService } from '../services/userService';
import type { User } from '../services/userService';
import { format, parseISO } from 'date-fns';
import ExportButtons from '../components/ExportButtons';

export default function Payments() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'owner' | 'renter' | ''>('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'EGP' | 'GBP' | ''>('');
  const [methodFilter, setMethodFilter] = useState('');
  
  // Data states
  const [payments, setPayments] = useState<Payment[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  
  // Pagination
  const [pagination, setPagination] = useState({
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
        const [apartmentsData, usersData, paymentMethodsData] = await Promise.all([
          apartmentService.getApartments({ limit: 100 }),
          userService.getUsers({ limit: 100 }),
          paymentService.getPaymentMethods({ limit: 100 })
        ]);
        
        setApartments(apartmentsData.data);
        setUsers(usersData.data);
        setPaymentMethods(paymentMethodsData.data);
        
        // Load bookings if user has access
        if (isAdmin) {
          const bookingsData = await bookingService.getBookings({ limit: 100 });
          setBookings(bookingsData.bookings || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isAdmin]);
  
  // Load payments
  useEffect(() => {
    const loadPayments = async () => {
      try {
        const filters: PaymentFilters = {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm || undefined,
          apartment_id: apartmentFilter ? parseInt(apartmentFilter) : undefined,
          user_type: userTypeFilter || undefined,
          booking_id: bookingFilter ? parseInt(bookingFilter) : undefined,
          currency: currencyFilter || undefined,
          method_id: methodFilter ? parseInt(methodFilter) : undefined,
          created_by: userFilter ? parseInt(userFilter) : undefined,
          sort_by: 'date',
          sort_order: 'desc'
        };
        
        const response = await paymentService.getPayments(filters);
        setPayments(response.data || []);
        
        if (response.pagination) {
          setPagination({
            page: response.pagination.page || 1,
            limit: response.pagination.limit || 20,
            total: response.pagination.total || 0,
            total_pages: response.pagination.total_pages || 0
          });
        }
      } catch (err) {
        console.error('Error loading payments:', err);
        setPayments([]);
        setPagination(prev => ({ ...prev, total: 0, total_pages: 0 }));
      }
    };

    if (!loading) {
      loadPayments();
    }
  }, [loading, searchTerm, apartmentFilter, userFilter, userTypeFilter, bookingFilter, currencyFilter, methodFilter, pagination.page]);
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleApartmentFilterChange = (event: SelectChangeEvent) => {
    setApartmentFilter(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleUserFilterChange = (event: SelectChangeEvent) => {
    setUserFilter(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleUserTypeFilterChange = (event: SelectChangeEvent) => {
    setUserTypeFilter(event.target.value as 'owner' | 'renter' | '');
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleBookingFilterChange = (event: SelectChangeEvent) => {
    setBookingFilter(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleCurrencyFilterChange = (event: SelectChangeEvent) => {
    setCurrencyFilter(event.target.value as 'EGP' | 'GBP' | '');
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleMethodFilterChange = (event: SelectChangeEvent) => {
    setMethodFilter(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };
  
  const handlePaymentClick = (id: number) => {
    navigate(`/payments/${id}`);
  };
  
  const handleAddPayment = () => {
    navigate('/payments/new');
  };
  
  const handleEditPayment = (id: number) => {
    navigate(`/payments/${id}/edit`);
  };
  
  const handleDeleteClick = (payment: Payment) => {
    setPaymentToDelete(payment);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;
    
    try {
      await paymentService.deletePayment(paymentToDelete.id);
      setSnackbarMessage('Payment deleted successfully');
      setOpenSnackbar(true);
      
      // Reload payments
      const filters: PaymentFilters = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        apartment_id: apartmentFilter ? parseInt(apartmentFilter) : undefined,
        user_type: userTypeFilter || undefined,
        booking_id: bookingFilter ? parseInt(bookingFilter) : undefined,
        currency: currencyFilter || undefined,
        method_id: methodFilter ? parseInt(methodFilter) : undefined,
        created_by: userFilter ? parseInt(userFilter) : undefined,
        sort_by: 'date',
        sort_order: 'desc'
      };
      
      const response = await paymentService.getPayments(filters);
      setPayments(response.data || []);
    } catch (err) {
      setSnackbarMessage(err instanceof Error ? err.message : 'Failed to delete payment');
      setOpenSnackbar(true);
    } finally {
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateString;
    }
  };
  
  // Data transformer for export
  const transformPaymentsForExport = (paymentsData: Payment[]) => {
    return paymentsData.map(payment => ({
      id: payment.id,
      date: formatDate(payment.date),
      description: payment.description || 'No description',
      amount: paymentService.formatAmount(payment.amount, payment.currency),
      currency: payment.currency,
      method: payment.payment_method?.name || 'Unknown',
      user_type: payment.user_type === 'owner' ? 'Owner' : 'Tenant',
      apartment: payment.apartment?.name || 'Unknown',
      village: payment.apartment?.village?.name || 'Unknown',
      booking: payment.booking ? 
        `${formatDate(payment.booking.arrival_date)} - ${formatDate(payment.booking.leaving_date)}` : 
        'No booking',
      created_by: payment.created_by_user?.name || 'Unknown'
    }));
  };
  
  // Check for success message from URL
  useEffect(() => {
    const success = searchParams.get('success');
    const message = searchParams.get('message');
    
    if (success && message) {
      setSnackbarMessage(decodeURIComponent(message));
      setOpenSnackbar(true);
      
      // Clear URL parameters
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('success');
      newSearchParams.delete('message');
      navigate(`/payments?${newSearchParams.toString()}`, { replace: true });
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

  function clearFilters(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    event.preventDefault();
    setSearchTerm('');
    setApartmentFilter('');
    setUserFilter('');
    setUserTypeFilter('');
    setBookingFilter('');
    setCurrencyFilter('');
    setMethodFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
  }
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ mt: 3 }}>
            Payments
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddPayment}
          >
            Add Payment
          </Button>
        </Box>
        
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon /> Filters:
            </Typography>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </Box>
          
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
                {(apartments || []).map(apt => (
                  <MenuItem key={apt.id} value={apt.id.toString()}>{apt.name}</MenuItem>
                ))}
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
                {(users || []).map(user => (
                  <MenuItem key={user.id} value={user.id.toString()}>{user.name} ({user.role})</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 120 }} size="small">
              <InputLabel>User Type</InputLabel>
              <Select
                value={userTypeFilter}
                label="User Type"
                onChange={handleUserTypeFilterChange}
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                <MenuItem value="owner">Owner</MenuItem>
                <MenuItem value="renter">Tenant</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 120 }} size="small">
              <InputLabel>Currency</InputLabel>
              <Select
                value={currencyFilter}
                label="Currency"
                onChange={handleCurrencyFilterChange}
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                <MenuItem value="EGP">EGP</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={methodFilter}
                label="Payment Method"
                onChange={handleMethodFilterChange}
              >
                <MenuItem value="">
                  <em>All Methods</em>
                </MenuItem>
                {(paymentMethods || []).map(method => (
                  <MenuItem key={method.id} value={method.id.toString()}>{method.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {isAdmin && (
              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel>Booking</InputLabel>
                <Select
                  value={bookingFilter}
                  label="Booking"
                  onChange={handleBookingFilterChange}
                >
                  <MenuItem value="">
                    <em>All Bookings</em>
                  </MenuItem>
                  {(bookings || []).map(booking => (
                    <MenuItem key={booking.id} value={booking.id.toString()}>
                      {booking.apartment?.name || 'Unknown'} - {formatDate(booking.arrival_date)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </Paper>
        
        {/* Export Buttons */}
        <ExportButtons data={transformPaymentsForExport(payments)} columns={["id","date","description","amount","currency","method","user_type","apartment","village","booking","created_by"]} excelFileName="payments.xlsx" pdfFileName="payments.pdf" />
        
        {/* Payments Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>User Type</TableCell>
                <TableCell>Apartment</TableCell>
                <TableCell>Booking</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments && payments.length > 0 ? (
                payments.map(payment => (
                  <TableRow 
                    key={payment.id} 
                    hover 
                    onClick={() => handlePaymentClick(payment.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{payment.id}</TableCell>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>{payment.description || 'No description'}</TableCell>
                    <TableCell>
                      <Chip
                        label={paymentService.formatAmount(payment.amount, payment.currency)}
                        color={paymentService.getCurrencyColor(payment.currency)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{payment.payment_method?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip
                        label={payment.user_type === 'owner' ? 'Owner' : 'Tenant'}
                        color={paymentService.getUserTypeColor(payment.user_type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{payment.apartment?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      {payment.booking ? 
                        `${formatDate(payment.booking.arrival_date)} - ${formatDate(payment.booking.leaving_date)}` 
                        : '-'}
                    </TableCell>
                    <TableCell>{payment.created_by_user?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePaymentClick(payment.id);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {(isAdmin || payment.created_by === currentUser?.id) && (
                          <>
                            <Tooltip title="Edit Payment">
                              <IconButton 
                                size="small" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPayment(payment.id);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Payment">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(payment);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
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
        
        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={pagination.total_pages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
        
        {/* Results summary */}
        <Box sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} payments
          </Typography>
        </Box>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Payment</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this payment? This action cannot be undone.
            </Typography>
            {paymentToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Payment:</strong> {paymentService.formatAmount(paymentToDelete.amount, paymentToDelete.currency)}
                </Typography>
                <Typography variant="body2">
                  <strong>Date:</strong> {formatDate(paymentToDelete.date)}
                </Typography>
                <Typography variant="body2">
                  <strong>Description:</strong> {paymentToDelete.description || 'No description'}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
        
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
