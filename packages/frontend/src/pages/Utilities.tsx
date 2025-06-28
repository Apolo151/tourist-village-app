import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Paper,
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
  Chip,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Pagination,
  Grid,
  Card,
  CardContent,
  Divider,
  Container
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { utilityReadingService } from '../services/utilityReadingService';
import type { UtilityReading, UtilityReadingFilters } from '../services/utilityReadingService';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { bookingService } from '../services/bookingService';
import type { Booking } from '../services/bookingService';
import ExportButtons from '../components/ExportButtons';
import { format, parseISO } from 'date-fns';

const UTILITY_TYPES = [
  { value: 'water', label: 'Water' },
  { value: 'electricity', label: 'Electricity' }
];

const WHO_PAYS_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'renter', label: 'Renter' },
  { value: 'company', label: 'Company' }
];

export default function Utilities() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data
  const [utilityReadings, setUtilityReadings] = useState<UtilityReading[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1
  });
  
  // Filters
  const [filters, setFilters] = useState<UtilityReadingFilters>({
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [readingToDelete, setReadingToDelete] = useState<UtilityReading | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);

  // Handle success message from URL params
  useEffect(() => {
    const successMessage = searchParams.get('message');
    if (successMessage) {
      setSuccess(decodeURIComponent(successMessage));
      // Clear the URL params
      navigate('/utilities', { replace: true });
    }
  }, [searchParams, navigate]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const [utilityResult, apartmentsResult, bookingsResult] = await Promise.all([
          utilityReadingService.getUtilityReadings(filters),
          apartmentService.getApartments({ limit: 100 }),
          bookingService.getBookings({ limit: 100 })
        ]);
        
        setUtilityReadings(utilityResult.data);
        setPagination(utilityResult.pagination);
        setApartments(apartmentsResult.data);
        setBookings(bookingsResult.bookings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters]);

  const handleFilterChange = (key: keyof UtilityReadingFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
      page: 1 // Reset to first page when filtering
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'desc'
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setFilters(prev => ({ ...prev, page: value }));
  };

  const handleDeleteClick = (reading: UtilityReading) => {
    setReadingToDelete(reading);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!readingToDelete) return;

    try {
      setDeleting(readingToDelete.id);
      await utilityReadingService.deleteUtilityReading(readingToDelete.id);
      setSuccess('Utility reading deleted successfully');
      setUtilityReadings(prev => prev.filter(reading => reading.id !== readingToDelete.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete utility reading');
    } finally {
      setDeleting(null);
      setDeleteDialogOpen(false);
      setReadingToDelete(null);
    }
  };

  const getUtilityTypesDisplay = (reading: UtilityReading): string[] => {
    const types: string[] = [];
    if (reading.water_start_reading !== undefined || reading.water_end_reading !== undefined) {
      types.push('Water');
    }
    if (reading.electricity_start_reading !== undefined || reading.electricity_end_reading !== undefined) {
      types.push('Electricity');
    }
    return types;
  };

  const calculateBill = (reading: UtilityReading, utilityType: 'water' | 'electricity') => {
    const village = reading.apartment?.village;
    if (!village) return null;

    let startReading: number | undefined;
    let endReading: number | undefined;
    let unitPrice: number;

    if (utilityType === 'water') {
      startReading = reading.water_start_reading;
      endReading = reading.water_end_reading;
      unitPrice = village.water_price;
    } else {
      startReading = reading.electricity_start_reading;
      endReading = reading.electricity_end_reading;
      unitPrice = village.electricity_price;
    }

    if (startReading === undefined || endReading === undefined || endReading <= startReading) {
      return null;
    }

    const consumption = endReading - startReading;
    return {
      consumption,
      cost: consumption * unitPrice
    };
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  // Data transformer for export
  const transformUtilitiesForExport = (utilitiesData: UtilityReading[]) => {
    return utilitiesData.map(utility => ({
      id: utility.id,
      apartment: utility.apartment?.name || 'Unknown',
      village: utility.apartment?.village?.name || 'Unknown',
      water_start_reading: utility.water_start_reading || '',
      water_end_reading: utility.water_end_reading || '',
      electricity_start_reading: utility.electricity_start_reading || '',
      electricity_end_reading: utility.electricity_end_reading || '',
      start_date: formatDate(utility.start_date),
      end_date: formatDate(utility.end_date),
      who_pays: utility.who_pays,
      booking_user: utility.booking?.user?.name || 'No booking',
      created_by: utility.created_by_user?.name || 'Unknown'
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
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ mt: 3 }}>
            Utility Readings
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/utilities/new')}
          >
            Add New Reading
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Filters</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Apartment</InputLabel>
                <Select
                  value={filters.apartment_id || ''}
                  label="Apartment"
                  onChange={(e) => handleFilterChange('apartment_id', e.target.value ? parseInt(e.target.value as unknown as string) : undefined)}
                >
                  <MenuItem value="">All Apartments</MenuItem>
                  {apartments.map(apartment => (
                    <MenuItem key={apartment.id} value={apartment.id}>
                      {apartment.name} ({apartment.village?.name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Booking</InputLabel>
                <Select
                  value={filters.booking_id || ''}
                  label="Booking"
                  onChange={(e) => handleFilterChange('booking_id', e.target.value ? parseInt(e.target.value as unknown as string) : undefined)}
                >
                  <MenuItem value="">All Bookings</MenuItem>
                  {(bookings || []).map(booking => (
                    <MenuItem key={booking.id} value={booking.id}>
                      {booking.apartment?.name} - {booking.user?.name} ({utilityReadingService.formatDate(booking.arrival_date)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Who Pays</InputLabel>
                <Select
                  value={filters.who_pays || ''}
                  label="Who Pays"
                  onChange={(e) => handleFilterChange('who_pays', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {WHO_PAYS_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                variant="outlined"
                onClick={clearFilters}
                fullWidth
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Utility Types Info */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Utility Types</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {UTILITY_TYPES.map(type => (
              <Chip
                key={type.value}
                label={type.label}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Paper>

        {/* Export Buttons */}
        <ExportButtons data={transformUtilitiesForExport(utilityReadings)} columns={["id","apartment","village","water_start_reading","water_end_reading","electricity_start_reading","electricity_end_reading","start_date","end_date","who_pays","booking_user","created_by"]} excelFileName="utilities.xlsx" pdfFileName="utilities.pdf" />

        {/* Utility Readings Table */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Apartment</TableCell>
                  <TableCell>Booking</TableCell>
                  <TableCell>Utility Types</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Who Pays</TableCell>
                  <TableCell>Bill Summary</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {utilityReadings.map((reading) => {
                  const utilityTypes = getUtilityTypesDisplay(reading);
                  const waterBill = calculateBill(reading, 'water');
                  const electricityBill = calculateBill(reading, 'electricity');
                  
                  return (
                    <TableRow key={reading.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {reading.apartment?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {reading.apartment?.village?.name}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        {reading.booking ? (
                          <>
                            <Typography variant="body2">
                              {reading.booking.user?.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {utilityReadingService.formatDate(reading.booking.arrival_date)} - {utilityReadingService.formatDate(reading.booking.leaving_date)}
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No booking
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {utilityTypes.map(type => (
                            <Chip key={type} label={type} size="small" />
                          ))}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {utilityReadingService.formatDate(reading.start_date)}
                        </Typography>
                        <Typography variant="body2">
                          to {utilityReadingService.formatDate(reading.end_date)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={reading.who_pays}
                          color={utilityReadingService.getWhoPaysBadgeColor(reading.who_pays)}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ minWidth: 120 }}>
                          {waterBill && (
                            <Typography variant="caption" display="block">
                              💧 {waterBill.consumption} units = {waterBill.cost.toFixed(2)} EGP
                            </Typography>
                          )}
                          {electricityBill && (
                            <Typography variant="caption" display="block">
                              ⚡ {electricityBill.consumption} units = {electricityBill.cost.toFixed(2)} EGP
                            </Typography>
                          )}
                          {!waterBill && !electricityBill && (
                            <Typography variant="caption" color="text.secondary">
                              Incomplete readings
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/utilities/${reading.id}`)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/utilities/${reading.id}/edit`)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(reading)}
                              disabled={deleting === reading.id}
                            >
                              {deleting === reading.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <DeleteIcon />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {utilityReadings.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No utility readings found. Try adjusting your filters or add a new reading.
              </Typography>
            </Box>
          )}

          {pagination.total_pages > 1 && (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={pagination.total_pages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Utility Reading</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this utility reading for {readingToDelete?.apartment?.name}?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
} 