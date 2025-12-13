import { useState, useEffect, useRef } from 'react';
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
import { invoiceService, type InvoiceSummaryItem, type InvoiceTotals, type RenterSummaryResponse } from '../services/invoiceService';
import { villageService } from '../services/villageService';
import { apartmentService } from '../services/apartmentService';
import type { Village } from '../types';
import ExportButtons from '../components/ExportButtons';

interface HighlightedInvoiceSummary {
  ownerSummary: {
    total_money_spent: InvoiceTotals;
    total_money_requested: InvoiceTotals;
    net_money: InvoiceTotals;
    userName: string;
  };
  renterSummary?: {
    total_money_spent: InvoiceTotals;
    total_money_requested: InvoiceTotals;
    net_money: InvoiceTotals;
    userName: string;
  };
}

interface ApartmentInvoiceDetails {
  apartment: {
    id: number;
    name: string;
  };
  invoices: Array<{
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
    total_money_spent: InvoiceTotals;
    total_money_requested: InvoiceTotals;
    net_money: InvoiceTotals;
  };
}

export default function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  // Invoices returned from API (server filtered & paginated)
  const [invoiceDisplayData, setInvoiceDisplayData] = useState<InvoiceSummaryItem[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [previousYearTotals, setPreviousYearTotals] = useState<{
    total_money_spent: InvoiceTotals;
    total_money_requested: InvoiceTotals;
    net_money: InvoiceTotals;
  } | null>(null);
  const [currentYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState<Date | null>(new Date(currentYear, 0, 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date(currentYear, 11, 31));
  const [highlightedInvoice, setHighlightedInvoice] = useState<number | null>(null);
  const [highlightedInvoiceSummary, setHighlightedInvoiceSummary] = useState<HighlightedInvoiceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const requestIdRef = useRef(0);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

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
            setHighlightedInvoice(apartment.id);
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

  // Reset to first page when key filters change
  useEffect(() => {
    setPage(1);
  }, [villageFilter, phaseFilter, startDate, endDate, currentYear, searchTerm]);

  // Debounce search term to avoid refetch on every keystroke
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // Define handleHighlightInvoice function
  const handleHighlightInvoice = async (apartmentId: number) => {
    // Find the invoice for this apartment
    const invoice = invoiceDisplayData.find(i => i.apartment_id === apartmentId);
    if (!invoice) return;
    
    setHighlightedInvoice(apartmentId);
    
    try {
      // Fetch renter summary for this apartment
      const renterResponse = await invoiceService.getRenterSummary(apartmentId);
      
      const summary: HighlightedInvoiceSummary = {
        ownerSummary: {
          total_money_spent: invoice.total_money_spent,
          total_money_requested: invoice.total_money_requested,
          net_money: invoice.net_money,
          userName: invoice.owner_name
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

      setHighlightedInvoiceSummary(summary);
    } catch (error) {
      console.error('Error fetching renter summary:', error);
      // Still show owner summary even if renter fetch fails
      const summary: HighlightedInvoiceSummary = {
        ownerSummary: {
          total_money_spent: invoice.total_money_spent,
          total_money_requested: invoice.total_money_requested,
          net_money: invoice.net_money,
          userName: invoice.owner_name
        },
      };
      setHighlightedInvoiceSummary(summary);
    }
  };

  // Load invoice data from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      const requestId = ++requestIdRef.current;
      
      try {
        // Load villages for filter
        const villagesData = await villageService.getVillages();
        
        // Build filters for API call
        const filters: any = {};
        if (villageFilter) {
          const selectedVillage = villagesData.data.find(v => v.name === villageFilter);
          if (selectedVillage) filters.village_id = selectedVillage.id;
          if (selectedVillage && phaseFilter) {
            filters.phase = parseInt(phaseFilter, 10);
          }
        } else if (phaseFilter) {
          // If no village selected, ignore phase filter
          filters.phase = undefined;
        }
        if (startDate && endDate) {
          filters.date_from = format(startDate, 'yyyy-MM-dd');
          filters.date_to = format(endDate, 'yyyy-MM-dd');
        } else {
          filters.year = currentYear; // Default to current year
        }
        filters.page = page;
        filters.limit = PAGE_SIZE;
        if (debouncedSearchTerm) {
          filters.search = debouncedSearchTerm;
        }
        
        // Load invoice summary data
        const invoicesResponse = await invoiceService.getInvoicesSummary(filters);
        const prevTotals = await invoiceService.getPreviousYearsTotals(currentYear);
        
        if (requestId !== requestIdRef.current) return;

        setVillages(villagesData.data);
        setInvoiceDisplayData(invoicesResponse.summary);

        if (invoicesResponse.pagination) {
          const totalPagesValue = invoicesResponse.pagination.total_pages || 1;
          setTotalPages(totalPagesValue);

          const serverPage = invoicesResponse.pagination.page || 1;
          const clampedPage = Math.min(Math.max(serverPage, 1), totalPagesValue);
          if (clampedPage !== page) {
            setPage(clampedPage);
          }
        } else {
          setTotalPages(1);
        }

        setPreviousYearTotals(prevTotals);
        
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return;
        console.error('Error loading invoices data:', err);
        setError(err.message || 'Failed to load invoices data');
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };
    
    loadData();
  }, [villageFilter, phaseFilter, startDate, endDate, currentYear, page, debouncedSearchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
  };
  
  const handleVillageFilterChange = (event: SelectChangeEvent) => {
    setVillageFilter(event.target.value);
    setPhaseFilter('');
  };

  const handlePhaseFilterChange = (event: SelectChangeEvent) => {
    setPhaseFilter(event.target.value);
  };
  
  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
  };
  
  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setVillageFilter('');
    setPhaseFilter('');
    setStartDate(new Date(currentYear, 0, 1));
    setEndDate(new Date(currentYear, 11, 31));
    setPage(1);
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
  const transformInvoicesForExport = (invoicesData: any[]) => {
    return invoicesData.map(invoice => ({
      apartment: invoice.apartment_name || 'Unknown',
      village: invoice.village_name || 'Unknown',
      owner: invoice.owner_name || 'Unknown',
      total_money_spent_EGP: invoice.total_money_spent?.EGP ?? 0,
      total_money_spent_GBP: invoice.total_money_spent?.GBP ?? 0,
      total_money_requested_EGP: invoice.total_money_requested?.EGP ?? 0,
      total_money_requested_GBP: invoice.total_money_requested?.GBP ?? 0,
      net_money_EGP: invoice.net_money?.EGP ?? 0,
      net_money_GBP: invoice.net_money?.GBP ?? 0
    }));
  };

  const getPhases = (villageName: string) => {
    const village = villages.find(v => v.name === villageName);
    if (!village || !village.phases) return [];
    return Array.from({ length: village.phases }, (_, i) => i + 1);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ mt: 3 }}>
              Financial Reports
            </Typography>
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">Loading...</Typography>
            </Box>
          )}
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

          {/* Highlighted Invoice Summary */}
          {highlightedInvoiceSummary && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Selected Apartment Summary</Typography>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="subtitle1" color="primary">Owner Summary - {highlightedInvoiceSummary.ownerSummary.userName}</Typography>
                  <Typography>Total Payment: {highlightedInvoiceSummary.ownerSummary.total_money_spent.EGP} EGP / {highlightedInvoiceSummary.ownerSummary.total_money_spent.GBP} GBP</Typography>
                  <Typography>Total Outstanding: {highlightedInvoiceSummary.ownerSummary.total_money_requested.EGP} EGP / {highlightedInvoiceSummary.ownerSummary.total_money_requested.GBP} GBP</Typography>
                  <Typography>Net Balance: {highlightedInvoiceSummary.ownerSummary.net_money.EGP} EGP / {highlightedInvoiceSummary.ownerSummary.net_money.GBP} GBP</Typography>
                </Box>
                {highlightedInvoiceSummary.renterSummary && (
                  <Box>
                    <Typography variant="subtitle1" color="secondary">Renter Summary - {highlightedInvoiceSummary.renterSummary.userName}</Typography>
                    <Typography>Total Payment: {highlightedInvoiceSummary.renterSummary.total_money_spent.EGP} EGP / {highlightedInvoiceSummary.renterSummary.total_money_spent.GBP} GBP</Typography>
                    <Typography>Total Outstanding: {highlightedInvoiceSummary.renterSummary.total_money_requested.EGP} EGP / {highlightedInvoiceSummary.renterSummary.total_money_requested.GBP} GBP</Typography>
                    <Typography>Net Balance: {highlightedInvoiceSummary.renterSummary.net_money.EGP} EGP / {highlightedInvoiceSummary.renterSummary.net_money.GBP} GBP</Typography>
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
                  Showing invoices for apartment: <strong>{searchTerm}</strong>
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => {
                    setSearchParams({});
                    setSearchTerm('');
                    setHighlightedInvoice(null);
                    setHighlightedInvoiceSummary(null);
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

              {villageFilter && (
                <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Phase</InputLabel>
                    <Select
                      value={phaseFilter}
                      label="Phase"
                      onChange={handlePhaseFilterChange}
                    >
                      <MenuItem value="">All Phases</MenuItem>
                      {getPhases(villageFilter).map(phase => (
                        <MenuItem key={phase} value={phase.toString()}>
                          Phase {phase}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
              
              <Box sx={{ flex: '1 1 300px', minWidth: '260px' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <DatePicker
                    label="From"
                    value={startDate}
                    onChange={handleStartDateChange}
                    slotProps={{ textField: { size: 'small' } }}
                    format="dd/MM/yyyy"
                  />
                  <DatePicker
                    label="To"
                    value={endDate}
                    onChange={handleEndDateChange}
                    slotProps={{ textField: { size: 'small' } }}
                    format="dd/MM/yyyy"
                  />
                </Box>
              </Box>

              <Box sx={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-start' }}>
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={clearFilters}
                  size="small"
                  sx={{ height: '40px' }}
                >
                  Clear Filters
                </Button>
              </Box>
            </Box>
          </Paper>
          
          {/* Export Buttons */}
          <ExportButtons data={transformInvoicesForExport(invoiceDisplayData)} columns={["apartment","village","owner","total_money_spent_EGP","total_money_spent_GBP","total_money_requested_EGP","total_money_requested_GBP","net_money_EGP","net_money_GBP"]} excelFileName="invoices.xlsx" pdfFileName="invoices.pdf" />
          
          {/* Invoices Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Project</TableCell>
                  <TableCell>Apartment</TableCell>
                  <TableCell>Phase</TableCell>
                  <TableCell>User Name</TableCell>
                  <TableCell align="right">Total Payment (EGP/GBP)</TableCell>
                  <TableCell align="right">Total Outstanding (EGP/GBP)</TableCell>
                  <TableCell align="right">Net Balance (EGP/GBP)</TableCell>
                  <TableCell align="center">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoiceDisplayData.length > 0 ? (
                  invoiceDisplayData.map((invoice) => (
                    <TableRow 
                      key={invoice.apartment_id}
                      selected={invoice.apartment_id === highlightedInvoice}
                    >
                      <TableCell>{invoice.village_name}</TableCell>
                      <TableCell>{invoice.apartment_name}</TableCell>
                      <TableCell>{'phase' in invoice && (invoice as any).phase ? `Phase ${(invoice as any).phase}` : '-'}</TableCell>
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
                              ...(invoice.apartment_id === highlightedInvoice && {
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
                            onClick={() => handleHighlightInvoice(invoice.apartment_id)}
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
                                {invoice.owner_name}
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
                                ...(invoice.apartment_id === highlightedInvoice && {
                                  opacity: 1,
                                  color: 'primary.contrastText'
                                })
                              }} 
                            />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        {invoice.total_money_spent.EGP > 0 && `${invoice.total_money_spent.EGP.toLocaleString()} EGP`}
                        {invoice.total_money_spent.EGP > 0 && invoice.total_money_spent.GBP > 0 && ' / '}
                        {invoice.total_money_spent.GBP > 0 && `${invoice.total_money_spent.GBP.toLocaleString()} GBP`}
                        {invoice.total_money_spent.EGP === 0 && invoice.total_money_spent.GBP === 0 && '-'}
                      </TableCell>
                      <TableCell align="right">
                        {invoice.total_money_requested.EGP > 0 && `${invoice.total_money_requested.EGP.toLocaleString()} EGP`}
                        {invoice.total_money_requested.EGP > 0 && invoice.total_money_requested.GBP > 0 && ' / '}
                        {invoice.total_money_requested.GBP > 0 && `${invoice.total_money_requested.GBP.toLocaleString()} GBP`}
                        {invoice.total_money_requested.EGP === 0 && invoice.total_money_requested.GBP === 0 && '-'}
                      </TableCell>
                      <TableCell align="right">
                        {invoice.net_money.EGP > 0 && `${invoice.net_money.EGP.toLocaleString()} EGP`}
                        {invoice.net_money.EGP > 0 && invoice.net_money.GBP > 0 && ' / '}
                        {invoice.net_money.GBP > 0 && `${invoice.net_money.GBP.toLocaleString()} GBP`}
                        {invoice.net_money.EGP === 0 && invoice.net_money.GBP === 0 && '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View detailed transactions">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/invoices/${invoice.apartment_id}`)}
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
                    <TableCell colSpan={8} align="center">No invoices found matching your criteria.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_e, value) => setPage(value)}
              color="primary"
              shape="rounded"
              siblingCount={1}
              boundaryCount={1}
            />
          </Box>
        )}
        </Box>
      </Container>
    </LocalizationProvider>
  );
} 