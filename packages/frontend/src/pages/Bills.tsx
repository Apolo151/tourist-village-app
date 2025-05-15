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
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  FilterList as FilterListIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  FileDownload as FileDownloadIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { mockApartments, mockUsers, mockVillages, mockBookings, mockServiceRequests, mockServiceTypes, mockPayments, mockUtilities, generateBillNumber } from '../mockData';
import { startOfYear, endOfYear, format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

// Type for bill display data
interface BillDisplayData {
  id: string;
  billNumber: string;
  apartmentName: string;
  userName: string;
  village: string;
  userType: 'owner' | 'renter';
  billDate: string;
  dueDate: string;
  isPaid: boolean;
  totalAmountEGP: number;
  totalAmountGBP: number;
  description: string;
  billType: 'service' | 'payment' | 'utility' | 'other';
  apartmentId: string;
  userId: string;
}

// Interface for the payment dialog form
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

export default function Bills() {
  const [searchTerm, setSearchTerm] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'owner' | 'renter' | ''>('');
  const [billTypeFilter, setBillTypeFilter] = useState<'service' | 'payment' | 'utility' | 'other' | ''>('');
  const [isPaidFilter, setIsPaidFilter] = useState<boolean | ''>('');
  const [billDisplayData, setBillDisplayData] = useState<BillDisplayData[]>([]);
  const [prevYearTotalEGP, setPrevYearTotalEGP] = useState(0);
  const [prevYearTotalGBP, setPrevYearTotalGBP] = useState(0);
  const [currentYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState<Date | null>(startOfYear(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfYear(new Date()));
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

  // Process bill data from service requests and payments
  useEffect(() => {
    const billsData: BillDisplayData[] = [];
    
    // Calculate due date (15 days from service date or created date)
    const calculateDueDate = (date: string): string => {
      const dueDate = new Date(date);
      dueDate.setDate(dueDate.getDate() + 15);
      return format(dueDate, 'yyyy-MM-dd');
    };
    
    // 1. Process service requests as bills
    mockServiceRequests.forEach(request => {
      const serviceType = mockServiceTypes.find(st => st.id === request.serviceTypeId);
      const apartment = mockApartments.find(apt => apt.id === request.apartmentId) || { name: 'Unknown', village: 'Unknown' };
      const user = mockUsers.find(u => u.id === request.userId) || { name: 'Unknown', role: 'owner' };
      
      if (serviceType) {
        // Only include service requests within date range
        const requestDate = new Date(request.requestDate);
        if (
          (!startDate || requestDate >= startDate) &&
          (!endDate || requestDate <= endDate)
        ) {
          billsData.push({
            id: request.id,
            billNumber: generateBillNumber('service', request.id),
            apartmentName: apartment.name,
            userName: user.name,
            village: apartment.village as string,
            userType: user.role === 'owner' ? 'owner' : 'renter',
            billDate: request.requestDate,
            dueDate: calculateDueDate(request.serviceDate || request.requestDate),
            isPaid: request.status === 'completed',
            totalAmountEGP: serviceType.currency === 'EGP' ? serviceType.cost : 0,
            totalAmountGBP: serviceType.currency === 'GBP' ? serviceType.cost : 0,
            description: `${serviceType.name} - ${serviceType.description}`,
            billType: 'service',
            apartmentId: request.apartmentId,
            userId: request.userId
          });
        }
      }
    });
    
    // 2. Process payments as bills
    mockPayments.forEach(payment => {
      const apartment = mockApartments.find(apt => apt.id === payment.apartmentId) || { name: 'Unknown', village: 'Unknown' };
      const user = mockUsers.find(u => u.id === payment.userId) || { name: 'Unknown', role: 'owner' };
      
      // Only include payments within date range
      const paymentDate = new Date(payment.createdAt);
      if (
        (!startDate || paymentDate >= startDate) &&
        (!endDate || paymentDate <= endDate)
      ) {
        billsData.push({
          id: payment.id,
          billNumber: generateBillNumber('payment', payment.id),
          apartmentName: apartment.name,
          userName: user.name,
          village: apartment.village as string,
          userType: payment.userType,
          billDate: payment.createdAt,
          dueDate: calculateDueDate(payment.createdAt),
          isPaid: true, // Payments are already paid
          totalAmountEGP: payment.currency === 'EGP' ? payment.cost : 0,
          totalAmountGBP: payment.currency === 'GBP' ? payment.cost : 0,
          description: payment.description,
          billType: 'payment',
          apartmentId: payment.apartmentId,
          userId: payment.userId
        });
      }
    });
    
    // 3. Process utilities as bills
    mockUtilities.forEach(utility => {
      // Skip utilities without end readings
      if (!utility.endReading) return;
      
      const apartment = mockApartments.find(apt => apt.id === utility.apartmentId) || { name: 'Unknown', village: 'Unknown' };
      const booking = mockBookings.find(b => b.id === utility.bookingId);
      const user = booking ? mockUsers.find(u => u.id === booking.userId) : null;
      
      if (user) {
        // Calculate utility cost
        const consumption = utility.endReading - utility.startReading;
        const village = mockVillages.find(v => v.name === apartment.village);
        let unitPrice = 0;
        
        if (utility.utilityType === 'electricity' && village) {
          unitPrice = village.electricityPrice;
        } else if (utility.utilityType === 'water' && village) {
          unitPrice = village.waterPrice;
        }
        
        const cost = consumption * unitPrice;
        
        // Only include utilities within date range
        const utilityDate = new Date(utility.endDate || utility.startDate);
        if (
          (!startDate || utilityDate >= startDate) &&
          (!endDate || utilityDate <= endDate)
        ) {
          billsData.push({
            id: utility.id,
            billNumber: generateBillNumber('utility', utility.id),
            apartmentName: apartment.name,
            userName: user.name,
            village: apartment.village as string,
            userType: user.role === 'owner' ? 'owner' : 'renter',
            billDate: utility.endDate || utility.startDate,
            dueDate: calculateDueDate(utility.endDate || utility.startDate),
            isPaid: true, // Assuming utilities are paid
            totalAmountEGP: cost, // Assume EGP
            totalAmountGBP: 0,
            description: `${utility.utilityType.charAt(0).toUpperCase() + utility.utilityType.slice(1)} consumption (${consumption} units)`,
            billType: 'utility',
            apartmentId: utility.apartmentId,
            userId: user.id
          });
        }
      }
    });
    
    // Apply filters
    const filteredDisplayData = billsData.filter(bill => {
      const matchesVillage = villageFilter ? bill.village === villageFilter : true;
      const matchesUserType = userTypeFilter ? bill.userType === userTypeFilter : true;
      const matchesBillType = billTypeFilter ? bill.billType === billTypeFilter : true;
      const matchesIsPaid = isPaidFilter !== '' ? bill.isPaid === isPaidFilter : true;
      const matchesSearch = 
        !searchTerm || 
        bill.apartmentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        bill.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesVillage && matchesUserType && matchesBillType && matchesIsPaid && matchesSearch;
    });
    
    // Sort by date (newest first)
    filteredDisplayData.sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
    
    setBillDisplayData(filteredDisplayData);
    
    // Calculate previous year totals
    const prevYearStart = new Date(currentYear - 1, 0, 1);
    const prevYearEnd = new Date(currentYear - 1, 11, 31);
    
    let totalPrevEGP = 0;
    let totalPrevGBP = 0;
    
    billsData.forEach(bill => {
      const billDate = new Date(bill.billDate);
      if (billDate >= prevYearStart && billDate <= prevYearEnd) {
        totalPrevEGP += bill.totalAmountEGP;
        totalPrevGBP += bill.totalAmountGBP;
      }
    });
    
    setPrevYearTotalEGP(totalPrevEGP);
    setPrevYearTotalGBP(totalPrevGBP);
    
  }, [searchTerm, villageFilter, userTypeFilter, billTypeFilter, isPaidFilter, startDate, endDate, currentYear]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleVillageFilterChange = (event: SelectChangeEvent) => {
    setVillageFilter(event.target.value);
  };
  
  const handleUserTypeFilterChange = (event: SelectChangeEvent) => {
    setUserTypeFilter(event.target.value as 'owner' | 'renter' | '');
  };
  
  const handleBillTypeFilterChange = (event: SelectChangeEvent) => {
    setBillTypeFilter(event.target.value as 'service' | 'payment' | 'utility' | 'other' | '');
  };
  
  const handleIsPaidFilterChange = (event: SelectChangeEvent) => {
    setIsPaidFilter(event.target.value === 'true' ? true : event.target.value === 'false' ? false : '');
  };
  
  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
  };
  
  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
  };
  
  const handleViewBillDetails = (billId: string) => {
    // In a real app, this would navigate to a bill details page
    console.log(`View bill details for ${billId}`);
  };
  
  const handleViewApartmentBills = (apartmentId: string) => {
    navigate(`/bills/apartment/${apartmentId}`);
  };
  
  const handleViewUserBills = (userId: string) => {
    navigate(`/bills/user/${userId}`);
  };
  
  const handleAddPayment = () => {
    setOpenAddPaymentDialog(true);
  };
  
  const handleClosePaymentDialog = () => {
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
    handleClosePaymentDialog();
    
    // You could add the payment to local state here in a real implementation
    // For example: setPayments([...payments, newPayment]);
  };
  
  const handleExportData = () => {
    // In a real app, this would generate and download a file
    console.log('Exporting data as PDF/Excel...');
  };

  // Get bill type label with color
  const getBillTypeChip = (type: 'service' | 'payment' | 'utility' | 'other') => {
    const typeConfig = {
      service: { label: 'Service', color: 'primary' as const },
      payment: { label: 'Payment', color: 'success' as const },
      utility: { label: 'Utility', color: 'info' as const },
      other: { label: 'Other', color: 'default' as const }
    };
    
    return (
      <Chip 
        label={typeConfig[type].label} 
        color={typeConfig[type].color}
        size="small"
      />
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Bills</Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportData}
              sx={{ mr: 1 }}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddPayment}
            >
              Add Payment
            </Button>
          </Box>
        </Box>
        
        {/* Previous Year Summary */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1">
            Total Bills for Previous Year ({currentYear - 1}): 
            <strong> {prevYearTotalEGP.toFixed(2)} EGP</strong> and 
            <strong> {prevYearTotalGBP.toFixed(2)} GBP</strong>
          </Typography>
        </Alert>
        
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            <FilterListIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Filters
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField
                label="Search"
                variant="outlined"
                size="small"
                fullWidth
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
            </Box>
            
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <FormControl fullWidth size="small">
                <InputLabel>Village</InputLabel>
                <Select
                  value={villageFilter}
                  label="Village"
                  onChange={handleVillageFilterChange}
                >
                  <MenuItem value="">All Villages</MenuItem>
                  {mockVillages.map(village => (
                    <MenuItem key={village.id} value={village.name}>{village.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
              <FormControl fullWidth size="small">
                <InputLabel>User Type</InputLabel>
                <Select
                  value={userTypeFilter}
                  label="User Type"
                  onChange={handleUserTypeFilterChange}
                >
                  <MenuItem value="">All Users</MenuItem>
                  <MenuItem value="owner">Owner</MenuItem>
                  <MenuItem value="renter">Renter</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
              <FormControl fullWidth size="small">
                <InputLabel>Bill Type</InputLabel>
                <Select
                  value={billTypeFilter}
                  label="Bill Type"
                  onChange={handleBillTypeFilterChange}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="service">Service</MenuItem>
                  <MenuItem value="payment">Payment</MenuItem>
                  <MenuItem value="utility">Utility</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: '1 1 120px', minWidth: '120px' }}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={isPaidFilter === true ? 'true' : isPaidFilter === false ? 'false' : ''}
                  label="Payment Status"
                  onChange={handleIsPaidFilterChange}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="true">Paid</MenuItem>
                  <MenuItem value="false">Unpaid</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: '1 1 300px', minWidth: '260px' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <DatePicker
                  label="From"
                  value={startDate}
                  onChange={handleStartDateChange}
                  slotProps={{ textField: { size: 'small' } }}
                  format="MM/dd/yyyy"
                />
                <DatePicker
                  label="To"
                  value={endDate}
                  onChange={handleEndDateChange}
                  slotProps={{ textField: { size: 'small' } }}
                  format="MM/dd/yyyy"
                />
              </Box>
            </Box>
          </Box>
        </Paper>
        
        {/* Bills Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Bill #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Village</TableCell>
                <TableCell>Apartment</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Amount (EGP)</TableCell>
                <TableCell align="right">Amount (GBP)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {billDisplayData.length > 0 ? (
                billDisplayData.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>{bill.billNumber}</TableCell>
                    <TableCell>{new Date(bill.billDate).toLocaleDateString()}</TableCell>
                    <TableCell>{bill.village}</TableCell>
                    <TableCell>{bill.apartmentName}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {bill.userName}
                        <Chip 
                          label={bill.userType === 'owner' ? 'Owner' : 'Renter'} 
                          color={bill.userType === 'owner' ? 'primary' : 'default'}
                          size="small"
                          variant="outlined"
                          sx={{ height: '18px', fontSize: '0.65rem' }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>{getBillTypeChip(bill.billType)}</TableCell>
                    <TableCell>{bill.description}</TableCell>
                    <TableCell align="right">
                      {bill.totalAmountEGP > 0 ? `${bill.totalAmountEGP.toLocaleString()} EGP` : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {bill.totalAmountGBP > 0 ? `${bill.totalAmountGBP.toLocaleString()} GBP` : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={bill.isPaid ? 'Paid' : 'Unpaid'} 
                        color={bill.isPaid ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Tooltip title="View Bill Details">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewBillDetails(bill.id)}
                          >
                            <AssignmentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Apartment Bills">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewApartmentBills(bill.apartmentId)}
                          >
                            <HomeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View User Bills">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewUserBills(bill.userId)}
                          >
                            <PersonIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} align="center">No bills found matching your criteria.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Add Payment Dialog */}
        <Dialog open={openAddPaymentDialog} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Payment</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Apartment</InputLabel>
                <Select
                  name="apartmentId"
                  value={paymentFormData.apartmentId}
                  label="Apartment"
                  onChange={handlePaymentSelectChange}
                >
                  {mockApartments.map(apt => (
                    <MenuItem key={apt.id} value={apt.id}>{apt.name} ({apt.village})</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>User Type</InputLabel>
                <Select
                  name="userType"
                  value={paymentFormData.userType}
                  label="User Type"
                  onChange={handlePaymentSelectChange}
                >
                  <MenuItem value="owner">Owner</MenuItem>
                  <MenuItem value="renter">Renter</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>User</InputLabel>
                <Select
                  name="userId"
                  value={paymentFormData.userId}
                  label="User"
                  onChange={handlePaymentSelectChange}
                >
                  {mockUsers
                    .filter(user => user.role === paymentFormData.userType || (paymentFormData.userType === 'owner' && user.role === 'admin'))
                    .map(user => (
                      <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
              
              {paymentFormData.userType === 'renter' && paymentFormData.apartmentId && (
                <FormControl fullWidth>
                  <InputLabel>Booking (Optional)</InputLabel>
                  <Select
                    name="bookingId"
                    value={paymentFormData.bookingId || ''}
                    label="Booking (Optional)"
                    onChange={handlePaymentSelectChange}
                  >
                    <MenuItem value="">None</MenuItem>
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
                label="Description"
                fullWidth
                value={paymentFormData.description}
                onChange={handlePaymentInputChange}
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  name="cost"
                  label="Amount"
                  type="number"
                  fullWidth
                  value={paymentFormData.cost || ''}
                  onChange={handlePaymentInputChange}
                  inputProps={{ min: 0, step: 0.01 }}
                />
                
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    name="currency"
                    value={paymentFormData.currency}
                    label="Currency"
                    onChange={handlePaymentSelectChange}
                  >
                    <MenuItem value="EGP">EGP</MenuItem>
                    <MenuItem value="GBP">GBP</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  name="placeOfPayment"
                  value={paymentFormData.placeOfPayment}
                  label="Payment Method"
                  onChange={handlePaymentSelectChange}
                >
                  {['Cash', 'Bank transfer', 'Credit Card'].map(method => (
                    <MenuItem key={method} value={method}>{method}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePaymentDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmitPayment} 
              variant="contained"
              disabled={
                !paymentFormData.apartmentId || 
                !paymentFormData.userId || 
                !paymentFormData.description || 
                !paymentFormData.cost || 
                !paymentFormData.placeOfPayment
              }
            >
              Add Payment
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
} 