import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Stack
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format, parseISO } from 'date-fns';
import { invoiceService } from '../services/invoiceService';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import ExportButtons from '../components/ExportButtons';

const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apartmentId = id ? Number(id) : undefined;

  // Default date range: current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [fromDate, setFromDate] = useState<Date | null>(firstDayOfMonth);
  const [toDate, setToDate] = useState<Date | null>(lastDayOfMonth);
  const [beforeTotals, setBeforeTotals] = useState<any | null>(null);

  // Fetch invoice details
  const fetchDetails = async () => {
    if (!apartmentId) return;
    setLoading(true);
    setError(null);
    try {
      const filters: any = {};
      if (fromDate) filters.date_from = format(fromDate, 'yyyy-MM-dd');
      if (toDate) filters.date_to = format(toDate, 'yyyy-MM-dd');
      const data = await invoiceService.getApartmentDetails(apartmentId, filters);
      setDetails(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch owner transactions before the selected date range
  const fetchBeforeTotals = async () => {
    if (!apartmentId || !fromDate) {
      setBeforeTotals(null);
      return;
    }
    // date_to is the day before fromDate
    const beforeDate = new Date(fromDate);
    beforeDate.setDate(beforeDate.getDate() - 1);
    const filters: any = { date_to: format(beforeDate, 'yyyy-MM-dd') };
    try {
      const data = await invoiceService.getApartmentDetails(apartmentId, filters);
      // Only sum owner transactions
      const ownerTx = getOwnerTransactions(data.invoices);
      const totals = getOwnerSummaryTotals(ownerTx);
      setBeforeTotals(totals);
    } catch {
      setBeforeTotals(null);
    }
  };

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apartmentId, fromDate, toDate]);

  useEffect(() => {
    fetchBeforeTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apartmentId, fromDate]);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  // Filter to only owner transactions (robust, only check user_type for payments, who_pays for others)
  const getOwnerTransactions = (invoices: any[]) => {
    if (!Array.isArray(invoices) || invoices.length === 0) return [];
    // If at least one invoice has user_type or who_pays, filter, else return all
    const hasOwnerFields = invoices.some(inv => inv.user_type || inv.who_pays);
    if (!hasOwnerFields) return invoices; // fallback: show all
    return invoices.filter((invoice) => {
      if (invoice.type === 'Payment') {
        if (typeof invoice.user_type === 'string') {
          return invoice.user_type.toLowerCase() === 'owner';
        }
        return false;
      }
      if (invoice.type === 'Service Request' || invoice.type === 'Utility Reading') {
        if (typeof invoice.who_pays === 'string') {
          return invoice.who_pays.toLowerCase() === 'owner';
        }
        return false;
      }
      return false;
    });
  };

  // Calculate owner-only financial summary
  const getOwnerSummaryTotals = (invoices: any[]) => {
    const ownerTx = getOwnerTransactions(invoices);
    return ownerTx.reduce((acc, invoice) => {
      if (invoice.type === 'Payment') {
        if (invoice.currency === 'EGP') acc.total_spent_egp += invoice.amount;
        else if (invoice.currency === 'GBP') acc.total_spent_gbp += invoice.amount;
      } else {
        if (invoice.currency === 'EGP') acc.total_requested_egp += invoice.amount;
        else if (invoice.currency === 'GBP') acc.total_requested_gbp += invoice.amount;
      }
      return acc;
    }, {
      total_spent_egp: 0,
      total_spent_gbp: 0,
      total_requested_egp: 0,
      total_requested_gbp: 0
    });
  };

  // Calculate totals for owner transactions before the selected date range
  const getOwnerTotalsBeforeRange = (invoices: any[], fromDate: Date | null) => {
    if (!fromDate) return null;
    const ownerTx = getOwnerTransactions(invoices);
    const beforeTx = ownerTx.filter(inv => {
      if (!inv.date) return false;
      try {
        return new Date(inv.date) < fromDate;
      } catch {
        return false;
      }
    });
    return getOwnerSummaryTotals(beforeTx);
  };

  // Helper function for customer name logic
  function getCustomerName(invoice: any, details: any) {
    // Owner-paid: show person_name (payer/requester)
    if (
      (invoice.type === 'Payment' && invoice.user_type && invoice.user_type.toLowerCase() === 'owner') ||
      ((invoice.type === 'Service Request' || invoice.type === 'Utility Reading') && invoice.who_pays && invoice.who_pays.toLowerCase() === 'owner')
    ) {
      return invoice.person_name || invoice.owner_name || details.apartment.owner_name || '-';
    }
    // Renter-paid: show owner_name
    if (
      (invoice.type === 'Payment' && invoice.user_type && invoice.user_type.toLowerCase() === 'renter') ||
      ((invoice.type === 'Service Request' || invoice.type === 'Utility Reading') && invoice.who_pays && invoice.who_pays.toLowerCase() === 'renter')
    ) {
      return invoice.owner_name || details.apartment.owner_name || '-';
    }
    // Fallback
    return invoice.owner_name || details.apartment.owner_name || invoice.person_name || '-';
  }

  if (!apartmentId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Invalid apartment ID</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/invoices')} sx={{ mt: 2 }}>
          Back to Invoices
        </Button>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/invoices')} variant="outlined">
            Back to Invoices
          </Button>
          <Typography variant="h4">Apartment Invoice Details</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <DatePicker
            label="From"
            value={fromDate}
            onChange={setFromDate}
            slotProps={{ textField: { size: 'small' } }}
            format="MM/dd/yyyy"
          />
          <DatePicker
            label="To"
            value={toDate}
            onChange={setToDate}
            slotProps={{ textField: { size: 'small' } }}
            format="MM/dd/yyyy"
          />
          <Button
            variant="outlined"
            onClick={() => {
              setFromDate(null);
              setToDate(null);
            }}
            size="small"
            sx={{ height: '40px' }}
          >
            Clear Dates
          </Button>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
      </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : details ? (
          <>
            {/* Highlight for totals before selected date range and full total */}
            {details && (() => {
              const currentTotals = getOwnerSummaryTotals(details.invoices);
              const hasCurrent = currentTotals.total_spent_egp > 0 || currentTotals.total_spent_gbp > 0 || currentTotals.total_requested_egp > 0 || currentTotals.total_requested_gbp > 0;
              const hasBefore = beforeTotals && (beforeTotals.total_spent_egp > 0 || beforeTotals.total_spent_gbp > 0 || beforeTotals.total_requested_egp > 0 || beforeTotals.total_requested_gbp > 0);
              const fullTotals = beforeTotals ? {
                total_spent_egp: beforeTotals.total_spent_egp + currentTotals.total_spent_egp,
                total_spent_gbp: beforeTotals.total_spent_gbp + currentTotals.total_spent_gbp,
                total_requested_egp: beforeTotals.total_requested_egp + currentTotals.total_requested_egp,
                total_requested_gbp: beforeTotals.total_requested_gbp + currentTotals.total_requested_gbp
              } : currentTotals;
              if (!hasCurrent && !hasBefore) return null;
              return (
                <Alert severity="info" sx={{ mb: 3 }}>
                  {hasBefore && (
                    <>
                      <strong>Totals for Owner Transactions before selected date range:</strong><br />
                      <span>Money Spent: {beforeTotals.total_spent_egp > 0 ? `${beforeTotals.total_spent_egp.toLocaleString()} EGP` : ''}{beforeTotals.total_spent_egp > 0 && beforeTotals.total_spent_gbp > 0 ? ' / ' : ''}{beforeTotals.total_spent_gbp > 0 ? `${beforeTotals.total_spent_gbp.toLocaleString()} GBP` : ''}{beforeTotals.total_spent_egp === 0 && beforeTotals.total_spent_gbp === 0 ? '-' : ''}</span><br />
                      <span>Total Outstanding: {beforeTotals.total_requested_egp > 0 ? `${beforeTotals.total_requested_egp.toLocaleString()} EGP` : ''}{beforeTotals.total_requested_egp > 0 && beforeTotals.total_requested_gbp > 0 ? ' / ' : ''}{beforeTotals.total_requested_gbp > 0 ? `${beforeTotals.total_requested_gbp.toLocaleString()} GBP` : ''}{beforeTotals.total_requested_egp === 0 && beforeTotals.total_requested_gbp === 0 ? '-' : ''}</span><br />
                      <span>Net Balance: {(beforeTotals.total_requested_egp - beforeTotals.total_spent_egp !== 0) ? `${(beforeTotals.total_requested_egp - beforeTotals.total_spent_egp).toLocaleString()} EGP` : ''}{(beforeTotals.total_requested_egp - beforeTotals.total_spent_egp !== 0) && (beforeTotals.total_requested_gbp - beforeTotals.total_spent_gbp !== 0) ? ' / ' : ''}{(beforeTotals.total_requested_gbp - beforeTotals.total_spent_gbp !== 0) ? `${(beforeTotals.total_requested_gbp - beforeTotals.total_spent_gbp).toLocaleString()} GBP` : ''}{(beforeTotals.total_requested_egp - beforeTotals.total_spent_egp === 0) && (beforeTotals.total_requested_gbp - beforeTotals.total_spent_gbp === 0) ? '-' : ''}</span>
                      <br /><br />
                    </>
                  )}
                  <strong>Full Totals (before + within selected date range):</strong><br />
                  <span>Money Spent: {fullTotals.total_spent_egp > 0 ? `${fullTotals.total_spent_egp.toLocaleString()} EGP` : ''}{fullTotals.total_spent_egp > 0 && fullTotals.total_spent_gbp > 0 ? ' / ' : ''}{fullTotals.total_spent_gbp > 0 ? `${fullTotals.total_spent_gbp.toLocaleString()} GBP` : ''}{fullTotals.total_spent_egp === 0 && fullTotals.total_spent_gbp === 0 ? '-' : ''}</span><br />
                  <span>Total Outstanding: {fullTotals.total_requested_egp > 0 ? `${fullTotals.total_requested_egp.toLocaleString()} EGP` : ''}{fullTotals.total_requested_egp > 0 && fullTotals.total_requested_gbp > 0 ? ' / ' : ''}{fullTotals.total_requested_gbp > 0 ? `${fullTotals.total_requested_gbp.toLocaleString()} GBP` : ''}{fullTotals.total_requested_egp === 0 && fullTotals.total_requested_gbp === 0 ? '-' : ''}</span><br />
                  <span>Net Balance: {(fullTotals.total_requested_egp - fullTotals.total_spent_egp !== 0) ? `${(fullTotals.total_requested_egp - fullTotals.total_spent_egp).toLocaleString()} EGP` : ''}{(fullTotals.total_requested_egp - fullTotals.total_spent_egp !== 0) && (fullTotals.total_requested_gbp - fullTotals.total_spent_gbp !== 0) ? ' / ' : ''}{(fullTotals.total_requested_gbp - fullTotals.total_spent_gbp !== 0) ? `${(fullTotals.total_requested_gbp - fullTotals.total_spent_gbp).toLocaleString()} GBP` : ''}{(fullTotals.total_requested_egp - fullTotals.total_spent_egp === 0) && (fullTotals.total_requested_gbp - fullTotals.total_spent_gbp === 0) ? '-' : ''}</span>
                </Alert>
              );
            })()}
            {/* Apartment Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
                <Typography variant="h6" gutterBottom>Apartment Information</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <Box>
                    <Typography variant="body2" color="text.secondary">Apartment</Typography>
                    <Typography variant="body1">{details.apartment.name}</Typography>
            </Box>
            <Box>
                    <Typography variant="body2" color="text.secondary">Apartment ID</Typography>
                    <Typography variant="body1">{details.apartment.id}</Typography>
            </Box>
                </Stack>
        </CardContent>
      </Card>
            {/* Financial Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
                <Typography variant="h6" gutterBottom>Financial Summary (Owner Transactions Only)</Typography>
                {details && (
                  (() => {
                    const totals = getOwnerSummaryTotals(details.invoices);
                    return (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
                          <Typography variant="subtitle2" color="success.main">Money Spent</Typography>
                          <Typography>
                            {totals.total_spent_egp > 0 && `${totals.total_spent_egp.toLocaleString()} EGP`}
                            {totals.total_spent_egp > 0 && totals.total_spent_gbp > 0 && ' / '}
                            {totals.total_spent_gbp > 0 && `${totals.total_spent_gbp.toLocaleString()} GBP`}
                            {totals.total_spent_egp === 0 && totals.total_spent_gbp === 0 && '-'}
              </Typography>
            </Box>
            <Box>
                          <Typography variant="subtitle2" color="error.main">Total Outstanding</Typography>
                          <Typography>
                            {totals.total_requested_egp > 0 && `${totals.total_requested_egp.toLocaleString()} EGP`}
                            {totals.total_requested_egp > 0 && totals.total_requested_gbp > 0 && ' / '}
                            {totals.total_requested_gbp > 0 && `${totals.total_requested_gbp.toLocaleString()} GBP`}
                            {totals.total_requested_egp === 0 && totals.total_requested_gbp === 0 && '-'}
              </Typography>
            </Box>
            <Box>
                          <Typography variant="subtitle2" color={totals.total_requested_egp - totals.total_spent_egp >= 0 ? 'success.main' : 'error.main'}>Net Balance</Typography>
                          <Typography>
                            {(totals.total_requested_egp - totals.total_spent_egp !== 0) && `${(totals.total_requested_egp - totals.total_spent_egp).toLocaleString()} EGP`}
                            {(totals.total_requested_egp - totals.total_spent_egp !== 0) && (totals.total_requested_gbp - totals.total_spent_gbp !== 0) && ' / '}
                            {(totals.total_requested_gbp - totals.total_spent_gbp !== 0) && `${(totals.total_requested_gbp - totals.total_spent_gbp).toLocaleString()} GBP`}
                            {(totals.total_requested_egp - totals.total_spent_egp === 0) && (totals.total_requested_gbp - totals.total_spent_gbp === 0) && '-'}
                </Typography>
              </Box>
            </Box>
                    );
                  })()
                )}
        </CardContent>
      </Card>
            {/* Transactions Table */}
      <Card>
        <CardContent>
                <Typography variant="h6" gutterBottom>Owner Transactions</Typography>
                {/* Export Buttons */}
                {getOwnerTransactions(details.invoices).length > 0 && (
                  <ExportButtons
                    data={getOwnerTransactions(details.invoices)}
                    columns={["Transaction Type","Description","EGP Debit","EGP Credit","GBP Debit","GBP Credit","Date","Arrival","Departure","Customer Name"]}
                    excelFileName={`invoice_apartment_${details.apartment.id}.xlsx`}
                    pdfFileName={`invoice_apartment_${details.apartment.id}.pdf`}
                    transformer={(data) => {
                      // Map transactions to export format
                      const rows = data.map((invoice: any) => {
                        let egpDebit = '', egpCredit = '', gbpDebit = '', gbpCredit = '';
                        if (invoice.currency === 'EGP') {
                          if (invoice.type === 'Payment') egpCredit = invoice.amount;
                          else egpDebit = invoice.amount;
                        } else if (invoice.currency === 'GBP') {
                          if (invoice.type === 'Payment') gbpCredit = invoice.amount;
                          else gbpDebit = invoice.amount;
                        }
                        return {
                          'Transaction Type': invoice.type,
                          'Description': invoice.description || '-',
                          'EGP Debit': egpDebit ? egpDebit.toLocaleString() : '',
                          'EGP Credit': egpCredit ? egpCredit.toLocaleString() : '',
                          'GBP Debit': gbpDebit ? gbpDebit.toLocaleString() : '',
                          'GBP Credit': gbpCredit ? gbpCredit.toLocaleString() : '',
                          'Date': invoice.date ? formatDate(invoice.date) : '',
                          'Arrival': invoice.booking_arrival_date ? formatDate(invoice.booking_arrival_date) : '',
                          'Departure': invoice.booking_departure_date ? formatDate(invoice.booking_departure_date) : '',
                          'Customer Name': getCustomerName(invoice, details),
                        };
                      });
                      // Calculate totals and outstanding
                      const sum = (arr: any[], key: string) => arr.reduce((s, r) => s + (parseFloat((r[key] || '0').replace(/,/g, '')) || 0), 0);
                      const totalEgpDebit = sum(rows, 'EGP Debit');
                      const totalEgpCredit = sum(rows, 'EGP Credit');
                      const totalGbpDebit = sum(rows, 'GBP Debit');
                      const totalGbpCredit = sum(rows, 'GBP Credit');
                      const egpOutstanding = totalEgpCredit - totalEgpDebit;
                      const gbpOutstanding = totalGbpCredit - totalGbpDebit;
                      // Add totals and outstanding rows
                      rows.push({
                        'Transaction Type': '',
                        'Description': 'Total',
                        'EGP Debit': totalEgpDebit ? totalEgpDebit.toLocaleString() : '',
                        'EGP Credit': totalEgpCredit ? totalEgpCredit.toLocaleString() : '',
                        'GBP Debit': totalGbpDebit ? totalGbpDebit.toLocaleString() : '',
                        'GBP Credit': totalGbpCredit ? totalGbpCredit.toLocaleString() : '',
                        'Date': '', 'Arrival': '', 'Departure': '', 'Customer Name': ''
                      });
                      rows.push({
                        'Transaction Type': '',
                        'Description': 'EGP Outstanding',
                        'EGP Debit': '',
                        'EGP Credit': egpOutstanding.toLocaleString(),
                        'GBP Debit': '',
                        'GBP Credit': '',
                        'Date': '', 'Arrival': '', 'Departure': '', 'Customer Name': ''
                      });
                      rows.push({
                        'Transaction Type': '',
                        'Description': 'GBP Outstanding',
                        'EGP Debit': '',
                        'EGP Credit': '',
                        'GBP Debit': '',
                        'GBP Credit': gbpOutstanding.toLocaleString(),
                        'Date': '', 'Arrival': '', 'Departure': '', 'Customer Name': ''
                      });
                      return rows;
                    }}
                  />
                )}
                {getOwnerTransactions(details.invoices).length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Transaction Type</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">EGP Debit</TableCell>
                          <TableCell align="right">EGP Credit</TableCell>
                          <TableCell align="right">GBP Debit</TableCell>
                          <TableCell align="right">GBP Credit</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Arrival</TableCell>
                          <TableCell>Departure</TableCell>
                          <TableCell>Customer Name</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getOwnerTransactions(details.invoices).map((invoice: any) => {
                          let egpDebit = '', egpCredit = '', gbpDebit = '', gbpCredit = '';
                          if (invoice.currency === 'EGP') {
                            if (invoice.type === 'Payment') egpCredit = invoice.amount;
                            else egpDebit = invoice.amount;
                          } else if (invoice.currency === 'GBP') {
                            if (invoice.type === 'Payment') gbpCredit = invoice.amount;
                            else gbpDebit = invoice.amount;
                          }
                          // Customer name logic
                          const customerName = getCustomerName(invoice, details);
                          return (
                            <TableRow key={invoice.id}>
                              <TableCell>{invoice.type}</TableCell>
                              <TableCell>{invoice.description || '-'}</TableCell>
                              <TableCell align="right">{egpDebit ? egpDebit.toLocaleString() : ''}</TableCell>
                              <TableCell align="right">{egpCredit ? egpCredit.toLocaleString() : ''}</TableCell>
                              <TableCell align="right">{gbpDebit ? gbpDebit.toLocaleString() : ''}</TableCell>
                              <TableCell align="right">{gbpCredit ? gbpCredit.toLocaleString() : ''}</TableCell>
                              <TableCell>{formatDate(invoice.date)}</TableCell>
                              <TableCell>{invoice.booking_arrival_date ? formatDate(invoice.booking_arrival_date) : ''}</TableCell>
                              <TableCell>{invoice.booking_departure_date ? formatDate(invoice.booking_departure_date) : ''}</TableCell>
                              <TableCell>{customerName}</TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Totals Row */}
                        {(() => {
                          const rows = getOwnerTransactions(details.invoices).map((invoice: any) => {
                            let egpDebit = 0, egpCredit = 0, gbpDebit = 0, gbpCredit = 0;
                            if (invoice.currency === 'EGP') {
                              if (invoice.type === 'Payment') egpCredit = invoice.amount;
                              else egpDebit = invoice.amount;
                            } else if (invoice.currency === 'GBP') {
                              if (invoice.type === 'Payment') gbpCredit = invoice.amount;
                              else gbpDebit = invoice.amount;
                            }
                            return { egpDebit, egpCredit, gbpDebit, gbpCredit };
                          });
                          const totalEgpDebit = rows.reduce((sum, r) => sum + (r.egpDebit || 0), 0);
                          const totalEgpCredit = rows.reduce((sum, r) => sum + (r.egpCredit || 0), 0);
                          const totalGbpDebit = rows.reduce((sum, r) => sum + (r.gbpDebit || 0), 0);
                          const totalGbpCredit = rows.reduce((sum, r) => sum + (r.gbpCredit || 0), 0);
                          const egpOutstanding = totalEgpCredit - totalEgpDebit;
                          const gbpOutstanding = totalGbpCredit - totalGbpDebit;
                          return <>
                            <TableRow sx={{ backgroundColor: '#f0f4ff', fontWeight: 'bold' }}>
                              <TableCell><strong>Total</strong></TableCell>
                              <TableCell align="right"><strong>{totalEgpDebit ? totalEgpDebit.toLocaleString() : ''}</strong></TableCell>
                              <TableCell align="right"><strong>{totalEgpCredit ? totalEgpCredit.toLocaleString() : ''}</strong></TableCell>
                              <TableCell align="right"><strong>{totalGbpDebit ? totalGbpDebit.toLocaleString() : ''}</strong></TableCell>
                              <TableCell align="right"><strong>{totalGbpCredit ? totalGbpCredit.toLocaleString() : ''}</strong></TableCell>
                              <TableCell colSpan={4}></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>EGP Outstanding</strong></TableCell>
                              <TableCell colSpan={4} align="left"><strong>{egpOutstanding.toLocaleString()}</strong></TableCell>
                              <TableCell colSpan={4}></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>GBP Outstanding</strong></TableCell>
                              <TableCell colSpan={4} align="left"><strong>{gbpOutstanding.toLocaleString()}</strong></TableCell>
                              <TableCell colSpan={4}></TableCell>
                            </TableRow>
                          </>;
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      {details.invoices.length > 0
                        ? 'No owner transactions found for this apartment. Showing all transactions.'
                        : 'No transactions found for this apartment.'}
              </Typography>
                  </Paper>
                )}
        </CardContent>
      </Card>
          </>
        ) : null}
    </Box>
    </LocalizationProvider>
  );
};

export default InvoiceDetails; 