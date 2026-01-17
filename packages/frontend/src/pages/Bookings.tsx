import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Pagination,
  Container,
  Grid,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  FilterAlt as FilterIcon,
  FilterList as FilterListIcon,
  ClearAll as ClearIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  FileDownloadOutlined as DownloadIcon,
  PictureAsPdfOutlined as PdfIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { bookingService } from '../services/bookingService';
import type { BookingFilters } from '../services/bookingService';
import { apartmentService } from '../services/apartmentService';
import { villageService } from '../services/villageService';
import type { Apartment, Village } from '../types';
import type { Booking } from '../services/bookingService';
import ExportButtons from '../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

// Booking status colors
const statusColors: Record<string, 'info' | 'success' | 'default' | 'error'> = {
  Booked: 'info',
  'Checked In': 'success',
  'Checked Out': 'default',
  Cancelled: 'error'
};

interface BookingFilter {
  searchTerm: string;
  apartmentId: string;
  state: string;
  village: string;
  phase: string;
  userType: string;
  arrivalDateStart: Date | null;
  arrivalDateEnd: Date | null;
  leavingDateStart: Date | null;
  leavingDateEnd: Date | null;
}

export default function Bookings() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Default to oldest first
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0
  });
  
  // Tab state (0: Current & Upcoming, 1: Past, 2: All)
  const [tabValue, setTabValue] = useState<number>(0);
  
  // Filter state
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [searchInput, setSearchInput] = useState<string>('');
  const [filters, setFilters] = useState<BookingFilter>({
    searchTerm: '',
    apartmentId: '',
    state: '',
    village: '',
    phase: '',
    userType: '',
    arrivalDateStart: null,
    arrivalDateEnd: null,
    leavingDateStart: null,
    leavingDateEnd: null
  });

  // Export state
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [exportingData, setExportingData] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load bookings when filters, pagination, sort order, or tab changes
  useEffect(() => {
    if (apartments.length > 0) {
      loadBookings();
    }
  }, [tabValue, pagination.page, filters, apartments.length, searchInput, sortOrder]);

  // Reset apartment filter when project or phase changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, apartmentId: '' }));
  }, [filters.village, filters.phase]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const [apartmentsResult, villagesResult] = await Promise.all([
        apartmentService.getAllApartmentsForDropdown(),
        villageService.getVillages({ limit: 100 })
      ]);

      setApartments(apartmentsResult.map(apartment => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { village, owner, ...rest } = apartment;
        return {
          ...rest,
          purchase_date: apartment.purchase_date ?? '',
          paying_status:
            apartment.paying_status === 'transfer' ? 'paid_by_transfer' :
            apartment.paying_status === 'rent' ? 'paid_by_rent' :
            'non_payer',
          village: undefined,
          owner: undefined
        } as unknown as Apartment;
      }));
      setVillages(villagesResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError('');

      // Build API filters
      const apiFilters: BookingFilters = buildApiFilters(true);

      const response = await bookingService.getBookings(apiFilters);
      setBookings(response.bookings);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        total_pages: response.total_pages
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = async (bookingId: number) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) {
      return;
    }

    try {
      await bookingService.deleteBooking(bookingId);
      // Reload bookings
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete booking');
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleSelectChange = (event: SelectChangeEvent, filterName: keyof BookingFilter) => {
    setFilters(prev => ({ ...prev, [filterName]: event.target.value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleDateChange = (date: Date | null, filterName: keyof BookingFilter) => {
    setFilters(prev => ({ ...prev, [filterName]: date }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleBookingClick = (id: number) => {
    navigate(`/bookings/${id}`);
  };

  const handleEditBooking = (id: number) => {
    navigate(`/bookings/${id}/edit`);
  };

  const handleCreateBooking = () => {
    navigate('/bookings/create');
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const buildApiFilters = (includePagination: boolean): BookingFilters => {
    const apiFilters: BookingFilters = {
      sort_by: 'arrival_date',
      sort_order: sortOrder
    };

    if (includePagination) {
      apiFilters.page = pagination.page;
      apiFilters.limit = pagination.limit;
    }

    const today = new Date().toISOString().split('T')[0];
    if (tabValue === 0) {
      apiFilters.leaving_date_start = today;
    } else if (tabValue === 1) {
      apiFilters.leaving_date_end = today;
    }

    if (searchInput) {
      apiFilters.search = searchInput;
    }
    if (filters.apartmentId) {
      apiFilters.apartment_id = parseInt(filters.apartmentId);
    }
    if (filters.state) {
      apiFilters.status = filters.state as 'Booked' | 'Checked In' | 'Checked Out' | 'Cancelled';
    }
    if (filters.village) {
      const village = villages.find(v => v.name === filters.village);
      if (village) {
        apiFilters.village_id = village.id;
      }
    }
    if (filters.phase) {
      apiFilters.phase = Number(filters.phase);
    }
    if (filters.userType) {
      const userTypeMap: Record<string, 'owner' | 'renter'> = {
        'Owner': 'owner',
        'Tenant': 'renter',
        'Renter': 'renter',
        'owner': 'owner',
        'renter': 'renter'
      };
      apiFilters.user_type = userTypeMap[filters.userType] || 'owner';
    }
    // Format dates without timezone conversion using date-fns
    // This prevents the issue where .toISOString() shifts dates backward for UTC+ timezones
    if (filters.arrivalDateStart) {
      apiFilters.arrival_date_start = format(filters.arrivalDateStart, 'yyyy-MM-dd');
    }
    if (filters.arrivalDateEnd) {
      apiFilters.arrival_date_end = format(filters.arrivalDateEnd, 'yyyy-MM-dd');
    }
    if (filters.leavingDateStart) {
      apiFilters.leaving_date_start = format(filters.leavingDateStart, 'yyyy-MM-dd');
    }
    if (filters.leavingDateEnd) {
      apiFilters.leaving_date_end = format(filters.leavingDateEnd, 'yyyy-MM-dd');
    }

    return apiFilters;
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      searchTerm: '',
      apartmentId: '',
      state: '',
      village: '',
      phase: '',
      userType: '',
      arrivalDateStart: null,
      arrivalDateEnd: null,
      leavingDateStart: null,
      leavingDateEnd: null
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };
  
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'Booked':
        return 'Booked';
      case 'Checked In':
        return 'Checked In';
      case 'Checked Out':
        return 'Checked Out';
      case 'Cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getUserTypeDisplay = (userType: string) => {
    switch (userType) {
      case 'Owner':
      case 'owner':
        return 'Owner';
      case 'Renter':
      case 'renter':
        return 'Tenant';
      default:
        return userType;
    }
  };

  // Data transformer for export
  const transformBookingsForExport = (bookingsData: Booking[]) => {
    return bookingsData.map(booking => ({
      id: booking.id,
      apartment: booking.apartment?.name || 'Unknown',
      village: booking.apartment?.village?.name || 'Unknown',
      phase: booking.apartment?.phase || 'Unknown',
      user: booking.user?.name || 'Unknown',
      user_type: getUserTypeDisplay(booking.user_type),
      number_of_people: booking.number_of_people,
      arrival_date: formatDate(booking.arrival_date),
      leaving_date: formatDate(booking.leaving_date),
      reservation_date: formatDate(booking.created_at),
      status: getStatusDisplayName(booking.status),
      notes: booking.notes || ''
    }));
  };

  const getExportData = async () => {
    if (exportScope === 'current') {
      return transformBookingsForExport(bookings);
    }
    const filters = buildApiFilters(false);
    const data = await bookingService.exportBookingsData(filters);
    return data.map(item => ({
      ...item,
      arrival_date: formatDate(item.arrival_date),
      leaving_date: formatDate(item.leaving_date),
      reservation_date: formatDate(item.reservation_date)
    }));
  };

  const handleExportExcel = async () => {
    try {
      setExportingData(true);
      setError('');
      const data = await getExportData();
      exportToExcel(data, 'bookings.xlsx', undefined);
    } catch (err: any) {
      setError(err?.message || 'Failed to export bookings');
    } finally {
      setExportingData(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportingData(true);
      setError('');
      const data = await getExportData();
      exportToPDF(
        data,
        ["id","apartment","village","phase","user","user_type","number_of_people","arrival_date","leaving_date","reservation_date","status","notes"],
        'bookings.pdf',
        undefined
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to export bookings');
    } finally {
      setExportingData(false);
    }
  };

  // Compute available phases for the selected village
  const selectedVillage = villages.find(v => v.name === filters.village);
  
  // Pre-compute selected village ID to avoid repeated lookups and handle undefined properly
  // This prevents the issue where village lookup returns undefined and falls back to -1 (which matches no apartments)
  const selectedVillageId = filters.village 
    ? villages.find(v => v.name === filters.village)?.id 
    : null;

  // Get apartments that belong to the selected village
  const villageApartments = selectedVillageId
    ? apartments.filter(apt => apt.village_id === selectedVillageId)
    : [];

  // Compute available phases based on ACTUAL apartment data, not just village configuration
  // This ensures we only show phases that have at least one apartment, preventing
  // empty dropdown results when user selects a phase with no apartments
  const availablePhases = selectedVillage
    ? Array.from(
        // Create a Set of unique phase numbers from apartments in this village
        new Set(
          villageApartments
            .map(apt => Number(apt.phase))
            .filter(phase => !isNaN(phase) && phase > 0)
        )
      ).sort((a, b) => a - b)  // Sort phases numerically
    : [];

  // Filter apartments based on selected project and phase
  // Robust filtering that handles all cases:
  // 1. No village selected → show all apartments
  // 2. Village selected but not found → show no apartments (prevents stale data)
  // 3. Village selected → show only apartments in that village
  // 4. Village + phase selected → show only apartments in that village AND phase
  const filteredApartments = apartments.filter(apartment => {
    // Case 1: No village filter selected - show all apartments
    if (!filters.village) {
      return true;
    }
    
    // Case 2: Village filter set but village not found in data - show nothing
    // This prevents filtering by a stale/invalid village name
    if (!selectedVillageId) {
      return false;
    }
    
    // Case 3: Check if apartment belongs to selected village
    if (!apartment.village_id || apartment.village_id !== selectedVillageId) {
      return false;
    }
    
    // Case 4: If phase is also selected, must match both village AND phase
    // Use Number() on both sides to handle potential string/number type mismatches
    // from API responses or form values
    if (filters.phase) {
      const filterPhase = Number(filters.phase);
      const apartmentPhase = Number(apartment.phase);
      // If apartment.phase is undefined/null, Number() returns NaN
      // NaN !== filterPhase will be true, so apartment gets filtered out (correct behavior)
      if (apartmentPhase !== filterPhase) {
        return false;
      }
    }
    
    return true;
  });

  if (loading && !apartments.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ mt: 3 }}>
              Bookings
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateBooking}
            >
              Create a new Booking
            </Button>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Tabs and Filter Actions */}
          <Paper sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5 }}>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ minHeight: 0 }}>
              <Tab label="Current & Upcoming" sx={{ minHeight: 0 }} />
              <Tab label="Past" sx={{ minHeight: 0 }} />
              <Tab label="All" sx={{ minHeight: 0 }} />
            </Tabs>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title={`Sort by arrival date: ${sortOrder === 'asc' ? 'oldest to newest' : 'newest to oldest'}`}>
                <IconButton size="small" onClick={toggleSortOrder}>
                  {sortOrder === 'asc' ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Toggle Filters">
                <IconButton size="small" onClick={toggleFilters}>
                  <FilterIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterListIcon fontSize="small" />}
                onClick={clearFilters}
                sx={{ minWidth: 0, px: 1 }}
              >
                Clear
              </Button>
            </Box>
          </Paper>

          {/* Filters */}
          {showFilters && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 1 }}>
                <TextField
                  label="Search"
                  value={searchInput}
                  onChange={handleSearchChange}
                  placeholder="Search by user, apartment, notes..."
                  size="small"
                  margin="dense"
                  sx={{ minWidth: 140 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" margin="dense" sx={{ minWidth: 140 }}>
                  <InputLabel>Project</InputLabel>
                  <Select
                    value={filters.village}
                    label="Project"
                    onChange={(e) => handleSelectChange(e, 'village')}
                  >
                    <MenuItem value="">All Projects</MenuItem>
                    {villages.map(village => (
                      <MenuItem key={village.id} value={village.name}>{village.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" margin="dense" sx={{ minWidth: 110 }} disabled={!filters.village}>
                  <InputLabel>Phase</InputLabel>
                  <Select
                    value={filters.phase}
                    label="Phase"
                    onChange={(e) => handleSelectChange(e, 'phase')}
                  >
                    <MenuItem value="">All Phases</MenuItem>
                    {availablePhases.map(phase => (
                      <MenuItem key={phase} value={phase.toString()}>
                        Phase {phase}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" margin="dense" sx={{ minWidth: 140 }}>
                  <InputLabel>Apartment</InputLabel>
                  <Select
                    value={filters.apartmentId}
                    label="Apartment"
                    onChange={(e) => handleSelectChange(e, 'apartmentId')}
                  >
                    <MenuItem value="">All Apartments</MenuItem>
                    {filteredApartments.map(apartment => (
                      <MenuItem key={apartment.id} value={apartment.id.toString()}>
                        {apartment.name} {apartment.village_id && villages.find(v => v.id === apartment.village_id) ? `(${villages.find(v => v.id === apartment.village_id)?.name})` : ''}
                        {apartment.phase ? ` - Phase ${apartment.phase}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" margin="dense" sx={{ minWidth: 110 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.state}
                    label="Status"
                    onChange={(e) => handleSelectChange(e, 'state')}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="Booked">Booked</MenuItem>
                    <MenuItem value="Checked In">Checked In</MenuItem>
                    <MenuItem value="Checked Out">Checked Out</MenuItem>
                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" margin="dense" sx={{ minWidth: 110 }}>
                  <InputLabel>User Type</InputLabel>
                  <Select
                    value={filters.userType}
                    label="User Type"
                    onChange={(e) => handleSelectChange(e, 'userType')}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="owner">Owner</MenuItem>
                    <MenuItem value="renter">Tenant</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mt: 1 }}>
                <DatePicker
                  label="Arrival From"
                  value={filters.arrivalDateStart}
                  onChange={(date) => handleDateChange(date, 'arrivalDateStart')}
                  slotProps={{ textField: { size: 'small', margin: 'dense', sx: { minWidth: 120 } } }}
                  format="dd/MM/yyyy"
                />
                <DatePicker
                  label="Arrival To"
                  value={filters.arrivalDateEnd}
                  onChange={(date) => handleDateChange(date, 'arrivalDateEnd')}
                  slotProps={{ textField: { size: 'small', margin: 'dense', sx: { minWidth: 120 } } }}
                  format="dd/MM/yyyy"
                />
                <DatePicker
                  label="Departure From"
                  value={filters.leavingDateStart}
                  onChange={(date) => handleDateChange(date, 'leavingDateStart')}
                  slotProps={{ textField: { size: 'small', margin: 'dense', sx: { minWidth: 120 } } }}
                  format="dd/MM/yyyy"
                />
                <DatePicker
                  label="Departure To"
                  value={filters.leavingDateEnd}
                  onChange={(date) => handleDateChange(date, 'leavingDateEnd')}
                  slotProps={{ textField: { size: 'small', margin: 'dense', sx: { minWidth: 120 } } }}
                  format="dd/MM/yyyy"
                />
              </Box>
            </Paper>
          )}

          {/* Export */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 0.5 }}>
                  Export scope
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  value={exportScope}
                  exclusive
                  onChange={(_, val) => val && setExportScope(val)}
                >
                  <ToggleButton value="current">Current view</ToggleButton>
                  <ToggleButton value="all">All filtered</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box sx={{ flexGrow: 1 }} />

              <ExportButtons
                data={transformBookingsForExport(bookings)}
                columns={["id","apartment","village","phase","user","user_type","number_of_people","arrival_date","leaving_date","reservation_date","status","notes"]}
                excelFileName="bookings.xlsx"
                pdfFileName="bookings.pdf"
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                disabled={exportingData}
                excelLabel={exportingData ? 'Exporting...' : 'Export to Excel'}
                pdfLabel={exportingData ? 'Exporting...' : 'Export to PDF'}
                excelIcon={!exportingData ? <DownloadIcon /> : undefined}
                pdfIcon={!exportingData ? <PdfIcon /> : undefined}
                size="medium"
                variant="contained"
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Current view exports only the visible page; All filtered exports every matching booking.
            </Typography>
          </Paper>

          {/* Bookings Table */}
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {/* <TableCell>Booking ID</TableCell> */}
                    <TableCell>User Name</TableCell>
                    <TableCell>User Type</TableCell>
                    <TableCell>Apartment</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Arrival DateTime
                        <Tooltip title={sortOrder === 'asc' ? "Oldest to newest" : "Newest to oldest"}>
                          <Box component="span" sx={{ ml: 0.5 }}>
                            {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                          </Box>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>Departure DateTime</TableCell>
                    <TableCell>Reservation Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>People</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && apartments.length > 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : bookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography color="text.secondary">
                          No bookings found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (bookings || []).map((booking) => (
                      <TableRow
                        key={booking.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleBookingClick(booking.id)}
                      >
                        {/* <TableCell>#{booking.id}</TableCell> */}
                        <TableCell>{booking.user?.name || 'Unknown User'}</TableCell>
                        <TableCell>
                          <Chip
                            label={getUserTypeDisplay(booking.user_type)}
                            size="small"
                            color={booking.user_type === 'owner' ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>
                          {booking.apartment?.name || 'Unknown Apartment'}
                          {booking.apartment?.village && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {booking.apartment.village.name}
                              {booking.apartment.phase && ` - Phase ${booking.apartment.phase}`}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(booking.arrival_date)}</TableCell>
                        <TableCell>{formatDate(booking.leaving_date)}</TableCell>
                        <TableCell>{formatDate(booking.created_at)}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusDisplayName(booking.status)}
                            size="small"
                            color={statusColors[booking.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>{booking.number_of_people}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBookingClick(booking.id);
                                }}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Booking">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditBooking(booking.id);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Booking">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBooking(booking.id);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <Pagination
                  count={pagination.total_pages}
                  page={pagination.page}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </Paper>

          {/* Summary */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {bookings.length} of {pagination.total} bookings
            </Typography>
            {tabValue === 0 && (
              <Typography variant="body2" color="text.secondary">
                Default filter: Current and upcoming bookings only
              </Typography>
            )}
          </Box>
        </Box>
      </Container>
    </LocalizationProvider>
  );
}
