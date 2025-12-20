import React, { useEffect, useState, useRef } from 'react';
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
import { ArrowBack as ArrowBackIcon, KeyboardArrowDown as KeyboardArrowDownIcon } from '@mui/icons-material';
import ExportButtons from '../components/ExportButtons';

const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apartmentId = id ? Number(id) : undefined;
  const totalsRef = useRef<HTMLDivElement>(null);

  // Default date range: current year
  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  const lastDayOfYear = new Date(now.getFullYear(), 11, 31);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [fromDate, setFromDate] = useState<Date | null>(firstDayOfYear);
  const [toDate, setToDate] = useState<Date | null>(lastDayOfYear);
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
    const filters: any = { 
      date_to: format(beforeDate, 'yyyy-MM-dd'),
      include_renter: false  // Only owner transactions
    };
    try {
      const data = await invoiceService.getApartmentDetails(apartmentId, filters);
      // Server already filters to owner transactions, use totals directly
      setBeforeTotals({
        total_spent_egp: data.totals.total_money_spent.EGP,
        total_spent_gbp: data.totals.total_money_spent.GBP,
        total_requested_egp: data.totals.total_money_requested.EGP,
        total_requested_gbp: data.totals.total_money_requested.GBP
      });
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

  // Helper to convert server totals to the local format used in display
  const getServerTotals = () => {
    if (!details?.totals) return {
      total_spent_egp: 0,
      total_spent_gbp: 0,
      total_requested_egp: 0,
      total_requested_gbp: 0
    };
    return {
      total_spent_egp: details.totals.total_money_spent.EGP,
      total_spent_gbp: details.totals.total_money_spent.GBP,
      total_requested_egp: details.totals.total_money_requested.EGP,
      total_requested_gbp: details.totals.total_money_requested.GBP
    };
  };

  // Helper function for customer name logic
  function getCustomerName(invoice: any, details: any) {
    // For owner transactions, show person_name or owner_name
    return invoice.person_name || invoice.owner_name || details.apartment.owner_name || '-';
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
            format="dd/MM/yyyy"
          />
          <DatePicker
            label="To"
            value={toDate}
            onChange={setToDate}
            slotProps={{ textField: { size: 'small' } }}
            format="dd/MM/yyyy"
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
              const currentTotals = getServerTotals();
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
            <Box>
              <Typography variant="body2" color="text.secondary">Phase</Typography>
              <Typography variant="body1">{details.apartment.phase ? `Phase ${details.apartment.phase}` : '-'}</Typography>
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
                    const totals = getServerTotals();
                    return (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
                          <Typography variant="subtitle2" color="error.main">Money Spent</Typography>
                          <Typography>
                            {totals.total_spent_egp > 0 && `${totals.total_spent_egp.toLocaleString()} EGP`}
                            {totals.total_spent_egp > 0 && totals.total_spent_gbp > 0 && ' / '}
                            {totals.total_spent_gbp > 0 && `${totals.total_spent_gbp.toLocaleString()} GBP`}
                            {totals.total_spent_egp === 0 && totals.total_spent_gbp === 0 && '-'}
              </Typography>
            </Box>
            <Box>
                          <Typography variant="subtitle2" color="success.main">Total Outstanding</Typography>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Owner Transactions</Typography>
                  {details.invoices.length > 0 && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<KeyboardArrowDownIcon />}
                      onClick={() => {
                        totalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      Go to Totals
                    </Button>
                  )}
                </Box>
                {/* Export Buttons */}
                {details.invoices.length > 0 && (
                  <ExportButtons
                    data={[...details.invoices].reverse()}
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
                      const egpOutstanding = totalEgpDebit - totalEgpCredit;
                      const gbpOutstanding = totalGbpDebit - totalGbpCredit;
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
                {details.invoices.length > 0 ? (
                  <TableContainer component={Paper} sx={{ mt: 2, border: 1, borderColor: 'divider' }}>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { px: 2, py: 1.5, borderRight: 1, borderColor: 'divider' }, '& .MuiTableCell-root:last-child': { borderRight: 0 } }}>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 120, borderBottom: 2, borderColor: 'primary.main' }}>Transaction Type</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 200, borderBottom: 2, borderColor: 'primary.main' }}>Description</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 100, borderBottom: 2, borderColor: 'primary.main' }}>EGP Debit</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 100, borderBottom: 2, borderColor: 'primary.main' }}>EGP Credit</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 100, borderBottom: 2, borderColor: 'primary.main' }}>GBP Debit</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 100, borderBottom: 2, borderColor: 'primary.main' }}>GBP Credit</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 100, borderBottom: 2, borderColor: 'primary.main' }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 100, borderBottom: 2, borderColor: 'primary.main' }}>Arrival</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 100, borderBottom: 2, borderColor: 'primary.main' }}>Departure</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 150, borderBottom: 2, borderColor: 'primary.main' }}>Customer Name</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...details.invoices].reverse().map((invoice: any) => {
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
                            <TableRow 
                              key={invoice.id}
                              sx={{ 
                                '&:hover': { backgroundColor: '#fafafa' },
                                '&:nth-of-type(even)': { backgroundColor: '#f9f9f9' }
                              }}
                            >
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{invoice.type}</TableCell>
                              <TableCell>{invoice.description || '-'}</TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace', color: egpDebit ? 'success.main' : 'inherit' }}>
                                {egpDebit ? egpDebit.toLocaleString() : ''}
                              </TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace', color: egpCredit ? 'error.main' : 'inherit' }}>
                                {egpCredit ? egpCredit.toLocaleString() : ''}
                              </TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace', color: gbpDebit ? 'success.main' : 'inherit' }}>
                                {gbpDebit ? gbpDebit.toLocaleString() : ''}
                              </TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace', color: gbpCredit ? 'error.main' : 'inherit' }}>
                                {gbpCredit ? gbpCredit.toLocaleString() : ''}
                              </TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(invoice.date)}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{invoice.booking_arrival_date ? formatDate(invoice.booking_arrival_date) : ''}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{invoice.booking_departure_date ? formatDate(invoice.booking_departure_date) : ''}</TableCell>
                              <TableCell>{customerName}</TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Totals Row */}
                        <div ref={totalsRef} />
                        {(() => {
                          const rows = details.invoices.map((invoice: any) => {
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
                          const totalEgpDebit = rows.reduce((sum: number, r: any) => sum + (r.egpDebit || 0), 0);
                          const totalEgpCredit = rows.reduce((sum: number, r: any) => sum + (r.egpCredit || 0), 0);
                          const totalGbpDebit = rows.reduce((sum: number, r: any) => sum + (r.gbpDebit || 0), 0);
                          const totalGbpCredit = rows.reduce((sum: number, r: any) => sum + (r.gbpCredit || 0), 0);
                          const egpOutstanding = totalEgpDebit - totalEgpCredit;
                          const gbpOutstanding = totalGbpDebit - totalGbpCredit;
                          return <>
                            <TableRow sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold', borderTop: 2, borderColor: 'primary.main' }}>
                              <TableCell colSpan={2}><strong>Total</strong></TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                                <strong>{totalEgpDebit ? totalEgpDebit.toLocaleString() : ''}</strong>
                              </TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                                <strong>{totalEgpCredit ? totalEgpCredit.toLocaleString() : ''}</strong>
                              </TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                                <strong>{totalGbpDebit ? totalGbpDebit.toLocaleString() : ''}</strong>
                              </TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                                <strong>{totalGbpCredit ? totalGbpCredit.toLocaleString() : ''}</strong>
                              </TableCell>
                              <TableCell colSpan={4}></TableCell>
                            </TableRow>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                              <TableCell><strong>EGP Outstanding</strong></TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', color: egpOutstanding >= 0 ? 'success.main' : 'error.main' }}>
                                <strong>{egpOutstanding.toLocaleString()}</strong>
                              </TableCell>
                              <TableCell colSpan={8}></TableCell>
                            </TableRow>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                              <TableCell><strong>GBP Outstanding</strong></TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', color: gbpOutstanding >= 0 ? 'success.main' : 'error.main' }}>
                                <strong>{gbpOutstanding.toLocaleString()}</strong>
                              </TableCell>
                              <TableCell colSpan={8}></TableCell>
                            </TableRow>
                          </>;
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      No owner transactions found for this apartment.
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