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
  Tooltip,
  CircularProgress,
  Container,
  Card,
  CardContent,
  Grid,
  Pagination,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  FilterList as FilterListIcon,
  FileDownload as FileDownloadIcon,
  TouchApp as TouchAppIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { billService, type BillSummaryItem, type BillTotals, type RenterSummaryResponse } from '../services/billService';
import { villageService } from '../services/villageService';
import { apartmentService } from '../services/apartmentService';
import type { Village } from '../types';
import ExportButtons from '../components/ExportButtons';

interface HighlightedBillSummary {
  ownerSummary: {
    total_money_spent: BillTotals;
    total_money_requested: BillTotals;
    net_money: BillTotals;
    userName: string;
  };
  renterSummary?: {
    total_money_spent: BillTotals;
    total_money_requested: BillTotals;
    net_money: BillTotals;
    userName: string;
  };
}

interface ApartmentBillDetails {
  apartment: {
    id: number;
    name: string;
  };
  bills: Array<{
    id: string;
    type: 'Payment' | 'Service Request' | 'Utility Reading';
    description: string;
    amount: number;
    currency: 'EGP' | 'GBP';
    date: string;
    booking_id?: number;
    booking_arrival_date?: string;
    person_name?: string;
    created_at: string;
  }>;
  totals: {
    total_money_spent: BillTotals;
    total_money_requested: BillTotals;
    net_money: BillTotals;
  };
}

export default function Bills() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [billDisplayData, setBillDisplayData] = useState<BillSummaryItem[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [previousYearTotals, setPreviousYearTotals] = useState<{
    total_money_spent: BillTotals;
    total_money_requested: BillTotals;
    net_money: BillTotals;
  } | null>(null);
  const [currentYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState<Date | null>(new Date(currentYear, 0, 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date(currentYear, 11, 31));
  const [highlightedBill, setHighlightedBill] = useState<number | null>(null);
  const [highlightedBillSummary, setHighlightedBillSummary] = useState<HighlightedBillSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // New state for detailed bill information
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailedBillData, setDetailedBillData] = useState<ApartmentBillDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Handle URL parameters on component mount
  useEffect(() => {
    const handleUrlParams = async () => {
      const apartmentId = searchParams.get('apartmentId');
      if (apartmentId) {
        try {
          // Fetch apartment details to get the name for filtering
          const apartment = await apartmentService.getApartmentById(parseInt(apartmentId));
          if (apartment) {
            setSearchTerm(apartment.name);
            // Also highlight this apartment if it's in the results
            setHighlightedBill(apartment.id);
          }
        } catch (error) {
          console.error('Error fetching apartment for URL filter:', error);
          // If we can't fetch the apartment, just set the search term to the ID
          setSearchTerm(`ID: ${apartmentId}`);
        }
      }
    };

    handleUrlParams();
  }, [searchParams]);

  // Handle bill highlighting
  const handleHighlightBill = async (apartmentId: number) => {
    const bill = billDisplayData.find(b => b.apartment_id === apartmentId);
    if (!bill) return;

    setHighlightedBill(apartmentId);
    
    try {
      // Fetch renter summary for this apartment
      const renterResponse = await billService.getRenterSummary(apartmentId);
      
      const summary: HighlightedBillSummary = {
        ownerSummary: {
          total_money_spent: bill.total_money_spent,
          total_money_requested: bill.total_money_requested,
          net_money: bill.net_money,
          userName: bill.owner_name
        },
      };

      // Add renter summary if available
      if (renterResponse.renterSummary) {
        summary.renterSummary = {
          total_money_spent: renterResponse.renterSummary.total_money_spent,
          total_money_requested: renterResponse.renterSummary.total_money_requested,
          net_money: renterResponse.renterSummary.net_money,
          userName: renterResponse.renterSummary.userName
        };
      }

      setHighlightedBillSummary(summary);
    } catch (error) {
      console.error('Error fetching renter summary:', error);
      // Still show owner summary even if renter fetch fails
      const summary: HighlightedBillSummary = {
        ownerSummary: {
          total_money_spent: bill.total_money_spent,
          total_money_requested: bill.total_money_requested,
          net_money: bill.net_money,
          userName: bill.owner_name
        },
      };
      setHighlightedBillSummary(summary);
    }
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
  }, [searchTerm, villageFilter, startDate, endDate, currentYear]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleVillageFilterChange = (event: SelectChangeEvent) => {
    setVillageFilter(event.target.value);
  };
  
  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
  };
  
  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
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
  
  const handleViewDetails = async (apartmentId: number) => {
    setDetailsLoading(true);
    try {
      // Build filters for the apartment details call
      const filters: any = {};
      if (startDate && endDate) {
        filters.date_from = format(startDate, 'yyyy-MM-dd');
        filters.date_to = format(endDate, 'yyyy-MM-dd');
      } else {
        filters.year = currentYear; // Default to current year
      }
      
      const response = await billService.getApartmentDetails(apartmentId, filters);
      
      if (!response || !response.apartment) {
        throw new Error('Invalid response structure from API');
      }
      
      // Transform the response data to match the expected ApartmentBillDetails type
      const transformedData: ApartmentBillDetails = {
        apartment: response.apartment,
        bills: response.bills.map((bill: any) => ({
          ...bill,
          id: String(bill.id),
          type:
            bill.type === 'payment'
              ? 'Payment'
              : bill.type === 'service_request'
              ? 'Service Request'
              : bill.type === 'utility_reading'
              ? 'Utility Reading'
              : bill.type,
        })),
        totals: response.totals
      };
      setDetailedBillData(transformedData);
      setDetailsDialogOpen(true);
    } catch (error: any) {
      console.error('Error fetching apartment details:', error);
      setError('Failed to load apartment details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setDetailedBillData(null);
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
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ mt: 3 }}>
              Financial Reports
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
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
                  <Typography>Total Payment: {highlightedBillSummary.ownerSummary.total_money_spent.EGP} EGP / {highlightedBillSummary.ownerSummary.total_money_spent.GBP} GBP</Typography>
                  <Typography>Total Outstanding: {highlightedBillSummary.ownerSummary.total_money_requested.EGP} EGP / {highlightedBillSummary.ownerSummary.total_money_requested.GBP} GBP</Typography>
                  <Typography>Net Balance: {highlightedBillSummary.ownerSummary.net_money.EGP} EGP / {highlightedBillSummary.ownerSummary.net_money.GBP} GBP</Typography>
                </Box>
                {highlightedBillSummary.renterSummary && (
                  <Box>
                    <Typography variant="subtitle1" color="secondary">Renter Summary - {highlightedBillSummary.renterSummary.userName}</Typography>
                    <Typography>Total Payment: {highlightedBillSummary.renterSummary.total_money_spent.EGP} EGP / {highlightedBillSummary.renterSummary.total_money_spent.GBP} GBP</Typography>
                    <Typography>Total Outstanding: {highlightedBillSummary.renterSummary.total_money_requested.EGP} EGP / {highlightedBillSummary.renterSummary.total_money_requested.GBP} GBP</Typography>
                    <Typography>Net Balance: {highlightedBillSummary.renterSummary.net_money.EGP} EGP / {highlightedBillSummary.renterSummary.net_money.GBP} GBP</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          )}
          
          {/* Apartment Filter Indicator */}
          {searchParams.get('apartmentId') && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography>
                  Showing bills for apartment: <strong>{searchTerm}</strong>
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => {
                    setSearchParams({});
                    setSearchTerm('');
                    setHighlightedBill(null);
                    setHighlightedBillSummary(null);
                  }}
                >
                  Clear Filter
                </Button>
              </Box>
            </Alert>
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
                  <InputLabel>Project</InputLabel>
                  <Select
                    value={villageFilter}
                    label="Project"
                    onChange={handleVillageFilterChange}
                  >
                    <MenuItem value="">All Projects</MenuItem>
                    {villages.map(village => (
                      <MenuItem key={village.id} value={village.name}>{village.name}</MenuItem>
                    ))}
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
                  <TableCell>Project</TableCell>
                  <TableCell>Apartment</TableCell>
                  <TableCell>User Name</TableCell>
                  <TableCell align="right">Total Payment (EGP/GBP)</TableCell>
                  <TableCell align="right">Total Outstanding (EGP/GBP)</TableCell>
                  <TableCell align="right">Net Balance (EGP/GBP)</TableCell>
                  <TableCell align="center">Details</TableCell>
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
                      <TableCell align="center">
                        <Tooltip title="View detailed transactions">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(bill.apartment_id)}
                            disabled={detailsLoading}
                            color="primary"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
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

          {/* Details Dialog */}
          <Dialog 
            open={detailsDialogOpen} 
            onClose={handleCloseDetails}
            maxWidth="lg"
            fullWidth
          >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                {detailedBillData ? `Bill Details - ${detailedBillData.apartment.name}` : 'Bill Details'}
              </Typography>
              <IconButton onClick={handleCloseDetails} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            
            <DialogContent dividers>
              {detailsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : detailedBillData ? (
                <Box>
                  {/* Totals Summary */}
                  <Paper sx={{ p: 2, mb: 3, backgroundColor: 'background.default' }}>
                    <Typography variant="h6" gutterBottom>Financial Summary</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" color="success.main">Money Spent</Typography>
                        <Typography>
                          {detailedBillData.totals.total_money_spent.EGP > 0 && `${detailedBillData.totals.total_money_spent.EGP.toLocaleString()} EGP`}
                          {detailedBillData.totals.total_money_spent.EGP > 0 && detailedBillData.totals.total_money_spent.GBP > 0 && ' / '}
                          {detailedBillData.totals.total_money_spent.GBP > 0 && `${detailedBillData.totals.total_money_spent.GBP.toLocaleString()} GBP`}
                          {detailedBillData.totals.total_money_spent.EGP === 0 && detailedBillData.totals.total_money_spent.GBP === 0 && '-'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="error.main">Total Outstanding</Typography>
                        <Typography>
                          {detailedBillData.totals.total_money_requested.EGP > 0 && `${detailedBillData.totals.total_money_requested.EGP.toLocaleString()} EGP`}
                          {detailedBillData.totals.total_money_requested.EGP > 0 && detailedBillData.totals.total_money_requested.GBP > 0 && ' / '}
                          {detailedBillData.totals.total_money_requested.GBP > 0 && `${detailedBillData.totals.total_money_requested.GBP.toLocaleString()} GBP`}
                          {detailedBillData.totals.total_money_requested.EGP === 0 && detailedBillData.totals.total_money_requested.GBP === 0 && '-'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color={detailedBillData.totals.net_money.EGP >= 0 ? 'success.main' : 'error.main'}>Net Balance</Typography>
                        <Typography>
                          {detailedBillData.totals.net_money.EGP !== 0 && `${detailedBillData.totals.net_money.EGP.toLocaleString()} EGP`}
                          {detailedBillData.totals.net_money.EGP !== 0 && detailedBillData.totals.net_money.GBP !== 0 && ' / '}
                          {detailedBillData.totals.net_money.GBP !== 0 && `${detailedBillData.totals.net_money.GBP.toLocaleString()} GBP`}
                          {detailedBillData.totals.net_money.EGP === 0 && detailedBillData.totals.net_money.GBP === 0 && '-'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>

                  {/* Detailed Transactions */}
                  <Typography variant="h6" gutterBottom>Transaction Details</Typography>
                  {detailedBillData.bills.length > 0 ? (
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell>Person</TableCell>
                            <TableCell>Booking</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {detailedBillData.bills.map((bill) => (
                            <TableRow key={bill.id}>
                              <TableCell>
                                <Chip 
                                  label={bill.type}
                                  color={
                                    bill.type === 'Payment' ? 'success' :
                                    bill.type === 'Service Request' ? 'warning' : 'info'
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{bill.description}</TableCell>
                              <TableCell>{formatDate(bill.date)}</TableCell>
                              <TableCell align="right">
                                <Typography 
                                  color={bill.type === 'Payment' ? 'success.main' : 'error.main'}
                                  fontWeight="medium"
                                >
                                  {bill.type === 'Payment' ? '+' : '-'}{bill.amount.toLocaleString()} {bill.currency}
                                </Typography>
                              </TableCell>
                              <TableCell>{bill.person_name || '-'}</TableCell>
                              <TableCell>
                                {bill.booking_id ? `Booking #${bill.booking_id}` : '-'}
                                {bill.booking_arrival_date && (
                                  <Typography variant="caption" display="block">
                                    {formatDate(bill.booking_arrival_date)}
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                      <Typography color="text.secondary">No transactions found for this apartment.</Typography>
                    </Paper>
                  )}
                </Box>
              ) : (
                <Typography>Failed to load details</Typography>
              )}
            </DialogContent>
            
            <DialogActions>
              <Button onClick={handleCloseDetails}>Close</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </LocalizationProvider>
  );
}