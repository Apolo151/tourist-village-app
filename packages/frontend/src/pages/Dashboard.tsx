import { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { mockApartments, mockPayments } from '../mockData';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface FinancialReportRow {
  id: string;
  city: string;
  apartment: string;
  paymentMethod: string;
  balance: number;
  runningTotal: number;
}

export default function Dashboard() {
  const [city, setCity] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  
  // Generate financial report data
  const generateReportData = (): FinancialReportRow[] => {
    // In a real app, this would come from an API
    let runningTotal = 0;
    const data = mockPayments.map(payment => {
      const apartment = mockApartments.find(apt => apt.id === payment.apartmentId);
      runningTotal += payment.cost;
      
      return {
        id: payment.id,
        city: apartment?.city || 'Unknown',
        apartment: apartment?.name || 'Unknown',
        paymentMethod: payment.placeOfPayment,
        balance: payment.cost,
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
  const cities = Array.from(new Set(mockApartments.map(apt => apt.city)));
  const paymentMethods = Array.from(new Set(mockPayments.map(p => p.placeOfPayment)));
  
  // Chart data
  const chartData = {
    labels: reportData.map(row => row.apartment),
    datasets: [
      {
        label: 'Balance',
        data: reportData.map(row => row.balance),
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Summary Cards */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Card sx={{ flex: '1 1 300px', minWidth: '250px' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Apartments
              </Typography>
              <Typography variant="h4">
                {mockApartments.length}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: '1 1 300px', minWidth: '250px' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Income
              </Typography>
              <Typography variant="h4">
                {mockPayments.reduce((sum, payment) => sum + payment.cost, 0).toLocaleString()} EGP
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ flex: '1 1 300px', minWidth: '250px' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Bookings
              </Typography>
              <Typography variant="h4">
                2
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
            <Button variant="contained" onClick={handleExport}>
              Export to PDF/Excel
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', mb: 2 }}>
            <FormControl sx={{ m: 1, minWidth: 150 }}>
              <InputLabel>City</InputLabel>
              <Select
                value={city}
                label="City"
                onChange={handleCityChange}
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                {cities.map(city => (
                  <MenuItem key={city} value={city}>{city}</MenuItem>
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
                  <TableCell>City</TableCell>
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
            Balances by Apartment
          </Typography>
          <Box sx={{ height: 300 }}>
            <Bar options={{ responsive: true, maintainAspectRatio: false }} data={chartData} />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
} 