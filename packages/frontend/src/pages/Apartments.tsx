import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Pagination,
  IconButton,
  Tooltip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  ArrowDropDown as ArrowDropDownIcon, 
  ArrowDropUp as ArrowDropUpIcon, 
  FilterList as FilterListIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EventAvailable as BookingIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { apartmentService } from '../services/apartmentService';
import { villageService } from '../services/villageService';
import type { Apartment } from '../services/apartmentService';
import type { Village } from '../services/villageService';
import ExportButtons from '../components/ExportButtons';
import CreateBooking from './CreateBooking';

interface ApartmentWithBalance extends Apartment {
  balance?: {
    EGP: number;
    GBP: number;
  };
}

export default function Apartments() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Data state
  const [apartments, setApartments] = useState<ApartmentWithBalance[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [villageFilter, setVillageFilter] = useState<string>('');
  const [phaseFilter, setPhaseFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [payingStatusFilter, setPayingStatusFilter] = useState<string>('');
  
  // Sorting state
  const [orderBy, setOrderBy] = useState<string>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [apartmentToDelete, setApartmentToDelete] = useState<Apartment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Booking dialog state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingApartmentId, setBookingApartmentId] = useState<number | null>(null);

  // Check if user is admin or owner (both should see financial data)
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load apartments when filters change
  useEffect(() => {
    loadApartments();
  }, [page, orderBy, order, villageFilter, phaseFilter, statusFilter, payingStatusFilter, searchTerm]);

  // Check for success messages
  useEffect(() => {
    const success = searchParams.get('success');
    const message = searchParams.get('message');
    
    if (success && message) {
      console.log('Success:', decodeURIComponent(message));
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('success');
      newSearchParams.delete('message');
      navigate(`/apartments?${newSearchParams.toString()}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const villagesData = await villageService.getVillages({ limit: 100 });
      setVillages(villagesData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const loadApartments = async () => {
    try {
      setError('');
      const filters = {
        search: searchTerm || undefined,
        village_id: villageFilter ? parseInt(villageFilter) : undefined,
        phase: phaseFilter ? parseInt(phaseFilter) : undefined,
        status: statusFilter || undefined,
        paying_status: payingStatusFilter || undefined,
        page,
        limit,
        sort_by: orderBy,
        sort_order: order
      };

      const response = await apartmentService.getApartments(filters);
      
      // Load balances for apartments if admin
      let apartmentsWithBalance = response.data;
      if (isAdmin) {
        apartmentsWithBalance = await Promise.all(
          response.data.map(async (apartment) => {
            try {
              const summary = await apartmentService.getApartmentFinancialSummary(apartment.id);
              return {
                ...apartment,
                balance: summary.net_money
              };
            } catch (err) {
              console.warn(`Failed to load balance for apartment ${apartment.id}:`, err);
              return {
                ...apartment,
                balance: { EGP: 0, GBP: 0 }
              };
            }
          })
        );
      }
      else{
        // Load Apartments without financial data
        apartmentsWithBalance = response.data;
        apartmentsWithBalance = apartmentsWithBalance.map(apartment => ({
          ...apartment,
          balance: undefined
        }));
      }
      
      setApartments(apartmentsWithBalance);
      setTotalPages(response.pagination?.total_pages || 1);
      setTotalItems(response.pagination?.total || 0);
    } catch (err: any) {
      console.error('Failed to load apartments:', err);
      console.error('Error details:', { status: err.status, message: err.message, currentUserRole: currentUser?.role });
      
      // Show error message instead of redirecting to unauthorized
      // This will help debug what's actually causing the 403 error
      setError(err.message || `Failed to load apartments (Status: ${err.status || 'Unknown'})`);
    }
  };
  
  const getPhases = (villageId: number) => {
    if (!villages || villages.length === 0) return [];
    const village = villages.find(v => v.id === villageId);
    if (!village) return [];
    return Array.from({ length: village.phases }, (_, i) => i + 1);
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };
  
  const handleViewApartment = (id: number) => {
    navigate(`/apartments/${id}`);
  };

  const handleEditApartment = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/apartments/${id}/edit`);
  };

  const handleDeleteApartment = (apartment: Apartment, e: React.MouseEvent) => {
    e.stopPropagation();
    setApartmentToDelete(apartment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!apartmentToDelete) return;
    
    try {
      setDeleting(true);
      await apartmentService.deleteApartment(apartmentToDelete.id);
      setDeleteDialogOpen(false);
      setApartmentToDelete(null);
      loadApartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete apartment');
    } finally {
      setDeleting(false);
    }
  };

  const handleSortRequest = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(1);
  };

  const handleFilterChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    
    switch (name) {
      case 'village':
        setVillageFilter(value);
        setPhaseFilter('');
        break;
      case 'phase':
        setPhaseFilter(value);
        break;
      case 'status':
        setStatusFilter(value);
        break;
      case 'payingStatus':
        setPayingStatusFilter(value);
        break;
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setVillageFilter('');
    setPhaseFilter('');
    setStatusFilter('');
    setPayingStatusFilter('');
    setPage(1);
  };

  const handleAddApartment = () => {
    navigate('/apartments/new');
  };

  const renderSortIcon = (column: string) => {
    if (orderBy === column) {
      return order === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />;
    }
    return null;
  };

  const getPayingStatusDisplay = (status: 'transfer' | 'rent' | 'non-payer') => {
    switch (status) {
      case 'transfer': return 'Payed By Transfer';
      case 'rent': return 'Payed By Rent';
      case 'non-payer': return 'Non-Payer';
      default: return status;
    }
  };

  const getPayingStatusColor = (status: 'transfer' | 'rent' | 'non-payer') => {
    switch (status) {
      case 'transfer': return 'success';
      case 'rent': return 'info';
      case 'non-payer': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Available': return 'success';
      case 'Occupied by Owner': return 'primary';
      case 'Occupied By Renter': return 'warning';
      default: return 'default';
    }
  };

  const formatBalance = (balance?: { EGP: number; GBP: number }) => {
    if (!balance) return 'N/A';
    const egp = balance.EGP.toLocaleString();
    const gbp = balance.GBP.toLocaleString();
    return `${egp} EGP / ${gbp} GBP`;
  };

  const getBalanceColor = (balance?: { EGP: number; GBP: number }) => {
    if (!balance) return 'default';
    const total = balance.EGP + balance.GBP;
    return total > 0 ? 'success' : total < 0 ? 'error' : 'default';
  };

  // Data transformer for export
  const transformApartmentsForExport = (apartmentsData: ApartmentWithBalance[]) => {
    return apartmentsData.map(apartment => ({
      id: apartment.id,
      name: apartment.name,
      village: apartment.village?.name || 'Unknown',
      phase: `Phase ${apartment.phase}`,
      owner: apartment.owner?.name || 'Unknown',
      paying_status: apartment.paying_status === 'transfer' ? 'Payed By Transfer' : 
                     apartment.paying_status === 'rent' ? 'Payed By Rent' : 'Non-Payer',
      status: apartment.status || 'Unknown',
      balance_EGP: apartment.balance?.EGP || 0,
      balance_GBP: apartment.balance?.GBP || 0
    }));
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ mt: 3 }}>
            Apartments
          </Typography>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddApartment}
            >
              Add a new Apartment
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="Search apartments..."
              variant="outlined"
              size="small"
              sx={{ flexGrow: 1, minWidth: '200px' }}
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Project</InputLabel>
              <Select
                name="village"
                value={villageFilter}
                label="Project"
                onChange={handleFilterChange}
              >
                <MenuItem value="">
                  <em>All Projects</em>
                </MenuItem>
                {villages?.map(village => (
                  <MenuItem key={village.id} value={village.id.toString()}>
                    {village.name}
                  </MenuItem>
                )) || []}
              </Select>
            </FormControl>
            
            {villageFilter && (
              <FormControl sx={{ minWidth: 100 }} size="small">
                <InputLabel>Phase</InputLabel>
                <Select
                  name="phase"
                  value={phaseFilter}
                  label="Phase"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="">
                    <em>All Phases</em>
                  </MenuItem>
                  {(getPhases(parseInt(villageFilter)) || []).map(phase => (
                    <MenuItem key={phase} value={phase.toString()}>
                      Phase {phase}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={statusFilter}
                label="Status"
                onChange={handleFilterChange}
              >
                <MenuItem value="">
                  <em>All Statuses</em>
                </MenuItem>
                <MenuItem value="Available">Available</MenuItem>
                <MenuItem value="Occupied by Owner">Occupied by Owner</MenuItem>
                <MenuItem value="Occupied By Renter">Occupied By Renter</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Paying Status</InputLabel>
              <Select
                name="payingStatus"
                value={payingStatusFilter}
                label="Paying Status"
                onChange={handleFilterChange}
              >
                <MenuItem value="">
                  <em>All Paying Status</em>
                </MenuItem>
                <MenuItem value="transfer">Payed By Transfer</MenuItem>
                <MenuItem value="rent">Payed By Rent</MenuItem>
                <MenuItem value="non-payer">Non-Payer</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </Box>
        </Paper>

        {/* Export Buttons */}
        {(isAdmin) && (
        <ExportButtons data={transformApartmentsForExport(apartments)} columns={["id","name","village","phase","owner","paying_status","status","balance_EGP","balance_GBP"]} excelFileName="apartments.xlsx" pdfFileName="apartments.pdf" />
        )}

        <Paper>
          <TableContainer>
            <Table sx={{ minWidth: 650 }} aria-label="apartments table">
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ cursor: 'pointer' }} 
                    onClick={() => handleSortRequest('village_name')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Project {renderSortIcon('village_name')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }} 
                    onClick={() => handleSortRequest('name')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Apartment Name {renderSortIcon('name')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }} 
                    onClick={() => handleSortRequest('phase')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Phase {renderSortIcon('phase')}
                    </Box>
                  </TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }} 
                    onClick={() => handleSortRequest('paying_status')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Paying Status {renderSortIcon('paying_status')}
                    </Box>
                  </TableCell>
                  {isAdmin && <TableCell>Apartment Balance</TableCell>}
                  <TableCell 
                    sx={{ cursor: 'pointer' }} 
                    onClick={() => handleSortRequest('owner_name')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Owner {renderSortIcon('owner_name')}
                    </Box>
                  </TableCell>
                  <TableCell>Sales Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(apartments || []).map((apartment) => (
                  <TableRow 
                    key={apartment.id} 
                    hover 
                    onClick={() => handleViewApartment(apartment.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{apartment.village?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {apartment.name}
                      </Typography>
                    </TableCell>
                    <TableCell>Phase {apartment.phase}</TableCell>
                    <TableCell>
                      <Chip 
                        label={apartment.status || 'Unknown'} 
                        color={getStatusColor(apartment.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getPayingStatusDisplay(apartment.paying_status)} 
                        color={getPayingStatusColor(apartment.paying_status) as any}
                        size="small"
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Chip 
                          label={formatBalance(apartment.balance)} 
                          color={getBalanceColor(apartment.balance) as any}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                    )}
                    <TableCell>{apartment.owner?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip
                        label={apartment.sales_status === 'for sale' ? 'For Sale' : 'Not for Sale'}
                        color={apartment.sales_status === 'for sale' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewApartment(apartment.id);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {isAdmin ? (
                        <>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              onClick={(e) => handleEditApartment(apartment.id, e)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={(e) => handleDeleteApartment(apartment, e)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <Tooltip title="Book Apartment">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={e => {
                                e.stopPropagation();
                                setBookingApartmentId(apartment.id);
                                setBookingDialogOpen(true);
                              }}
                            >
                              <BookingIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(apartments || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        No apartments found matching your criteria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
          
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalItems)} of {totalItems} apartments
            </Typography>
          </Box>
        </Paper>

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Apartment</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the apartment "{apartmentToDelete?.name}"? 
              This action cannot be undone and will also delete all related bookings, payments, and service requests.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button 
              onClick={confirmDelete} 
              color="error" 
              variant="contained"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {!isAdmin && (
          <Dialog open={bookingDialogOpen} onClose={() => setBookingDialogOpen(false)} maxWidth="md" fullWidth>
            <CreateBooking
              apartmentId={bookingApartmentId ?? undefined}
              onSuccess={() => {
                setBookingDialogOpen(false);
                setBookingApartmentId(null);
                loadApartments();
              }}
              onCancel={() => {
                setBookingDialogOpen(false);
                setBookingApartmentId(null);
              }}
              lockApartment={true}
            />
          </Dialog>
        )}
      </Box>
    </Container>
  );
} 