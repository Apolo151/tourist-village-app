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
import { billService, type BillSummaryItem, type BillTotals } from '../services/billService';
import { villageService } from '../services/villageService';
import type { Village } from '../types';
import ExportButtons from '../components/ExportButtons';
import { useAuth } from '../context/AuthContext';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface DashboardBillData {
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

interface BillTypeStats {
  payments: { count: number; totalEGP: number; totalGBP: number };
  serviceRequests: { count: number; totalEGP: number; totalGBP: number };
  utilityReadings: { count: number; totalEGP: number; totalGBP: number };
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [village, setVillage] = useState<string>('');
  const [billData, setBillData] = useState<DashboardBillData[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [billTypeStats, setBillTypeStats] = useState<BillTypeStats>({
    payments: { count: 0, totalEGP: 0, totalGBP: 0 },
    serviceRequests: { count: 0, totalEGP: 0, totalGBP: 0 },
    utilityReadings: { count: 0, totalEGP: 0, totalGBP: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [userBookingsLoading, setUserBookingsLoading] = useState(false);
  const [userBookingsError, setUserBookingsError] = useState('');
  const [currentYear] = useState(new Date().getFullYear());
  
  useEffect(() => {
    if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'renter')) {
      fetchUserBookings();
    } else {
      loadDashboardData();
    }
  }, [currentUser, village]);

  const fetchUserBookings = async () => {
    setUserBookingsLoading(true);
    setUserBookingsError('');
    try {
      if (!currentUser) throw new Error('No user');
      const response = await bookingService.getBookings({ 
        user_id: currentUser.id, 
        sort_by: 'leaving_date', 
        sort_order: 'desc', 
        limit: 50 
      });
      setUserBookings(response.bookings);
    } catch (err) {
      setUserBookingsError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setUserBookingsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load villages and bills data in parallel
      const [villagesResult, billsResult] = await Promise.all([
        villageService.getVillages(),
        billService.getBillsSummary({ 
          year: currentYear,
          ...(village && { village_id: villages.find(v => v.name === village)?.id })
        })
      ]);

      setVillages(villagesResult.data);
      
      // Transform bills data for dashboard
      const transformedData: DashboardBillData[] = billsResult.summary.map((bill: BillSummaryItem) => ({
        id: bill.apartment_id,
        village: bill.village_name,
        apartment: bill.apartment_name,
        owner: bill.owner_name,
        totalSpentEGP: bill.total_money_spent?.EGP || 0,
        totalSpentGBP: bill.total_money_spent?.GBP || 0,
        totalRequestedEGP: bill.total_money_requested?.EGP || 0,
        totalRequestedGBP: bill.total_money_requested?.GBP || 0,
        netEGP: bill.net_money?.EGP || 0,
        netGBP: bill.net_money?.GBP || 0,
        lastActivity: new Date().toISOString() // Would be from API in real scenario
      }));

      setBillData(transformedData);

      // Calculate bill type statistics
      // For now, we'll estimate based on the data structure
      // In a real scenario, this would come from a dedicated API endpoint
      const totalTransactions = transformedData.length * 3; // Estimate
      const estimatedStats: BillTypeStats = {
        payments: {
          count: Math.floor(totalTransactions * 0.5),
          totalEGP: transformedData.reduce((sum, item) => sum + item.totalSpentEGP, 0),
          totalGBP: transformedData.reduce((sum, item) => sum + item.totalSpentGBP, 0)
        },
        serviceRequests: {
          count: Math.floor(totalTransactions * 0.3),
          totalEGP: transformedData.reduce((sum, item) => sum + item.totalRequestedEGP * 0.7, 0),
          totalGBP: transformedData.reduce((sum, item) => sum + item.totalRequestedGBP * 0.7, 0)
        },
        utilityReadings: {
          count: Math.floor(totalTransactions * 0.2),
          totalEGP: transformedData.reduce((sum, item) => sum + item.totalRequestedEGP * 0.3, 0),
          totalGBP: transformedData.reduce((sum, item) => sum + item.totalRequestedGBP * 0.3, 0)
        }
      };
      
      setBillTypeStats(estimatedStats);

    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
    
    // Apply filters
  const filteredData = billData.filter(item => {
    if (village && item.village !== village) return false;
      return true;
    });
  
  // Calculate totals
  const totals = filteredData.reduce(
    (acc, item) => ({
      spentEGP: acc.spentEGP + item.totalSpentEGP,
      spentGBP: acc.spentGBP + item.totalSpentGBP,
      requestedEGP: acc.requestedEGP + item.totalRequestedEGP,
      requestedGBP: acc.requestedGBP + item.totalRequestedGBP,
      netEGP: acc.netEGP + item.netEGP,
      netGBP: acc.netGBP + item.netGBP
    }),
    { spentEGP: 0, spentGBP: 0, requestedEGP: 0, requestedGBP: 0, netEGP: 0, netGBP: 0 }
  );
  
  // Pie chart data for bill types
  const pieChartData = {
    labels: ['Payments', 'Service Requests', 'Utility Readings'],
    datasets: [
      {
        data: [
          billTypeStats.payments.count,
          billTypeStats.serviceRequests.count,
          billTypeStats.utilityReadings.count
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  // Bar chart data for top spending apartments
  const barChartData = {
    labels: filteredData.slice(0, 10).map(item => item.apartment),
    datasets: [
      {
        label: 'Total Spent (EGP)',
        data: filteredData.slice(0, 10).map(item => item.totalSpentEGP),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      },
      {
        label: 'Total Requested (EGP)',
        data: filteredData.slice(0, 10).map(item => item.totalRequestedEGP),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }
    ]
  };
  
  const handleVillageChange = (event: SelectChangeEvent) => {
    setVillage(event.target.value);
  };
  
  // Data transformer for export
  const transformDataForExport = (data: DashboardBillData[]) => {
    return data.map(item => ({
      apartment: item.apartment,
      village: item.village,
      owner: item.owner,
      total_spent_EGP: item.totalSpentEGP,
      total_spent_GBP: item.totalSpentGBP,
      total_requested_EGP: item.totalRequestedEGP,
      total_requested_GBP: item.totalRequestedGBP,
      net_balance_EGP: item.netEGP,
      net_balance_GBP: item.netGBP,
      last_activity: item.lastActivity
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
                    {userBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">No past bookings found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      userBookings.map((booking) => (
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
                  <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
                    {totals.spentEGP.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    EGP {totals.spentGBP > 0 && `• ${totals.spentGBP.toLocaleString()} GBP`}
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
                  <Typography variant="h3" color="error.main" sx={{ fontWeight: 'bold' }}>
                    {totals.requestedEGP.toLocaleString()}
                </Typography>
                  <Typography variant="body2" color="text.secondary">
                    EGP {totals.requestedGBP > 0 && `• ${totals.requestedGBP.toLocaleString()} GBP`}
                </Typography>
              </CardContent>
            </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', boxShadow: 3, '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' }, transition: 'all 0.3s ease' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccountBalanceIcon sx={{ color: totals.netEGP >= 0 ? 'success.main' : 'error.main', mr: 1, fontSize: 28 }} />
                    <Typography color="text.secondary" variant="h6">
                      Net Balance
                    </Typography>
          </Box>
                  <Typography variant="h3" color={totals.netEGP >= 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 'bold' }}>
                    {totals.netEGP.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    EGP {totals.netGBP !== 0 && `• ${totals.netGBP.toLocaleString()} GBP`}
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
                columns={["apartment","village","owner","total_spent_EGP","total_spent_GBP","total_requested_EGP","total_requested_GBP","net_balance_EGP","net_balance_GBP","last_activity"]} 
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