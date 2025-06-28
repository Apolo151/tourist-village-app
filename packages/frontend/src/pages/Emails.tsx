import { useState, useEffect } from 'react';
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
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [apartmentFilter, setApartmentFilter] = useState(searchParams.get('apartment') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  
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

  // Load emails
  useEffect(() => {
    const loadEmails = async () => {
      try {
        setLoading(true);
        const filters = {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm || undefined,
          apartment_id: apartmentFilter ? parseInt(apartmentFilter) : undefined,
          type: typeFilter ? (emailService.mapUITypeToBackend(typeFilter as UIEmailType)) : undefined,
          sort_by: 'date',
          sort_order: 'desc' as const
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
  }, [pagination.page, searchTerm, apartmentFilter, typeFilter]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (apartmentFilter) params.set('apartment', apartmentFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (pagination.page > 1) params.set('page', pagination.page.toString());
    
    setSearchParams(params);
  }, [searchTerm, apartmentFilter, typeFilter, pagination.page, setSearchParams]);

  // Handle filter changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleApartmentFilterChange = (e: SelectChangeEvent) => {
    setApartmentFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleTypeFilterChange = (e: SelectChangeEvent) => {
    setTypeFilter(e.target.value);
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
        search: searchTerm || undefined,
        apartment_id: apartmentFilter ? parseInt(apartmentFilter) : undefined,
        type: typeFilter ? (emailService.mapUITypeToBackend(typeFilter as UIEmailType)) : undefined,
        sort_by: 'date',
        sort_order: 'desc' as const
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
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Filters
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
              sx={{ minWidth: 300 }}
            />
            
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Apartment</InputLabel>
              <Select
                value={apartmentFilter}
                onChange={handleApartmentFilterChange}
                label="Apartment"
              >
                <MenuItem value="">All Apartments</MenuItem>
                {apartments.map(apartment => (
                  <MenuItem key={apartment.id} value={apartment.id.toString()}>
                    {apartment.name} - {apartment.village?.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 180 }}>
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
          </Box>
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
                  <TableCell>Apartment</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {emails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
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
                    <TableRow key={email.id} hover>
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
                              onClick={() => handleViewEmail(email)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleEditEmail(email)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(email)}
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