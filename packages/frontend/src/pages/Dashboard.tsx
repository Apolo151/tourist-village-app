import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Container,
  Chip,
  Grid,
  Divider
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Bar, Pie } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement
} from 'chart.js';
import { 
  Home as HomeIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { invoiceService, type InvoiceSummaryItem, type InvoiceTotals } from '../services/invoiceService';
import { villageService } from '../services/villageService';
import type { Village } from '../types';
import ExportButtons from '../components/ExportButtons';
import { useAuth } from '../context/AuthContext';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface DashboardInvoiceData {
  id: number;
  village: string;
  apartment: string;
  owner: string;
  totalSpentEGP: number;
  totalSpentGBP: number;
  totalRequestedEGP: number;
  totalRequestedGBP: number;
  netEGP: number;
  netGBP: number;
  lastActivity: string;
}

interface InvoiceTypeStats {
  payments: { count: number; totalEGP: number; totalGBP: number };
  serviceRequests: { count: number; totalEGP: number; totalGBP: number };
  utilityReadings: { count: number; totalEGP: number; totalGBP: number };
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [village, setVillage] = useState<string>('');
  const [invoiceData, setInvoiceData] = useState<DashboardInvoiceData[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [invoiceTypeStats, setInvoiceTypeStats] = useState<InvoiceTypeStats>({
    payments: { count: 0, totalEGP: 0, totalGBP: 0 },
    serviceRequests: { count: 0, totalEGP: 0, totalGBP: 0 },
    utilityReadings: { count: 0, totalEGP: 0, totalGBP: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [userBookingsLoading, setUserBookingsLoading] = useState(false);
  const [userBookingsError, setUserBookingsError] = useState('');

  const currentYear = new Date().getFullYear();

  // Load user bookings
  useEffect(() => {
    const loadUserBookings = async () => {
      if (!currentUser) return;
      
      setUserBookingsLoading(true);
      setUserBookingsError('');
      
      try {
        const response = await bookingService.getBookings({ 
          limit: 50 
        });
        setRecentBookings(response.bookings);
      } catch (err) {
        setUserBookingsError(err instanceof Error ? err.message : 'Failed to load bookings');
      } finally {
        setUserBookingsLoading(false);
      }
    };

    loadUserBookings();
  }, [currentUser]);

  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Load villages first
        const villagesResult = await villageService.getVillages();
        setVillages(villagesResult.data);
        
        // Load villages and invoices data in parallel
        const [invoicesResult] = await Promise.all([
          invoiceService.getInvoicesSummary({ 
            year: currentYear,
            ...(village && { village_id: villagesResult.data.find(v => v.name === village)?.id })
          })
        ]);
        
        // Transform invoices data for dashboard
        const transformedData: DashboardInvoiceData[] = invoicesResult.summary.map((invoice: InvoiceSummaryItem) => ({
          id: invoice.apartment_id,
          village: invoice.village_name,
          apartment: invoice.apartment_name,
          owner: invoice.owner_name,
          totalSpentEGP: invoice.total_money_spent?.EGP || 0,
          totalSpentGBP: invoice.total_money_spent?.GBP || 0,
          totalRequestedEGP: invoice.total_money_requested?.EGP || 0,
          totalRequestedGBP: invoice.total_money_requested?.GBP || 0,
          netEGP: invoice.net_money?.EGP || 0,
          netGBP: invoice.net_money?.GBP || 0,
          lastActivity: new Date().toISOString() // Would be from API in real scenario
        }));
        
        setInvoiceData(transformedData);
        
        // Calculate invoice type statistics
        const stats: InvoiceTypeStats = {
          payments: { count: 0, totalEGP: 0, totalGBP: 0 },
          serviceRequests: { count: 0, totalEGP: 0, totalGBP: 0 },
          utilityReadings: { count: 0, totalEGP: 0, totalGBP: 0 }
        };
        
        transformedData.forEach(item => {
          stats.payments.totalEGP += item.totalSpentEGP;
          stats.payments.totalGBP += item.totalSpentGBP;
          stats.serviceRequests.totalEGP += item.totalRequestedEGP;
          stats.serviceRequests.totalGBP += item.totalRequestedGBP;
        });
        
        setInvoiceTypeStats(stats);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [village, currentYear]);

  const handleVillageChange = (event: SelectChangeEvent) => {
    setVillage(event.target.value);
  };

  // Apply filters
  const filteredData = invoiceData.filter(item => {
    if (village && item.village !== village) return false;
    return true;
  });

  // Data transformer for export
  const transformDataForExport = (data: DashboardInvoiceData[]) => {
    return data.map(item => ({
      apartment: item.apartment,
      village: item.village,
      owner: item.owner,
      total_spent_EGP: item.totalSpentEGP,
      total_spent_GBP: item.totalSpentGBP,
      total_requested_EGP: item.totalRequestedEGP,
      total_requested_GBP: item.totalRequestedGBP,
      net_EGP: item.netEGP,
      net_GBP: item.netGBP
    }));
  };

  if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'renter')) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ mt: 3, mb: 3 }}>
            My Bookings
          </Typography>
          {userBookingsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
              <CircularProgress />
            </Box>
          ) : userBookingsError ? (
            <Alert severity="error" sx={{ mb: 3 }}>{userBookingsError}</Alert>
          ) : (
            <Paper elevation={2}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Apartment</TableCell>
                      <TableCell>Arrival Date</TableCell>
                      <TableCell>Leaving Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>People</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">No past bookings found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>{booking.apartment?.name || 'Unknown'}</TableCell>
                          <TableCell>{booking.arrival_date ? new Date(booking.arrival_date).toLocaleString() : ''}</TableCell>
                          <TableCell>{booking.leaving_date ? new Date(booking.leaving_date).toLocaleString() : ''}</TableCell>
                          <TableCell>
                            <Chip 
                              label={booking.status} 
                              color={
                                booking.status === 'Booked' ? 'default' : 
                                booking.status === 'Checked In' ? 'primary' : 'success'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{booking.number_of_people}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mt: 3, mb: 3 }}>
          Financial Analytics Dashboard
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Summary Cards */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', boxShadow: 3, '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' }, transition: 'all 0.3s ease' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <HomeIcon sx={{ color: 'primary.main', mr: 1, fontSize: 28 }} />
                    <Typography color="text.secondary" variant="h6">
                  Total Apartments
                </Typography>
                  </Box>
                  <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>
                    {filteredData.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active properties
                </Typography>
              </CardContent>
            </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', boxShadow: 3, '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' }, transition: 'all 0.3s ease' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUpIcon sx={{ color: 'success.main', mr: 1, fontSize: 28 }} />
                    <Typography color="text.secondary" variant="h6">
                  Total Income
                </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'baseline', mb: 1 }}>
                    <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                      {invoiceTypeStats.payments.totalEGP.toLocaleString()} <span style={{fontSize: '1.1rem', fontWeight: 400}}>EGP</span>
                    </Typography>
                    <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                      {invoiceTypeStats.payments.totalGBP.toLocaleString()} <span style={{fontSize: '1.1rem', fontWeight: 400}}>GBP</span>
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total payments received
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', boxShadow: 3, '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' }, transition: 'all 0.3s ease' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingDownIcon sx={{ color: 'error.main', mr: 1, fontSize: 28 }} />
                    <Typography color="text.secondary" variant="h6">
                      Total Expenses
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'baseline', mb: 1 }}>
                    <Typography variant="h4" color="error.main" sx={{ fontWeight: 'bold' }}>
                      {invoiceTypeStats.serviceRequests.totalEGP.toLocaleString()} <span style={{fontSize: '1.1rem', fontWeight: 400}}>EGP</span>
                    </Typography>
                    <Typography variant="h4" color="error.main" sx={{ fontWeight: 'bold' }}>
                      {invoiceTypeStats.serviceRequests.totalGBP.toLocaleString()} <span style={{fontSize: '1.1rem', fontWeight: 400}}>GBP</span>
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total requested from owners/renters
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', boxShadow: 3, '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' }, transition: 'all 0.3s ease' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccountBalanceIcon sx={{ color: invoiceTypeStats.payments.totalEGP - invoiceTypeStats.serviceRequests.totalEGP >= 0 ? 'success.main' : 'error.main', mr: 1, fontSize: 28 }} />
                    <Typography color="text.secondary" variant="h6">
                      Net Balance
                    </Typography>
          </Box>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'baseline', mb: 1 }}>
                    <Typography variant="h4" color={invoiceTypeStats.payments.totalEGP - invoiceTypeStats.serviceRequests.totalEGP >= 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 'bold' }}>
                      {(invoiceTypeStats.payments.totalEGP - invoiceTypeStats.serviceRequests.totalEGP).toLocaleString()} <span style={{fontSize: '1.1rem', fontWeight: 400}}>EGP</span>
                    </Typography>
                    <Typography variant="h4" color={invoiceTypeStats.payments.totalGBP - invoiceTypeStats.serviceRequests.totalGBP >= 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 'bold' }}>
                      {(invoiceTypeStats.payments.totalGBP - invoiceTypeStats.serviceRequests.totalGBP).toLocaleString()} <span style={{fontSize: '1.1rem', fontWeight: 400}}>GBP</span>
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Net = Income - Expenses
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Financial Report */}
          <Paper sx={{ p: 4, boxShadow: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                Comprehensive Financial Report
              </Typography>
              
              {/* Export Buttons */}
              <ExportButtons 
                data={transformDataForExport(filteredData)} 
                columns={["apartment","village","owner","total_spent_EGP","total_spent_GBP","total_requested_EGP","total_requested_GBP","net_EGP","net_GBP"]} 
                excelFileName="financial-dashboard.xlsx" 
                pdfFileName="financial-dashboard.pdf" 
              />
            </Box>
            
            {/* Filter Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
              <FilterListIcon sx={{ mr: 2, color: 'primary.main' }} />
              <FormControl sx={{ minWidth: 250 }}>
                <InputLabel>Project Filter</InputLabel>
                <Select
                  value={village}
                  label="Project Filter"
                  onChange={handleVillageChange}
                >
                  <MenuItem value="">
                    <em>All Projects</em>
                  </MenuItem>
                  {villages.map(villageItem => (
                    <MenuItem key={villageItem.id} value={villageItem.name}>{villageItem.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            {/* Data Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Project</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Apartment</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Owner</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Income (EGP/GBP)</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Expenses (EGP/GBP)</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Net Balance (EGP/GBP)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.length > 0 ? filteredData.map((row) => (
                    <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                      <TableCell>{row.village}</TableCell>
                      <TableCell>{row.apartment}</TableCell>
                      <TableCell>{row.owner}</TableCell>
                      <TableCell align="right">
                        {row.totalSpentEGP > 0 && `${row.totalSpentEGP.toLocaleString()} EGP`}
                        {row.totalSpentEGP > 0 && row.totalSpentGBP > 0 && ' / '}
                        {row.totalSpentGBP > 0 && `${row.totalSpentGBP.toLocaleString()} GBP`}
                        {row.totalSpentEGP === 0 && row.totalSpentGBP === 0 && '-'}
                      </TableCell>
                      <TableCell align="right">
                        {row.totalRequestedEGP > 0 && `${row.totalRequestedEGP.toLocaleString()} EGP`}
                        {row.totalRequestedEGP > 0 && row.totalRequestedGBP > 0 && ' / '}
                        {row.totalRequestedGBP > 0 && `${row.totalRequestedGBP.toLocaleString()} GBP`}
                        {row.totalRequestedEGP === 0 && row.totalRequestedGBP === 0 && '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography color={row.netEGP >= 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 'bold' }}>
                          {row.netEGP !== 0 && `${row.netEGP.toLocaleString()} EGP`}
                          {row.netEGP !== 0 && row.netGBP !== 0 && ' / '}
                          {row.netGBP !== 0 && `${row.netGBP.toLocaleString()} GBP`}
                          {row.netEGP === 0 && row.netGBP === 0 && '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">No financial data available</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
} 