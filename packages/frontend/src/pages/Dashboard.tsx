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
  CircularProgress
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { apartmentService } from '../services/apartmentService';
import { paymentService } from '../services/paymentService';
import type { Apartment as ServiceApartment } from '../services/apartmentService';
import type { Payment as ServicePayment } from '../services/paymentService';
import type { Apartment } from '../types';
import ExportButtons from '../components/ExportButtons';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface FinancialReportRow {
  id: number;
  city: string;
  apartment: string;
  paymentMethod: string;
  balance: number;
  runningTotal: number;
}

export default function Dashboard() {
  const [city, setCity] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [payments, setPayments] = useState<ServicePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load apartments and payments in parallel
      const [apartmentsResult, paymentsResult] = await Promise.all([
        apartmentService.getApartments({ limit: 100 }),
        paymentService.getPayments({ limit: 100 })
      ]);

      setApartments(apartmentsResult.data.map((apt: ServiceApartment) => ({
        ...apt,
        created_by: (apt as any).created_by ?? 0, // fallback if missing
        purchase_date: apt.purchase_date ?? '', // ensure string
        paying_status:
          apt.paying_status === 'transfer' ? 'payed_by_transfer' :
          apt.paying_status === 'rent' ? 'payed_by_rent' :
          'non_payer'
      }) as Apartment));
      setPayments(paymentsResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate financial report data
  const generateReportData = (): FinancialReportRow[] => {
    if (!payments.length || !apartments.length) return [];
    
    let runningTotal = 0;
    const data = payments.map(payment => {
      const apartment = apartments.find(apt => apt.id === payment.apartment_id);
      runningTotal += payment.amount;
      
      return {
        id: payment.id,
        city: apartment?.village?.name || 'Unknown',
        apartment: apartment?.name || 'Unknown',
        paymentMethod: payment.payment_method?.name || 'Unknown',
        balance: payment.amount,
        runningTotal
      };
    });
    
    // Apply filters
    return data.filter(row => {
      if (city && row.city !== city) return false;
      if (paymentMethod && row.paymentMethod !== paymentMethod) return false;
      return true;
    });
  };

  const reportData = generateReportData();
  
  // Extract unique cities and payment methods for filters
  const cities = Array.from(new Set(apartments.map(apt => apt.village?.name).filter(Boolean)));
  const paymentMethods = Array.from(new Set(payments.map(p => p.payment_method?.name).filter(Boolean)));
  
  // Calculate totals
  const totalIncome = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalApartments = apartments.length;
  
  // Chart data
  const chartData = {
    labels: reportData.slice(0, 10).map(row => row.apartment), // Limit to 10 for readability
    datasets: [
      {
        label: 'Balance (EGP)',
        data: reportData.slice(0, 10).map(row => row.balance),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };
  
  const handleCityChange = (event: SelectChangeEvent) => {
    setCity(event.target.value);
  };
  
  const handlePaymentMethodChange = (event: SelectChangeEvent) => {
    setPaymentMethod(event.target.value);
  };
  
  const handleExport = () => {
    // In a real app, this would generate a PDF or Excel file
    alert('Export functionality would be implemented here');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Summary Cards */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Card sx={{ flex: '1 1 300px', minWidth: '250px' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Apartments
              </Typography>
              <Typography variant="h4">
                {totalApartments}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: '1 1 300px', minWidth: '250px' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Income
              </Typography>
              <Typography variant="h4">
                {totalIncome.toLocaleString()} EGP
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: '1 1 300px', minWidth: '250px' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Payments
              </Typography>
              <Typography variant="h4">
                {payments.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        
        {/* Financial Report */}
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" component="div">
              General Financial Report
            </Typography>
          </Box>
          
          {/* Export Buttons */}
          <ExportButtons data={reportData} columns={["id","city","apartment","paymentMethod","balance","runningTotal"]} excelFileName="dashboard-report.xlsx" pdfFileName="dashboard-report.pdf" />
          
          <Box sx={{ display: 'flex', mb: 2 }}>
            <FormControl sx={{ m: 1, minWidth: 150 }}>
              <InputLabel>Village</InputLabel>
              <Select
                value={city}
                label="Village"
                onChange={handleCityChange}
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                {cities.map(cityName => (
                  <MenuItem key={cityName} value={cityName}>{cityName}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ m: 1, minWidth: 150 }}>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentMethod}
                label="Payment Method"
                onChange={handlePaymentMethodChange}
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                {paymentMethods.map(method => (
                  <MenuItem key={method} value={method}>{method}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Village</TableCell>
                  <TableCell>Apartment</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell align="right">Running Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.city}</TableCell>
                    <TableCell>{row.apartment}</TableCell>
                    <TableCell>{row.paymentMethod}</TableCell>
                    <TableCell align="right">{row.balance.toLocaleString()} EGP</TableCell>
                    <TableCell align="right">{row.runningTotal.toLocaleString()} EGP</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        
        {/* Chart */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Recent Payments by Apartment
          </Typography>
          <Box sx={{ height: 300 }}>
            {reportData.length > 0 ? (
              <Bar options={{ responsive: true, maintainAspectRatio: false }} data={chartData} />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography color="text.secondary">
                  No payment data available for chart
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
} 