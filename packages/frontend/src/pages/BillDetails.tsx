import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { mockServiceRequests, mockServiceTypes, mockApartments, mockUsers, mockBookings, mockPayments } from '../mockData';
import { Download as DownloadIcon, PictureAsPdf as PdfIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { format } from 'date-fns';

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

const BillDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Find the bill from either service requests or payments
  const serviceRequest = mockServiceRequests.find(sr => sr.id === id);
  const payment = mockPayments.find(p => p.id === id);
  
  let bill: BillDisplayData | undefined;
  
  if (serviceRequest) {
    const serviceType = mockServiceTypes.find(st => st.id === serviceRequest.serviceTypeId);
    const apartment = mockApartments.find(apt => apt.id === serviceRequest.apartmentId);
    const user = mockUsers.find(u => u.id === serviceRequest.userId);
    const booking = mockBookings.find(b => b.id === serviceRequest.bookingId);
    
    if (serviceType && apartment && user) {
      const dueDate = new Date(serviceRequest.serviceDate || serviceRequest.requestDate);
      dueDate.setDate(dueDate.getDate() + 15);
      
      bill = {
        id: serviceRequest.id,
        billNumber: serviceRequest.id,
        apartmentName: apartment.name,
        userName: user.name,
        village: apartment.village as string,
        userType: user.role === 'owner' ? 'owner' : 'renter',
        billDate: serviceRequest.requestDate,
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        isPaid: serviceRequest.status === 'completed',
        description: `${serviceType.name} - ${serviceType.description}`,
        billType: 'service',
        apartmentId: serviceRequest.apartmentId,
        userId: serviceRequest.userId,
        bookingId: serviceRequest.bookingId,
        bookingArrivalDate: booking?.arrivalDate,
        totalMoneySpentEGP: 0,
        totalMoneySpentGBP: 0,
        totalMoneyRequestedEGP: serviceType.currency === 'EGP' ? serviceType.cost : 0,
        totalMoneyRequestedGBP: serviceType.currency === 'GBP' ? serviceType.cost : 0,
        netMoneyEGP: serviceType.currency === 'EGP' ? -serviceType.cost : 0,
        netMoneyGBP: serviceType.currency === 'GBP' ? -serviceType.cost : 0
      };
    }
  } else if (payment) {
    const apartment = mockApartments.find(apt => apt.id === payment.apartmentId);
    const user = mockUsers.find(u => u.id === payment.userId);
    const booking = mockBookings.find(b => b.id === payment.bookingId);
    
    if (apartment && user) {
      const dueDate = new Date(payment.createdAt);
      dueDate.setDate(dueDate.getDate() + 15);
      
      bill = {
        id: payment.id,
        billNumber: payment.id,
        apartmentName: apartment.name,
        userName: user.name,
        village: apartment.village as string,
        userType: payment.userType,
        billDate: payment.createdAt,
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        isPaid: true,
        description: payment.description,
        billType: 'payment',
        apartmentId: payment.apartmentId,
        userId: payment.userId,
        bookingId: payment.bookingId,
        bookingArrivalDate: booking?.arrivalDate,
        totalMoneySpentEGP: payment.currency === 'EGP' ? payment.cost : 0,
        totalMoneySpentGBP: payment.currency === 'GBP' ? payment.cost : 0,
        totalMoneyRequestedEGP: 0,
        totalMoneyRequestedGBP: 0,
        netMoneyEGP: payment.currency === 'EGP' ? payment.cost : 0,
        netMoneyGBP: payment.currency === 'GBP' ? payment.cost : 0
      };
    }
  }

  if (!bill) {
    return (
      <Box p={3}>
        <Typography variant="h5">Bill not found</Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/bills')}
          sx={{ mt: 2 }}
        >
          Back to Bills
        </Button>
      </Box>
    );
  }

  const handleExportPDF = () => {
    // Implement PDF export functionality
    console.log('Exporting PDF...');
  };

  const handleExportExcel = () => {
    // Implement Excel export functionality
    console.log('Exporting Excel...');
  };

  return (
    <Box p={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/bills')}
          >
            Back
          </Button>
          <Typography variant="h4">Bill Details</Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={handleExportPDF}
            sx={{ mr: 1 }}
          >
            Export PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
          >
            Export Excel
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Bill Information</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Bill Number</Typography>
                <Typography variant="body1">{bill.billNumber}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Type</Typography>
                <Chip 
                  label={bill.billType === 'service' ? 'Service' : 'Payment'} 
                  color={bill.billType === 'service' ? 'primary' : 'success'} 
                  size="small" 
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                <Chip 
                  label={bill.isPaid ? 'Paid' : 'Pending'} 
                  color={bill.isPaid ? 'success' : 'warning'} 
                  size="small" 
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Bill Date</Typography>
                <Typography variant="body1">{format(new Date(bill.billDate), 'MMM dd, yyyy')}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Due Date</Typography>
                <Typography variant="body1">{format(new Date(bill.dueDate), 'MMM dd, yyyy')}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Amount Details</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              {bill.totalMoneySpentEGP > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Money Spent (EGP)</Typography>
                  <Typography variant="h6" color="primary">{bill.totalMoneySpentEGP.toLocaleString()} EGP</Typography>
                </Box>
              )}
              {bill.totalMoneySpentGBP > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Money Spent (GBP)</Typography>
                  <Typography variant="h6" color="primary">{bill.totalMoneySpentGBP.toLocaleString()} GBP</Typography>
                </Box>
              )}
              {bill.totalMoneyRequestedEGP > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Money Requested (EGP)</Typography>
                  <Typography variant="h6" color="error">{bill.totalMoneyRequestedEGP.toLocaleString()} EGP</Typography>
                </Box>
              )}
              {bill.totalMoneyRequestedGBP > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Money Requested (GBP)</Typography>
                  <Typography variant="h6" color="error">{bill.totalMoneyRequestedGBP.toLocaleString()} GBP</Typography>
                </Box>
              )}
              {bill.netMoneyEGP !== 0 && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Net Money (EGP)</Typography>
                  <Typography variant="h6" color={bill.netMoneyEGP > 0 ? 'success.main' : 'error'}>
                    {bill.netMoneyEGP.toLocaleString()} EGP
                  </Typography>
                </Box>
              )}
              {bill.netMoneyGBP !== 0 && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Net Money (GBP)</Typography>
                  <Typography variant="h6" color={bill.netMoneyGBP > 0 ? 'success.main' : 'error'}>
                    {bill.netMoneyGBP.toLocaleString()} GBP
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Related Information</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Apartment</Typography>
                <Typography variant="body1">{bill.apartmentName}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Village</Typography>
                <Typography variant="body1">{bill.village}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">User</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1">{bill.userName}</Typography>
                  <Chip 
                    label={bill.userType === 'owner' ? 'Owner' : 'Renter'} 
                    color={bill.userType === 'owner' ? 'primary' : 'default'}
                    size="small"
                    variant="outlined"
                    sx={{ height: '18px', fontSize: '0.65rem' }}
                  />
                </Box>
              </Box>
              {bill.bookingId && (
                <>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">Booking ID</Typography>
                    <Typography variant="body1">{bill.bookingId}</Typography>
                  </Box>
                  {bill.bookingArrivalDate && (
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">Booking Arrival Date</Typography>
                      <Typography variant="body1">{format(new Date(bill.bookingArrivalDate), 'MMM dd, yyyy')}</Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default BillDetails; 