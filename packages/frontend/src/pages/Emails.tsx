import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Container
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon,
  Email as EmailIcon,
  FilterList as FilterListIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { emailService } from '../services/emailService';
import type { Email, UIEmailType, BackendEmailType } from '../services/emailService';
import { apartmentService } from '../services/apartmentService';
import type { Apartment } from '../services/apartmentService';
import { format, parseISO } from 'date-fns';
import ExportButtons from '../components/ExportButtons';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

export default function Emails() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Check admin access
  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      navigate('/unauthorized');
    }
  }, [currentUser?.role, navigate]);

  // State
  const [emails, setEmails] = useState<Email[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [villages, setVillages] = useState<any[]>([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [availablePhases, setAvailablePhases] = useState<number[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchParams.get('search') || '');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [apartmentFilter, setApartmentFilter] = useState(searchParams.get('apartment') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [bookingFilter, setBookingFilter] = useState(searchParams.get('booking') || '');
  const [dateFromFilter, setDateFromFilter] = useState(searchParams.get('dateFrom') || '');
  const [dateToFilter, setDateToFilter] = useState(searchParams.get('dateTo') || '');
  const [fromFilter, setFromFilter] = useState(searchParams.get('from') || '');
  const [toFilter, setToFilter] = useState(searchParams.get('to') || '');
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    limit: 20,
    total: 0,
    total_pages: 0
  });
  
  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    email: Email | null;
  }>({
    open: false,
    email: null
  });
  const [deleting, setDeleting] = useState(false);

  // Load apartments for filtering
  useEffect(() => {
    const loadApartments = async () => {
      try {
        const apartmentsData = await apartmentService.getApartments({ limit: 100 });
        setApartments(apartmentsData.data);
      } catch (err) {
        console.error('Failed to load apartments:', err);
      }
    };

    loadApartments();
  }, []);

  // Load villages for filtering
  useEffect(() => {
    const loadVillages = async () => {
      try {
        const villagesData = await apartmentService.getApartments({ limit: 1 }); // Just to get the structure
        const villagesList = await import('../services/villageService').then(m => m.villageService.getVillages());
        setVillages(villagesList.data);
      } catch (err) {
        // ignore
      }
    };
    loadVillages();
  }, []);

  // Load emails
  useEffect(() => {
    const loadEmails = async () => {
      try {
        setLoading(true);
        const filters = {
          page: pagination.page,
          limit: pagination.limit,
          search: debouncedSearchTerm || undefined,
          apartment_id: apartmentFilter ? parseInt(apartmentFilter) : undefined,
          type: typeFilter ? (emailService.mapUITypeToBackend(typeFilter as UIEmailType)) : undefined,
          status: (statusFilter as 'pending' | 'completed') || undefined,
          booking_id: bookingFilter ? parseInt(bookingFilter) : undefined,
          date_from: dateFromFilter || undefined,
          date_to: dateToFilter || undefined,
          from: fromFilter || undefined,
          to: toFilter || undefined,
          sort_by: 'date',
          sort_order: 'desc' as const,
          village_id: projectFilter ? parseInt(projectFilter) : undefined
        };
        
        const response = await emailService.getEmails(filters);
        setEmails(response.data);
        setPagination(response.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load emails');
      } finally {
        setLoading(false);
      }
    };

    loadEmails();
  }, [pagination.page, debouncedSearchTerm, apartmentFilter, typeFilter, statusFilter, bookingFilter, dateFromFilter, dateToFilter, fromFilter, toFilter, projectFilter]);

  // Set up debounce for search term
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Reset pagination to page 1 when search term changes
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500); // 500ms debounce delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (apartmentFilter) params.set('apartment', apartmentFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (bookingFilter) params.set('booking', bookingFilter);
    if (dateFromFilter) params.set('dateFrom', dateFromFilter);
    if (dateToFilter) params.set('dateTo', dateToFilter);
    if (fromFilter) params.set('from', fromFilter);
    if (toFilter) params.set('to', toFilter);
    if (projectFilter) params.set('project', projectFilter);
    if (phaseFilter) params.set('phase', phaseFilter);
    if (pagination.page > 1) params.set('page', pagination.page.toString());
    
    setSearchParams(params);
  }, [searchTerm, apartmentFilter, typeFilter, statusFilter, bookingFilter, dateFromFilter, dateToFilter, fromFilter, toFilter, projectFilter, phaseFilter, pagination.page, setSearchParams]);

  // Update available phases when project changes
  useEffect(() => {
    if (projectFilter) {
      const selectedVillage = villages.find((v: any) => v.id === parseInt(projectFilter));
      if (selectedVillage) {
        const phaseNumbers = Array.from({ length: selectedVillage.phases || 0 }, (_, i) => i + 1);
        setAvailablePhases(phaseNumbers);
        if (phaseFilter && !phaseNumbers.includes(Number(phaseFilter))) {
          setPhaseFilter('');
        }
      } else {
        setAvailablePhases([]);
      }
    } else {
      const maxPhase = Math.max(...villages.map((v: any) => v.phases || 0), 0);
      setAvailablePhases(Array.from({ length: maxPhase }, (_, i) => i + 1));
    }
  }, [projectFilter, villages]);

  // Update filtered apartments when project or phase changes
  useEffect(() => {
    let filtered = [...apartments];
    if (projectFilter) {
      filtered = filtered.filter(apt => apt.village?.id === parseInt(projectFilter));
    }
    if (phaseFilter) {
      filtered = filtered.filter(apt => apt.phase === parseInt(phaseFilter));
    }
    setFilteredApartments(filtered);
    // Clear apartment filter if not in filtered list
    if (apartmentFilter && !filtered.some(apt => apt.id === parseInt(apartmentFilter))) {
      setApartmentFilter('');
    }
  }, [apartments, projectFilter, phaseFilter]);

  // Handle filter changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Don't set pagination page here since the debounced effect will trigger the API call
  };

  const handleApartmentFilterChange = (e: SelectChangeEvent) => {
    setApartmentFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleTypeFilterChange = (e: SelectChangeEvent) => {
    setTypeFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusFilterChange = (e: SelectChangeEvent) => {
    setStatusFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleBookingFilterChange = (e: SelectChangeEvent) => {
    setBookingFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDateFromFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFromFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDateToFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateToFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFromFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleToFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setApartmentFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setBookingFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setFromFilter('');
    setToFilter('');
    setProjectFilter('');
    setPhaseFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // Handle actions
  const handleCreateEmail = () => {
    navigate('/emails/new');
  };

  const handleEditEmail = (email: Email) => {
    navigate(`/emails/${email.id}/edit`);
  };

  const handleViewEmail = (email: Email) => {
    navigate(`/emails/${email.id}`);
  };

  const handleDeleteClick = (email: Email) => {
    setDeleteDialog({
      open: true,
      email
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.email) return;

    try {
      setDeleting(true);
      await emailService.deleteEmail(deleteDialog.email.id);
      // Refresh the emails list
      const filters = {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearchTerm || undefined,
        apartment_id: apartmentFilter ? parseInt(apartmentFilter) : undefined,
        type: typeFilter ? (emailService.mapUITypeToBackend(typeFilter as UIEmailType)) : undefined,
        status: (statusFilter as 'pending' | 'completed') || undefined,
        booking_id: bookingFilter ? parseInt(bookingFilter) : undefined,
        date_from: dateFromFilter || undefined,
        date_to: dateToFilter || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
        sort_by: 'date',
        sort_order: 'desc' as const,
        village_id: projectFilter ? parseInt(projectFilter) : undefined
      };
      const response = await emailService.getEmails(filters);
      setEmails(response.data);
      setPagination(response.pagination);
      setDeleteDialog({ open: false, email: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete email');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, email: null });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  // Get apartment name
  const getApartmentName = (apartmentId: number) => {
    const apartment = apartments.find(apt => apt.id === apartmentId);
    return apartment ? `${apartment.name} - ${apartment.village?.name}` : `Apartment ${apartmentId}`;
  };

  // Get status color
  const getStatusColor = (status: 'pending' | 'completed') => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get status display name
  const getStatusDisplayName = (status: 'pending' | 'completed') => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const handleRowClick = (email: Email) => {
    handleViewEmail(email);
  };

  if (loading && emails.length === 0) {
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
            Emails
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateEmail}
          >
            Create Email
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </Box>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', minHeight: 0 }}>
              <TextField
                label="Search emails"
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 100 }}
                size="small"
                margin="dense"
              />
              <FormControl sx={{ minWidth: 120 }} size="small" margin="dense">
                <InputLabel>Project</InputLabel>
                <Select
                  value={projectFilter}
                  onChange={e => {
                    setProjectFilter(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  label="Project"
                >
                  <MenuItem value="">All Projects</MenuItem>
                  {villages.map((v: any) => (
                    <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 100 }} size="small" margin="dense">
                <InputLabel>Phase</InputLabel>
                <Select
                  value={phaseFilter}
                  onChange={e => {
                    setPhaseFilter(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  label="Phase"
                >
                  <MenuItem value="">All Phases</MenuItem>
                  {availablePhases.map(phaseNum => (
                    <MenuItem key={phaseNum} value={phaseNum}>Phase {phaseNum}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 140 }} size="small" margin="dense">
                <InputLabel>Apartment</InputLabel>
                <Select
                  value={apartmentFilter}
                  onChange={handleApartmentFilterChange}
                  label="Apartment"
                >
                  <MenuItem value="">All Apartments</MenuItem>
                  {filteredApartments.map(apartment => (
                    <MenuItem key={apartment.id} value={apartment.id.toString()}>
                      {apartment.name} - {apartment.village?.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120 }} size="small" margin="dense">
                <InputLabel>Email Type</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={handleTypeFilterChange}
                  label="Email Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  {emailService.getEmailTypeOptions().map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 100 }} size="small" margin="dense">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="From Email"
                value={fromFilter}
                onChange={handleFromFilterChange}
                sx={{ minWidth: 100 }}
                size="small"
                margin="dense"
              />
              <TextField
                label="To Email"
                value={toFilter}
                onChange={handleToFilterChange}
                sx={{ minWidth: 100 }}
                size="small"
                margin="dense"
              />
              <DatePicker
                label="Date From"
                value={dateFromFilter ? new Date(dateFromFilter) : null}
                onChange={date => setDateFromFilter(date ? date.toISOString().split('T')[0] : '')}
                slotProps={{ textField: { size: 'small', sx: { minWidth: 110 }, margin: 'dense' } }}
              />
              <DatePicker
                label="Date To"
                value={dateToFilter ? new Date(dateToFilter) : null}
                onChange={date => setDateToFilter(date ? date.toISOString().split('T')[0] : '')}
                slotProps={{ textField: { size: 'small', sx: { minWidth: 110 }, margin: 'dense' } }}
              />
            </Box>
          </LocalizationProvider>
        </Paper>

        {/* Export Buttons */}
        <ExportButtons data={emails} columns={["id","apartment_id","booking_id","date","from","to","subject","type"]} excelFileName="emails.xlsx" pdfFileName="emails.pdf" />

        {/* Emails Table */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Apartment</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {emails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      {loading ? (
                        <CircularProgress size={24} />
                      ) : (
                        <Typography color="textSecondary">
                          No emails found
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  emails.map((email) => (
                    <TableRow 
                      key={email.id} 
                      hover
                      onClick={() => handleRowClick(email)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        {formatDate(email.date)}
                      </TableCell>
                      <TableCell>
                        {email.from}
                      </TableCell>
                      <TableCell>
                        {email.to}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {email.subject}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={emailService.getEmailTypeDisplayName(email.type)}
                          color={emailService.getEmailTypeColor(email.type)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusDisplayName(email.status)}
                          color={getStatusColor(email.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {email.apartment?.name || getApartmentName(email.apartment_id)}
                        </Typography>
                        {email.apartment?.village && (
                          <Typography variant="caption" color="textSecondary">
                            {email.apartment.village.name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewEmail(email);
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEmail(email);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(email);
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
              />
            </Box>
          )}
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Email</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this email? This action cannot be undone.
            </DialogContentText>
            {deleteDialog.email && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>From:</strong> {deleteDialog.email.from}
                </Typography>
                <Typography variant="body2">
                  <strong>To:</strong> {deleteDialog.email.to}
                </Typography>
                <Typography variant="body2">
                  <strong>Subject:</strong> {deleteDialog.email.subject}
                </Typography>
                <Typography variant="body2">
                  <strong>Date:</strong> {formatDate(deleteDialog.email.date)}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} disabled={deleting}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}