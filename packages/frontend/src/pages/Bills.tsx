import { useState, useEffect } from 'react';
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
  FileDownload as FileDownloadIcon,
  Assignment as AssignmentIcon,
  TouchApp as TouchAppIcon
} from '@mui/icons-material';
import { mockApartments, mockUsers, mockVillages, mockBookings, mockServiceRequests, mockServiceTypes, mockPayments } from '../mockData';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
  description: string;
  billType: 'service' | 'payment';
  apartmentId: string;
  userId: string;
  bookingId?: string;
  bookingArrivalDate?: string;
  totalMoneySpentEGP: number;
  totalMoneySpentGBP: number;
  totalMoneyRequestedEGP: number;
  totalMoneyRequestedGBP: number;
  netMoneyEGP: number;
  netMoneyGBP: number;
}

interface BillSummary {
  totalMoneySpentEGP: number;
  totalMoneySpentGBP: number;
  totalMoneyRequestedEGP: number;
  totalMoneyRequestedGBP: number;
  netMoneyEGP: number;
  netMoneyGBP: number;
}

interface HighlightedBillSummary {
  ownerSummary: BillSummary & { userName: string };
  renterSummary?: BillSummary & { userName: string };
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
  const [billDisplayData, setBillDisplayData] = useState<BillDisplayData[]>([]);
  const [prevYearTotalEGP, setPrevYearTotalEGP] = useState(0);
  const [prevYearTotalGBP, setPrevYearTotalGBP] = useState(0);
  const [currentYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState<Date | null>(new Date(currentYear, 0, 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date(currentYear, 11, 31));
  const [openAddPaymentDialog, setOpenAddPaymentDialog] = useState(false);
  const [highlightedBill, setHighlightedBill] = useState<string | null>(null);
  const [highlightedBillSummary, setHighlightedBillSummary] = useState<HighlightedBillSummary | null>(null);
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    cost: 0,
    currency: 'EGP',
    description: '',
    placeOfPayment: '',
    userType: 'owner',
    userId: '',
    apartmentId: '',
  });
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Calculate bill summary for a specific user type and apartment
  const calculateBillSummary = (apartmentId: string, userType: 'owner' | 'renter'): BillSummary => {
    const relevantBills = billDisplayData.filter(bill => 
      bill.apartmentId === apartmentId && bill.userType === userType
    );

    return {
      totalMoneySpentEGP: relevantBills.reduce((sum, bill) => sum + bill.totalMoneySpentEGP, 0),
      totalMoneySpentGBP: relevantBills.reduce((sum, bill) => sum + bill.totalMoneySpentGBP, 0),
      totalMoneyRequestedEGP: relevantBills.reduce((sum, bill) => sum + bill.totalMoneyRequestedEGP, 0),
      totalMoneyRequestedGBP: relevantBills.reduce((sum, bill) => sum + bill.totalMoneyRequestedGBP, 0),
      netMoneyEGP: relevantBills.reduce((sum, bill) => sum + bill.netMoneyEGP, 0),
      netMoneyGBP: relevantBills.reduce((sum, bill) => sum + bill.netMoneyGBP, 0),
    };
  };

  // Handle bill highlighting
  const handleHighlightBill = (billId: string) => {
    const bill = billDisplayData.find(b => b.id === billId);
    if (!bill) return;

    setHighlightedBill(billId);
    
    // Get owner user for this apartment
    const apartment = mockApartments.find(apt => apt.id === bill.apartmentId);
    const ownerUser = apartment ? mockUsers.find(u => u.id === apartment.ownerId) : null;
    
    const summary: HighlightedBillSummary = {
      ownerSummary: {
        ...calculateBillSummary(bill.apartmentId, 'owner'),
        userName: ownerUser?.name || 'Unknown Owner'
      },
    };

    // If there's a booking, add renter summary
    if (bill.bookingId) {
      const renterUser = mockUsers.find(u => u.id === bill.userId && bill.userType === 'renter');
      summary.renterSummary = {
        ...calculateBillSummary(bill.apartmentId, 'renter'),
        userName: renterUser?.name || 'Unknown Renter'
      };
    }

    setHighlightedBillSummary(summary);
  };

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
      const booking = mockBookings.find(b => b.apartmentId === request.apartmentId && b.userId === request.userId);
      
      if (serviceType) {
        // Only include service requests within date range
        const requestDate = new Date(request.requestDate);
        if (
          (!startDate || requestDate >= startDate) &&
          (!endDate || requestDate <= endDate)
        ) {
          billsData.push({
            id: request.id,
            billNumber: request.id,
            apartmentName: apartment.name,
            userName: user.name,
            village: apartment.village as string,
            userType: user.role === 'owner' ? 'owner' : 'renter',
            billDate: request.requestDate,
            dueDate: calculateDueDate(request.serviceDate || request.requestDate),
            isPaid: request.status === 'completed',
            totalMoneySpentEGP: 0,
            totalMoneySpentGBP: 0,
            totalMoneyRequestedEGP: serviceType.currency === 'EGP' ? serviceType.cost : 0,
            totalMoneyRequestedGBP: serviceType.currency === 'GBP' ? serviceType.cost : 0,
            netMoneyEGP: serviceType.currency === 'EGP' ? -serviceType.cost : 0,
            netMoneyGBP: serviceType.currency === 'GBP' ? -serviceType.cost : 0,
            description: `${serviceType.name} - ${serviceType.description}`,
            billType: 'service',
            apartmentId: request.apartmentId,
            userId: request.userId,
            bookingId: booking?.id,
            bookingArrivalDate: booking?.arrivalDate
          });
        }
      }
    });
    
    // 2. Process payments as bills
    mockPayments.forEach(payment => {
      const apartment = mockApartments.find(apt => apt.id === payment.apartmentId) || { name: 'Unknown', village: 'Unknown' };
      const user = mockUsers.find(u => u.id === payment.userId) || { name: 'Unknown', role: 'owner' };
      const booking = mockBookings.find(b => b.id === payment.bookingId);
      
      // Only include payments within date range
      const paymentDate = new Date(payment.createdAt);
      if (
        (!startDate || paymentDate >= startDate) &&
        (!endDate || paymentDate <= endDate)
      ) {
        billsData.push({
          id: payment.id,
          billNumber: payment.id,
          apartmentName: apartment.name,
          userName: user.name,
          village: apartment.village as string,
          userType: payment.userType,
          billDate: payment.createdAt,
          dueDate: calculateDueDate(payment.createdAt),
          isPaid: true, // Payments are already paid
          totalMoneySpentEGP: payment.currency === 'EGP' ? payment.cost : 0,
          totalMoneySpentGBP: payment.currency === 'GBP' ? payment.cost : 0,
          totalMoneyRequestedEGP: 0,
          totalMoneyRequestedGBP: 0,
          netMoneyEGP: payment.currency === 'EGP' ? payment.cost : 0,
          netMoneyGBP: payment.currency === 'GBP' ? payment.cost : 0,
          description: payment.description,
          billType: 'payment',
          apartmentId: payment.apartmentId,
          userId: payment.userId,
          bookingId: payment.bookingId,
          bookingArrivalDate: booking?.arrivalDate
        });
      }
    });
    
    // Apply filters
    const filteredDisplayData = billsData.filter(bill => {
      const matchesVillage = villageFilter ? bill.village === villageFilter : true;
      const matchesUserType = userTypeFilter ? bill.userType === userTypeFilter : true;
      const matchesSearch = 
        !searchTerm || 
        bill.apartmentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        bill.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesVillage && matchesUserType && matchesSearch;
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
        totalPrevEGP += bill.totalMoneySpentEGP;
        totalPrevGBP += bill.totalMoneySpentGBP;
      }
    });
    
    setPrevYearTotalEGP(totalPrevEGP);
    setPrevYearTotalGBP(totalPrevGBP);
    
  }, [searchTerm, villageFilter, userTypeFilter, startDate, endDate, currentYear]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleVillageFilterChange = (event: SelectChangeEvent) => {
    setVillageFilter(event.target.value);
  };
  
  const handleUserTypeFilterChange = (event: SelectChangeEvent) => {
    setUserTypeFilter(event.target.value as 'owner' | 'renter' | '');
  };
  
  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
  };
  
  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
  };
  
  const handleViewBillDetails = (billId: string) => {
    navigate(`/bills/${billId}`);
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
    handleClosePaymentDialog();
  };
  
  const handleExportData = () => {
    // In a real app, this would generate and download a file
    console.log('Exporting data as PDF/Excel...');
  };

  // Get bill type label with color
  const getBillTypeChip = (type: 'service' | 'payment') => {
    const typeConfig = {
      service: { label: 'Service', color: 'primary' as const },
      payment: { label: 'Payment', color: 'success' as const }
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
              sx={{ mr: 1 }}
            >
              Add Payment
            </Button>
          </Box>
        </Box>
        
        {/* Previous Year Summary */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1">
            Running Total for Previous Years: 
            <strong> {prevYearTotalEGP.toFixed(2)} EGP</strong> and 
            <strong> {prevYearTotalGBP.toFixed(2)} GBP</strong>
          </Typography>
        </Alert>

        {/* Highlighted Bill Summary */}
        {highlightedBillSummary && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Selected Bill Summary</Typography>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box>
                <Typography variant="subtitle1" color="primary">Owner Summary - {highlightedBillSummary.ownerSummary.userName}</Typography>
                <Typography>Total Money Spent: {highlightedBillSummary.ownerSummary.totalMoneySpentEGP} EGP / {highlightedBillSummary.ownerSummary.totalMoneySpentGBP} GBP</Typography>
                <Typography>Total Money Requested: {highlightedBillSummary.ownerSummary.totalMoneyRequestedEGP} EGP / {highlightedBillSummary.ownerSummary.totalMoneyRequestedGBP} GBP</Typography>
                <Typography>Net Money: {highlightedBillSummary.ownerSummary.netMoneyEGP} EGP / {highlightedBillSummary.ownerSummary.netMoneyGBP} GBP</Typography>
              </Box>
              {highlightedBillSummary.renterSummary && (
                <Box>
                  <Typography variant="subtitle1" color="secondary">Renter Summary - {highlightedBillSummary.renterSummary.userName}</Typography>
                  <Typography>Total Money Spent: {highlightedBillSummary.renterSummary.totalMoneySpentEGP} EGP / {highlightedBillSummary.renterSummary.totalMoneySpentGBP} GBP</Typography>
                  <Typography>Total Money Requested: {highlightedBillSummary.renterSummary.totalMoneyRequestedEGP} EGP / {highlightedBillSummary.renterSummary.totalMoneyRequestedGBP} GBP</Typography>
                  <Typography>Net Money: {highlightedBillSummary.renterSummary.netMoneyEGP} EGP / {highlightedBillSummary.renterSummary.netMoneyGBP} GBP</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        )}
        
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
                <TableCell>Description</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Village</TableCell>
                <TableCell>Apartment</TableCell>
                <TableCell>User Name</TableCell>
                <TableCell>Booking ID</TableCell>
                <TableCell>Booking Arrival Date</TableCell>
                <TableCell align="right">Money Spent (EGP/GBP)</TableCell>
                <TableCell align="right">Money Requested (EGP/GBP)</TableCell>
                <TableCell align="right">Net Money (EGP/GBP)</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {billDisplayData.length > 0 ? (
                billDisplayData.map((bill) => (
                  <TableRow 
                    key={bill.id}
                    selected={bill.id === highlightedBill}
                  >
                    <TableCell>{bill.description}</TableCell>
                    <TableCell>{getBillTypeChip(bill.billType)}</TableCell>
                    <TableCell>{bill.village}</TableCell>
                    <TableCell>{bill.apartmentName}</TableCell>
                    <TableCell>
                      <Tooltip title="Click to view financial summary for this apartment" arrow>
                        <Box 
                          component="button"
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            cursor: 'pointer',
                            border: 'none',
                            background: 'transparent',
                            padding: '8px 12px',
                            borderRadius: 2,
                            transition: 'all 0.2s ease-in-out',
                            textAlign: 'left',
                            width: '100%',
                            minHeight: '40px',
                            '&:hover': {
                              backgroundColor: 'primary.light',
                              color: 'primary.contrastText',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              '& .click-icon': {
                                opacity: 1,
                                transform: 'scale(1.1)'
                              },
                              '& .user-name': {
                                color: 'primary.contrastText'
                              },
                              '& .MuiChip-root': {
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                color: 'primary.contrastText',
                                borderColor: 'rgba(255,255,255,0.3)'
                              }
                            },
                            '&:active': {
                              transform: 'translateY(0px)',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                            },
                            ...(bill.id === highlightedBill && {
                              backgroundColor: 'primary.main',
                              color: 'primary.contrastText',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                              '& .user-name': {
                                color: 'primary.contrastText'
                              },
                              '& .MuiChip-root': {
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                color: 'primary.contrastText',
                                borderColor: 'rgba(255,255,255,0.3)'
                              }
                            })
                          }}
                          onClick={() => handleHighlightBill(bill.id)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                            <Typography 
                              className="user-name"
                              variant="body2" 
                              sx={{ 
                                fontWeight: 500,
                                color: 'text.primary'
                              }}
                            >
                              {bill.userName}
                            </Typography>
                            <Chip 
                              label={bill.userType === 'owner' ? 'Owner' : 'Renter'} 
                              color={bill.userType === 'owner' ? 'primary' : 'default'}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                height: '20px', 
                                fontSize: '0.65rem'
                              }}
                            />
                          </Box>
                          <TouchAppIcon 
                            className="click-icon"
                            sx={{ 
                              fontSize: '16px',
                              opacity: 0.6,
                              color: 'text.secondary',
                              transition: 'all 0.2s ease-in-out',
                              ...(bill.id === highlightedBill && {
                                opacity: 1,
                                color: 'primary.contrastText'
                              })
                            }} 
                          />
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{bill.bookingId || '-'}</TableCell>
                    <TableCell>{bill.bookingArrivalDate ? new Date(bill.bookingArrivalDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell align="right">
                      {bill.totalMoneySpentEGP > 0 && `${bill.totalMoneySpentEGP.toLocaleString()} EGP`}
                      {bill.totalMoneySpentEGP > 0 && bill.totalMoneySpentGBP > 0 && ' / '}
                      {bill.totalMoneySpentGBP > 0 && `${bill.totalMoneySpentGBP.toLocaleString()} GBP`}
                      {bill.totalMoneySpentEGP === 0 && bill.totalMoneySpentGBP === 0 && '-'}
                    </TableCell>
                    <TableCell align="right">
                      {bill.totalMoneyRequestedEGP > 0 && `${bill.totalMoneyRequestedEGP.toLocaleString()} EGP`}
                      {bill.totalMoneyRequestedEGP > 0 && bill.totalMoneyRequestedGBP > 0 && ' / '}
                      {bill.totalMoneyRequestedGBP > 0 && `${bill.totalMoneyRequestedGBP.toLocaleString()} GBP`}
                      {bill.totalMoneyRequestedEGP === 0 && bill.totalMoneyRequestedGBP === 0 && '-'}
                    </TableCell>
                    <TableCell align="right">
                      {bill.netMoneyEGP > 0 && `${bill.netMoneyEGP.toLocaleString()} EGP`}
                      {bill.netMoneyEGP > 0 && bill.netMoneyGBP > 0 && ' / '}
                      {bill.netMoneyGBP > 0 && `${bill.netMoneyGBP.toLocaleString()} GBP`}
                      {bill.netMoneyEGP === 0 && bill.netMoneyGBP === 0 && '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Tooltip title="View Bill Details">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewBillDetails(bill.id);
                            }}
                          >
                            <AssignmentIcon fontSize="small" />
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