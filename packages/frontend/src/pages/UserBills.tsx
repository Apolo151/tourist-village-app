import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Breadcrumbs,
  Link,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Home as HomeIcon, 
  NavigateNext as NavigateNextIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  FileDownload as FileDownloadIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { mockApartments, mockBookings, mockUsers, mockBills } from '../mockData';
import { format } from 'date-fns';
import type { User } from '../types';

// Interface for bill items
interface BillItem {
  id: string;
  billNumber: string;
  description: string;
  type: 'Payment' | 'Service' | 'Utility' | 'Other';
  amount: number;
  currency: string;
  date: string;
  dueDate: string;
  isPaid: boolean;
  apartmentId: string;
  apartmentName: string;
  bookingId?: string;
  bookingArrivalDate?: string;
}

export default function UserBills() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [filteredBillItems, setFilteredBillItems] = useState<BillItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Payment' | 'Service' | 'Utility' | 'Other' | ''>('');
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [totalEGP, setTotalEGP] = useState(0);
  const [totalGBP, setTotalGBP] = useState(0);
  
  // Fetch user and bills data
  useEffect(() => {
    if (!userId) return;
    
    const userData = mockUsers.find(u => u.id === userId);
    
    if (userData) {
      setUser(userData);
      
      // Fetch bills for this user
      const bills = mockBills
        .filter(bill => bill.userId === userId)
        .map(bill => {
          const apartment = mockApartments.find(apt => apt.id === bill.apartmentId) || { name: 'Unknown' };
          const booking = bill.bookingId ? mockBookings.find(b => b.id === bill.bookingId) : undefined;
          
          // Determine bill type
          let type: 'Payment' | 'Service' | 'Utility' | 'Other' = 'Other';
          if (bill.serviceRequestId) type = 'Service';
          else if (bill.bookingId) type = 'Payment';
          else if (bill.utilityId) type = 'Utility';
          
          return {
            id: bill.id,
            billNumber: bill.billNumber,
            description: bill.description,
            type,
            amount: type === 'Payment' ? bill.totalAmountEGP : (bill.totalAmountEGP || bill.totalAmountGBP),
            currency: bill.totalAmountEGP > 0 ? 'EGP' : 'GBP',
            date: bill.billDate,
            dueDate: bill.dueDate,
            isPaid: bill.isPaid,
            apartmentId: bill.apartmentId,
            apartmentName: apartment.name,
            bookingId: bill.bookingId,
            bookingArrivalDate: booking?.arrivalDate
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setBillItems(bills);
      
      // Calculate totals
      let egpTotal = 0;
      let gbpTotal = 0;
      
      bills.forEach(bill => {
        if (bill.currency === 'EGP') {
          egpTotal += bill.amount;
        } else if (bill.currency === 'GBP') {
          gbpTotal += bill.amount;
        }
      });
      
      setTotalEGP(egpTotal);
      setTotalGBP(gbpTotal);
    }
  }, [userId]);
  
  // Apply filters whenever filter state changes
  useEffect(() => {
    if (billItems.length === 0) return;
    
    const filtered = billItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.billNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = !typeFilter || item.type === typeFilter;
      const matchesApartment = !apartmentFilter || 
        item.apartmentName.toLowerCase().includes(apartmentFilter.toLowerCase());
      
      return matchesSearch && matchesType && matchesApartment;
    });
    
    setFilteredBillItems(filtered);
  }, [billItems, searchTerm, typeFilter, apartmentFilter]);
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleTypeFilterChange = (event: SelectChangeEvent) => {
    setTypeFilter(event.target.value as 'Payment' | 'Service' | 'Utility' | 'Other' | '');
  };
  
  const handleApartmentFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApartmentFilter(event.target.value);
  };
  
  const handleExportData = () => {
    // In a real app, this would generate and download a file
    console.log('Exporting data...');
  };
  
  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>User not found.</Typography>
        <Button onClick={() => navigate('/bills')} sx={{ mt: 2 }}>
          Back to Bills
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb"
        sx={{ mb: 3 }}
      >
        <Link 
          underline="hover" 
          color="inherit" 
          onClick={() => navigate('/bills')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Bills
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ mr: 0.5 }} fontSize="small" />
          User: {user.name}
        </Typography>
      </Breadcrumbs>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Bills for {user.name}</Typography>
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportData}
        >
          Export Data
        </Button>
      </Box>
      
      {/* Summary */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Summary</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">User Type</Typography>
            <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{user.role}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Email</Typography>
            <Typography variant="body1">{user.email}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Total (EGP)</Typography>
            <Typography variant="body1" fontWeight="bold">{totalEGP.toLocaleString()} EGP</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Total (GBP)</Typography>
            <Typography variant="body1" fontWeight="bold">{totalGBP.toLocaleString()} GBP</Typography>
          </Box>
        </Box>
      </Paper>
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          <FilterListIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Filters
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: '1 1 300px', minWidth: '200px' }}>
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
              <InputLabel>Bill Type</InputLabel>
              <Select
                value={typeFilter}
                label="Bill Type"
                onChange={handleTypeFilterChange}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="Payment">Payment</MenuItem>
                <MenuItem value="Service">Service</MenuItem>
                <MenuItem value="Utility">Utility</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ flex: '1 1 250px', minWidth: '200px' }}>
            <TextField
              label="Filter by Apartment"
              variant="outlined"
              size="small"
              fullWidth
              value={apartmentFilter}
              onChange={handleApartmentFilterChange}
            />
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
              <TableCell>Due Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Apartment</TableCell>
              <TableCell>Booking Date</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBillItems.length > 0 ? (
              filteredBillItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.billNumber}</TableCell>
                  <TableCell>{format(new Date(item.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{format(new Date(item.dueDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Chip 
                      label={item.type} 
                      color={
                        item.type === 'Payment' ? 'default' : 
                        item.type === 'Service' ? 'primary' : 
                        item.type === 'Utility' ? 'info' : 
                        'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.apartmentName}</TableCell>
                  <TableCell>
                    {item.bookingArrivalDate ? format(new Date(item.bookingArrivalDate), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {item.amount.toLocaleString()} {item.currency}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={item.isPaid ? 'Paid' : 'Unpaid'} 
                      color={item.isPaid ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">No bills found for this user.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 