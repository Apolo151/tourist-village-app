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

interface InvoiceDisplayData {
  id: string;
  invoiceNumber: string;
  apartmentName: string;
  userName: string;
  village: string;
  userType: 'owner' | 'renter';
  invoiceDate: string;
  dueDate: string;
  isPaid: boolean;
  description: string;
  invoiceType: 'service' | 'payment';
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

const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const numericId = id ? Number(id) : undefined;
  
  // Find the invoice from either service requests or payments
  const serviceRequest = mockServiceRequests.find(sr => sr.id === numericId);
  const payment = mockPayments.find(p => p.id === numericId);
  
  let invoice: InvoiceDisplayData | undefined;
  
  if (serviceRequest) {
    const serviceType = mockServiceTypes.find(st => st.id === serviceRequest.service_type_id);
    const apartment = mockApartments.find(apt => apt.id === serviceRequest.apartment_id);
    const user = mockUsers.find(u => u.id === (typeof serviceRequest.userId === 'string' ? Number(serviceRequest.userId) : serviceRequest.userId));
    const booking = mockBookings.find(b => b.id === (typeof serviceRequest.booking_id === 'string' ? Number(serviceRequest.booking_id) : serviceRequest.booking_id));
    
    if (serviceType && apartment && user) {
      invoice = {
        id: serviceRequest.id.toString(),
        invoiceNumber: `SR-${serviceRequest.id.toString().padStart(4, '0')}`,
        apartmentName: apartment.name,
        userName: user.name,
        village: apartment.village || 'Unknown',
        userType: user.role === 'owner' ? 'owner' : 'renter',
        invoiceDate: serviceRequest.request_date,
        dueDate: serviceRequest.wanted_service_date,
        isPaid: serviceRequest.status === 'Done',
        description: serviceType.name,
        invoiceType: 'service',
        apartmentId: apartment.id.toString(),
        userId: user.id.toString(),
        bookingId: booking?.id.toString(),
        bookingArrivalDate: booking?.arrival_date,
        totalMoneySpentEGP: 0,
        totalMoneySpentGBP: 0,
        totalMoneyRequestedEGP: serviceType.currency === 'EGP' ? serviceType.cost : 0,
        totalMoneyRequestedGBP: serviceType.currency === 'GBP' ? serviceType.cost : 0,
        netMoneyEGP: serviceType.currency === 'EGP' ? serviceType.cost : 0,
        netMoneyGBP: serviceType.currency === 'GBP' ? serviceType.cost : 0,
      };
    }
  } else if (payment) {
    const apartment = mockApartments.find(apt => apt.id === payment.apartment_id);
    const booking = mockBookings.find(b => b.id === payment.booking_id);
    const user = booking ? mockUsers.find(u => u.id === booking.user_id) : undefined;
    
    if (apartment && user) {
      invoice = {
        id: payment.id.toString(),
        invoiceNumber: `PAY-${payment.id.toString().padStart(4, '0')}`,
        apartmentName: apartment.name,
        userName: user.name,
        village: apartment.village || 'Unknown',
        userType: user.role === 'owner' ? 'owner' : 'renter',
        invoiceDate: payment.created_at,
        dueDate: payment.created_at,
        isPaid: true,
        description: payment.description || 'Payment',
        invoiceType: 'payment',
        apartmentId: apartment.id.toString(),
        userId: user.id.toString(),
        bookingId: booking?.id.toString(),
        bookingArrivalDate: booking?.arrival_date,
        totalMoneySpentEGP: payment.currency === 'EGP' ? payment.amount : 0,
        totalMoneySpentGBP: payment.currency === 'GBP' ? payment.amount : 0,
        totalMoneyRequestedEGP: 0,
        totalMoneyRequestedGBP: 0,
        netMoneyEGP: payment.currency === 'EGP' ? -payment.amount : 0,
        netMoneyGBP: payment.currency === 'GBP' ? -payment.amount : 0,
      };
    }
  }

  if (!invoice) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Invoice not found
        </Typography>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/invoices')}
          sx={{ mt: 2 }}
        >
          Back to Invoices
        </Button>
      </Box>
    );
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString()} ${currency}`;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Invoice Details
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {invoice.invoiceNumber}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/invoices')}
            variant="outlined"
          >
            Back to Invoices
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            variant="contained"
            color="primary"
          >
            Download
          </Button>
          <Button
            startIcon={<PdfIcon />}
            variant="contained"
            color="secondary"
          >
            PDF
          </Button>
        </Box>
      </Box>

      {/* Invoice Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Invoice Information
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Invoice Number
              </Typography>
              <Typography variant="body1">
                {invoice.invoiceNumber}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Invoice Date
              </Typography>
              <Typography variant="body1">
                {formatDate(invoice.invoiceDate)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Due Date
              </Typography>
              <Typography variant="body1">
                {formatDate(invoice.dueDate)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={invoice.isPaid ? 'Paid' : 'Pending'}
                color={invoice.isPaid ? 'success' : 'warning'}
                size="small"
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Apartment & User Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Property & User Information
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Apartment
              </Typography>
              <Typography variant="body1">
                {invoice.apartmentName}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Village
              </Typography>
              <Typography variant="body1">
                {invoice.village}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                User
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1">
                  {invoice.userName}
                </Typography>
                <Chip
                  label={invoice.userType}
                  color={invoice.userType === 'owner' ? 'primary' : 'secondary'}
                  size="small"
                />
              </Box>
            </Box>
            {invoice.bookingId && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Booking
                </Typography>
                <Typography variant="body1">
                  #{invoice.bookingId}
                  {invoice.bookingArrivalDate && (
                    <Typography variant="caption" display="block">
                      Arrival: {formatDate(invoice.bookingArrivalDate)}
                    </Typography>
                  )}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Invoice Details
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Description
            </Typography>
            <Typography variant="body1">
              {invoice.description}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Type
            </Typography>
            <Chip
              label={invoice.invoiceType === 'service' ? 'Service Request' : 'Payment'}
              color={invoice.invoiceType === 'service' ? 'warning' : 'success'}
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Financial Summary
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Money Spent
              </Typography>
              <Typography variant="h6" color="success.main">
                {invoice.totalMoneySpentEGP > 0 && formatCurrency(invoice.totalMoneySpentEGP, 'EGP')}
                {invoice.totalMoneySpentEGP > 0 && invoice.totalMoneySpentGBP > 0 && ' / '}
                {invoice.totalMoneySpentGBP > 0 && formatCurrency(invoice.totalMoneySpentGBP, 'GBP')}
                {invoice.totalMoneySpentEGP === 0 && invoice.totalMoneySpentGBP === 0 && '-'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Money Requested
              </Typography>
              <Typography variant="h6" color="error.main">
                {invoice.totalMoneyRequestedEGP > 0 && formatCurrency(invoice.totalMoneyRequestedEGP, 'EGP')}
                {invoice.totalMoneyRequestedEGP > 0 && invoice.totalMoneyRequestedGBP > 0 && ' / '}
                {invoice.totalMoneyRequestedGBP > 0 && formatCurrency(invoice.totalMoneyRequestedGBP, 'GBP')}
                {invoice.totalMoneyRequestedEGP === 0 && invoice.totalMoneyRequestedGBP === 0 && '-'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Net Amount
              </Typography>
              <Typography 
                variant="h6" 
                color={
                  (invoice.netMoneyEGP + invoice.netMoneyGBP) >= 0 
                    ? 'success.main' 
                    : 'error.main'
                }
              >
                {invoice.netMoneyEGP !== 0 && formatCurrency(invoice.netMoneyEGP, 'EGP')}
                {invoice.netMoneyEGP !== 0 && invoice.netMoneyGBP !== 0 && ' / '}
                {invoice.netMoneyGBP !== 0 && formatCurrency(invoice.netMoneyGBP, 'GBP')}
                {invoice.netMoneyEGP === 0 && invoice.netMoneyGBP === 0 && '-'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default InvoiceDetails; 