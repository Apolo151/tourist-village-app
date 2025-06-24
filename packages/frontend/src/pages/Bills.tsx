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
  CircularProgress,
  Container,
  Card,
  CardContent,
  Grid,
  Pagination,
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
  TouchApp as TouchAppIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { billService, type BillSummaryItem, type BillTotals } from '../services/billService';
import { villageService } from '../services/villageService';
import type { Village } from '../types';
import ExportButtons from '../components/ExportButtons';

interface HighlightedBillSummary {
  ownerSummary: BillTotals & { userName: string };
  renterSummary?: BillTotals & { userName: string };
}

export default function Bills() {
  const [searchTerm, setSearchTerm] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'owner' | 'renter' | ''>('');
  const [billDisplayData, setBillDisplayData] = useState<BillSummaryItem[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [previousYearTotals, setPreviousYearTotals] = useState<BillTotals | null>(null);
  const [currentYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState<Date | null>(new Date(currentYear, 0, 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date(currentYear, 11, 31));
  const [highlightedBill, setHighlightedBill] = useState<number | null>(null);
  const [highlightedBillSummary, setHighlightedBillSummary] = useState<HighlightedBillSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Handle bill highlighting
  const handleHighlightBill = (apartmentId: number) => {
    const bill = billDisplayData.find(b => b.apartment_id === apartmentId);
    if (!bill) return;

    setHighlightedBill(apartmentId);
    
    const summary: HighlightedBillSummary = {
      ownerSummary: {
        total_money_spent: bill.total_money_spent,
        total_money_requested: bill.total_money_requested,
        net_money: bill.net_money,
        userName: bill.owner_name
      },
    };

    setHighlightedBillSummary(summary);
  };

  // Load bill data from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load villages for filter
        const villagesData = await villageService.getVillages();
        setVillages(villagesData.data);
        
        // Build filters for API call
        const filters: any = {};
        if (villageFilter) {
          const selectedVillage = villagesData.data.find(v => v.name === villageFilter);
          if (selectedVillage) filters.village_id = selectedVillage.id;
        }
        if (userTypeFilter) filters.user_type = userTypeFilter;
        if (startDate && endDate) {
          filters.date_from = format(startDate, 'yyyy-MM-dd');
          filters.date_to = format(endDate, 'yyyy-MM-dd');
        } else {
          filters.year = currentYear; // Default to current year
        }
        
        // Load bill summary data
        const billsResponse = await billService.getBillsSummary(filters);
        
        // Apply search filter on frontend
        const filteredData = billsResponse.summary.filter(bill => {
          if (!searchTerm) return true;
          return (
            bill.apartment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.village_name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        });
        
        setBillDisplayData(filteredData);
        
        // Load previous years totals
        const prevTotals = await billService.getPreviousYearsTotals(currentYear);
        setPreviousYearTotals(prevTotals);
        
      } catch (err: any) {
        console.error('Error loading bills data:', err);
        setError(err.message || 'Failed to load bills data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
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
  
  const handleViewBillDetails = (apartmentId: number) => {
    navigate(`/apartments/${apartmentId}/bills`);
  };
  
  const handleAddPayment = () => {
    navigate('/payments/new');
  };

  const handleAddServiceRequest = () => {
    navigate('/service-requests/new');
  };

  const handleAddUtilityReading = () => {
    navigate('/utility-readings/new');
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  // Data transformer for export
  const transformBillsForExport = (billsData: any[]) => {
    return billsData.map(bill => ({
      apartment: bill.apartment_name || 'Unknown',
      village: bill.village_name || 'Unknown',
      owner: bill.owner_name || 'Unknown',
      total_money_spent_EGP: bill.total_money_spent?.EGP ?? 0,
      total_money_spent_GBP: bill.total_money_spent?.GBP ?? 0,
      total_money_requested_EGP: bill.total_money_requested?.EGP ?? 0,
      total_money_requested_GBP: bill.total_money_requested?.GBP ?? 0,
      net_money_EGP: bill.net_money?.EGP ?? 0,
      net_money_GBP: bill.net_money?.GBP ?? 0
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Bills</Typography>
          <Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddPayment}
              sx={{ mr: 1 }}
            >
              Add Payment
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddServiceRequest}
              sx={{ mr: 1 }}
            >
              Add Service Request
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddUtilityReading}
            >
              Add Utility Reading
            </Button>
          </Box>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Previous Year Summary */}
        {previousYearTotals && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1">
            Running Total for Previous Years: 
              <strong> {previousYearTotals.total_money_spent.EGP.toFixed(2)} EGP</strong> and 
              <strong> {previousYearTotals.total_money_spent.GBP.toFixed(2)} GBP</strong>
          </Typography>
        </Alert>
        )}

        {/* Highlighted Bill Summary */}
        {highlightedBillSummary && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Selected Apartment Summary</Typography>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box>
                <Typography variant="subtitle1" color="primary">Owner Summary - {highlightedBillSummary.ownerSummary.userName}</Typography>
                <Typography>Total Money Spent: {highlightedBillSummary.ownerSummary.total_money_spent.EGP} EGP / {highlightedBillSummary.ownerSummary.total_money_spent.GBP} GBP</Typography>
                <Typography>Total Money Requested: {highlightedBillSummary.ownerSummary.total_money_requested.EGP} EGP / {highlightedBillSummary.ownerSummary.total_money_requested.GBP} GBP</Typography>
                <Typography>Net Money: {highlightedBillSummary.ownerSummary.net_money.EGP} EGP / {highlightedBillSummary.ownerSummary.net_money.GBP} GBP</Typography>
              </Box>
              {highlightedBillSummary.renterSummary && (
                <Box>
                  <Typography variant="subtitle1" color="secondary">Renter Summary - {highlightedBillSummary.renterSummary.userName}</Typography>
                  <Typography>Total Money Spent: {highlightedBillSummary.renterSummary.total_money_spent.EGP} EGP / {highlightedBillSummary.renterSummary.total_money_spent.GBP} GBP</Typography>
                  <Typography>Total Money Requested: {highlightedBillSummary.renterSummary.total_money_requested.EGP} EGP / {highlightedBillSummary.renterSummary.total_money_requested.GBP} GBP</Typography>
                  <Typography>Net Money: {highlightedBillSummary.renterSummary.net_money.EGP} EGP / {highlightedBillSummary.renterSummary.net_money.GBP} GBP</Typography>
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
                  {villages.map(village => (
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
        
        {/* Export Buttons */}
        <ExportButtons data={transformBillsForExport(billDisplayData)} columns={["apartment","village","owner","total_money_spent_EGP","total_money_spent_GBP","total_money_requested_EGP","total_money_requested_GBP","net_money_EGP","net_money_GBP"]} excelFileName="bills.xlsx" pdfFileName="bills.pdf" />
        
        {/* Bills Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Village</TableCell>
                <TableCell>Apartment</TableCell>
                <TableCell>User Name</TableCell>
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
                    key={bill.apartment_id}
                    selected={bill.apartment_id === highlightedBill}
                  >
                    <TableCell>{bill.village_name}</TableCell>
                    <TableCell>{bill.apartment_name}</TableCell>
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
                            ...(bill.apartment_id === highlightedBill && {
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
                          onClick={() => handleHighlightBill(bill.apartment_id)}
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
                              {bill.owner_name}
                            </Typography>
                            <Chip 
                              label="Owner" 
                              color="primary"
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
                              ...(bill.apartment_id === highlightedBill && {
                                opacity: 1,
                                color: 'primary.contrastText'
                              })
                            }} 
                          />
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      {bill.total_money_spent.EGP > 0 && `${bill.total_money_spent.EGP.toLocaleString()} EGP`}
                      {bill.total_money_spent.EGP > 0 && bill.total_money_spent.GBP > 0 && ' / '}
                      {bill.total_money_spent.GBP > 0 && `${bill.total_money_spent.GBP.toLocaleString()} GBP`}
                      {bill.total_money_spent.EGP === 0 && bill.total_money_spent.GBP === 0 && '-'}
                    </TableCell>
                    <TableCell align="right">
                      {bill.total_money_requested.EGP > 0 && `${bill.total_money_requested.EGP.toLocaleString()} EGP`}
                      {bill.total_money_requested.EGP > 0 && bill.total_money_requested.GBP > 0 && ' / '}
                      {bill.total_money_requested.GBP > 0 && `${bill.total_money_requested.GBP.toLocaleString()} GBP`}
                      {bill.total_money_requested.EGP === 0 && bill.total_money_requested.GBP === 0 && '-'}
                    </TableCell>
                    <TableCell align="right">
                      {bill.net_money.EGP > 0 && `${bill.net_money.EGP.toLocaleString()} EGP`}
                      {bill.net_money.EGP > 0 && bill.net_money.GBP > 0 && ' / '}
                      {bill.net_money.GBP > 0 && `${bill.net_money.GBP.toLocaleString()} GBP`}
                      {bill.net_money.EGP === 0 && bill.net_money.GBP === 0 && '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Tooltip title="View Bill Details">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewBillDetails(bill.apartment_id);
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
                  <TableCell colSpan={7} align="center">No bills found matching your criteria.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </LocalizationProvider>
  );
} 