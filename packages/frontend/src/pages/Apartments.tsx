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
import { Search as SearchIcon, Add as AddIcon, ArrowDropDown as ArrowDropDownIcon, ArrowDropUp as ArrowDropUpIcon } from '@mui/icons-material';
import { mockApartments, mockUsers } from '../mockData';
import type { Apartment } from '../types';

export default function Apartments() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  // Sorting state
  const [orderBy, setOrderBy] = useState<keyof Apartment>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  
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
  
  // Filter apartments based on search and village filter
  const filteredApartments = mockApartments.filter(apartment => {
    const matchesSearch = 
      apartment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apartment.ownerName && apartment.ownerName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesVillage = apartment.village === 'Sharm';
    
    return matchesSearch && matchesVillage;
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
      
      // Optionally navigate to the new apartment details
      // navigate(`/apartments/${newApartmentId}`);
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
    { id: 'actions', label: 'Actions', sortable: false }
  ];

  return (
    <Box sx={{ width: '100%' }}>
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
      
      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="Search apartments..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ 
            width: { xs: '100%', sm: '350px' },
            backgroundColor: 'white',
            '& .MuiOutlinedInput-root': {
              borderRadius: '4px'
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
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
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => handleViewApartment(apartment.id)}
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
                <TableCell colSpan={5} align="center">
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
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          size="small"
          sx={{ minWidth: 32, height: 32, p: 0 }}
        >
          1
        </Button>
      </Box>
      
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