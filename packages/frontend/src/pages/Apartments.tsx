import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, ArrowDropDown as ArrowDropDownIcon, ArrowDropUp as ArrowDropUpIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import { mockApartments, mockUsers } from '../mockData';
import type { Apartment } from '../types';

export default function Apartments() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  // Sorting state
  const [orderBy, setOrderBy] = useState<keyof Apartment>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  
  // Filter states
  const [villageFilter, setVillageFilter] = useState<string>('');
  const [phaseFilter, setPhaseFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [payingStatusFilter, setPayingStatusFilter] = useState<string>('');
  
  // States for the "Add a new Apartment" dialog
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [newApartment, setNewApartment] = useState<Partial<Apartment>>({
    name: '',
    ownerId: '',
    ownerName: '',
    village: 'Sharm',
    phase: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    status: 'Available',
    payingStatus: 'Non-Payer',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Get unique villages for the filter
  const villages = ['Sharm', 'Luxor', 'International Resort'];
  
  // Get phases for the selected village
  const getPhases = (village: string) => {
    switch (village) {
      case 'Sharm':
        return ['Phase 1', 'Phase 2', 'Phase 3'];
      case 'Luxor':
        return ['Phase 1', 'Phase 2'];
      case 'International Resort':
        return ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];
      default:
        return [];
    }
  };
  
  // Filter apartments based on all filters
  const filteredApartments = mockApartments.filter(apartment => {
    const matchesSearch = 
      apartment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apartment.ownerName && apartment.ownerName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesVillage = !villageFilter || apartment.village === villageFilter;
    const matchesPhase = !phaseFilter || apartment.phase === phaseFilter;
    const matchesStatus = !statusFilter || apartment.status === statusFilter;
    const matchesPayingStatus = !payingStatusFilter || apartment.payingStatus === payingStatusFilter;
    
    return matchesSearch && matchesVillage && matchesPhase && matchesStatus && matchesPayingStatus;
  });

  // Sort apartments
  const sortedApartments = [...filteredApartments].sort((a, b) => {
    const aValue = a[orderBy] || '';
    const bValue = b[orderBy] || '';
    
    if (order === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
    }
  });
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleViewApartment = (id: string) => {
    navigate(`/apartments/${id}`);
  };

  const handleEditApartment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/apartments/${id}/edit`);
  };

  const handleSortRequest = (property: keyof Apartment) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleAddDialogOpen = () => {
    setAddDialogOpen(true);
  };

  const handleAddDialogClose = () => {
    setAddDialogOpen(false);
    setNewApartment({
      name: '',
      ownerId: '',
      ownerName: '',
      village: 'Sharm',
      phase: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      status: 'Available',
      payingStatus: 'Non-Payer',
    });
    setErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewApartment(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setNewApartment(prev => ({ ...prev, [name]: value }));
    
    // If village changed, reset phase
    if (name === 'village') {
      setNewApartment(prev => ({ ...prev, phase: '' }));
    }
    
    // If ownerId changed, get the owner name
    if (name === 'ownerId' && value) {
      const owner = mockUsers.find(user => user.id === value);
      if (owner) {
        setNewApartment(prev => ({ ...prev, ownerName: owner.name }));
      }
    }
  };

  const handleFilterChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    switch (name) {
      case 'village':
        setVillageFilter(value);
        setPhaseFilter(''); // Reset phase when village changes
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
  };

  const clearFilters = () => {
    setSearchTerm('');
    setVillageFilter('');
    setPhaseFilter('');
    setStatusFilter('');
    setPayingStatusFilter('');
  };

  const validateNewApartment = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!newApartment.name) newErrors.name = 'Apartment Name is required';
    if (!newApartment.ownerId) newErrors.ownerId = 'Owner is required';
    if (!newApartment.village) newErrors.village = 'Village is required';
    if (!newApartment.phase) newErrors.phase = 'Phase is required';
    if (!newApartment.purchaseDate) newErrors.purchaseDate = 'Purchase Date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddApartment = () => {
    if (validateNewApartment()) {
      // In a real app, this would send a request to the backend
      // For this demo, we would add to the mock data
      console.log('Adding new apartment:', newApartment);
      
      // Close the dialog
      handleAddDialogClose();
    }
  };
  
  // Available owners for selection
  const owners = mockUsers.filter(user => user.role === 'owner');

  // Render sort icon
  const renderSortIcon = (column: keyof Apartment) => {
    if (orderBy !== column) return null;
    return order === 'asc' ? <ArrowDropUpIcon fontSize="small" /> : <ArrowDropDownIcon fontSize="small" />;
  };

  // Column headers
  const columns = [
    { id: 'name', label: 'Apartment No', sortable: true },
    { id: 'ownerName', label: 'Owner', sortable: true },
    { id: 'phase', label: 'Phase', sortable: true },
    { id: 'status', label: 'Status', sortable: true },
    { id: 'payingStatus', label: 'Paying Status', sortable: true },
    { id: 'actions', label: 'Actions', sortable: false }
  ];

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">Apartments</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddDialogOpen}
          sx={{ 
            textTransform: 'none',
            borderRadius: '4px',
            px: 2
          }}
        >
          Add Apartment
        </Button>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ width: { xs: '100%', sm: '48%', md: '23%' } }}>
            <TextField
              placeholder="Search apartments..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%', md: '15%' } }}>
            <FormControl fullWidth size="small">
              <InputLabel>Village</InputLabel>
              <Select
                name="village"
                value={villageFilter}
                label="Village"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Villages</MenuItem>
                {villages.map(village => (
                  <MenuItem key={village} value={village}>{village}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%', md: '15%' } }}>
            <FormControl fullWidth size="small">
              <InputLabel>Phase</InputLabel>
              <Select
                name="phase"
                value={phaseFilter}
                label="Phase"
                onChange={handleFilterChange}
                disabled={!villageFilter}
              >
                <MenuItem value="">All Phases</MenuItem>
                {getPhases(villageFilter).map(phase => (
                  <MenuItem key={phase} value={phase}>{phase}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%', md: '15%' } }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={statusFilter}
                label="Status"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="Available">Available</MenuItem>
                <MenuItem value="Occupied by Owner">Occupied by Owner</MenuItem>
                <MenuItem value="Occupied By Renter">Occupied By Renter</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%', md: '15%' } }}>
            <FormControl fullWidth size="small">
              <InputLabel>Paying Status</InputLabel>
              <Select
                name="payingStatus"
                value={payingStatusFilter}
                label="Paying Status"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Payed By Transfer">Payed By Transfer</MenuItem>
                <MenuItem value="Payed By Rent">Payed By Rent</MenuItem>
                <MenuItem value="Non-Payer">Non-Payer</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%', md: '10%' } }}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              startIcon={<FilterListIcon />}
              fullWidth
              size="small"
            >
              Clear
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0', width: '100%' }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              {columns.map((column) => (
                <TableCell 
                  key={column.id}
                  sortDirection={orderBy === column.id ? order : false}
                  sx={{ 
                    cursor: column.sortable ? 'pointer' : 'default',
                    fontWeight: 'bold',
                    color: '#666'
                  }}
                  onClick={() => column.sortable && handleSortRequest(column.id as keyof Apartment)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {column.label}
                    {column.sortable && renderSortIcon(column.id as keyof Apartment)}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedApartments.length > 0 ? (
              sortedApartments.map((apartment) => (
                <TableRow 
                  key={apartment.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleViewApartment(apartment.id)}
                >
                  <TableCell>{apartment.name}</TableCell>
                  <TableCell>{apartment.ownerName}</TableCell>
                  <TableCell>{apartment.phase}</TableCell>
                  <TableCell>
                    <Chip 
                      label={apartment.status} 
                      size="small"
                      sx={{
                        backgroundColor: apartment.status === 'Available' ? '#e6f4ea' :
                                      apartment.status === 'Occupied by Owner' ? '#e3f2fd' : '#fff8e1',
                        color: apartment.status === 'Available' ? '#1e8e3e' :
                               apartment.status === 'Occupied by Owner' ? '#1976d2' : '#f57c00',
                        border: 'none',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={apartment.payingStatus} 
                      size="small"
                      sx={{
                        backgroundColor: apartment.payingStatus === 'Payed By Transfer' ? '#e8f5e9' :
                                      apartment.payingStatus === 'Payed By Rent' ? '#e3f2fd' : '#ffebee',
                        color: apartment.payingStatus === 'Payed By Transfer' ? '#2e7d32' :
                               apartment.payingStatus === 'Payed By Rent' ? '#1976d2' : '#d32f2f',
                        border: 'none',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewApartment(apartment.id);
                      }}
                      sx={{ mr: 2, color: '#1976d2', textDecoration: 'none' }}
                    >
                      View
                    </Link>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={(e) => handleEditApartment(apartment.id, e)}
                      sx={{ color: '#1976d2', textDecoration: 'none' }}
                    >
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="subtitle1" sx={{ py: 2 }}>
                    No apartments found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try adjusting your search or filters
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Add Apartment Dialog */}
      <Dialog open={isAddDialogOpen} onClose={handleAddDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Add a new Apartment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mt: 1 }}>
            <TextField
              label="Apartment Name"
              name="name"
              value={newApartment.name || ''}
              onChange={handleInputChange}
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name}
            />
            
            <FormControl fullWidth required error={!!errors.ownerId}>
              <InputLabel>Owner</InputLabel>
              <Select
                name="ownerId"
                value={newApartment.ownerId || ''}
                label="Owner"
                onChange={handleSelectChange}
              >
                {owners.map(owner => (
                  <MenuItem key={owner.id} value={owner.id}>{owner.name}</MenuItem>
                ))}
              </Select>
              {errors.ownerId && <FormHelperText>{errors.ownerId}</FormHelperText>}
            </FormControl>
            
            <FormControl fullWidth required error={!!errors.village}>
              <InputLabel>Village</InputLabel>
              <Select
                name="village"
                value={newApartment.village || ''}
                label="Village"
                onChange={handleSelectChange}
              >
                {villages.map(village => (
                  <MenuItem key={village} value={village}>{village}</MenuItem>
                ))}
              </Select>
              {errors.village && <FormHelperText>{errors.village}</FormHelperText>}
            </FormControl>
            
            <FormControl fullWidth required error={!!errors.phase}>
              <InputLabel>Apartment Phase</InputLabel>
              <Select
                name="phase"
                value={newApartment.phase || ''}
                label="Apartment Phase"
                onChange={handleSelectChange}
                disabled={!newApartment.village}
              >
                {getPhases(newApartment.village as string).map(phase => (
                  <MenuItem key={phase} value={phase}>{phase}</MenuItem>
                ))}
              </Select>
              {errors.phase && <FormHelperText>{errors.phase}</FormHelperText>}
            </FormControl>
            
            <TextField
              label="Purchase Date"
              name="purchaseDate"
              type="date"
              value={newApartment.purchaseDate || ''}
              onChange={handleInputChange}
              fullWidth
              required
              error={!!errors.purchaseDate}
              helperText={errors.purchaseDate}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddDialogClose}>Cancel</Button>
          <Button variant="contained" onClick={handleAddApartment}>Add Apartment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 