import { useState } from 'react';
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  Chip,
  Container
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { mockApartments, mockUsers } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { Apartment } from '../types';

export default function Apartments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
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
    
    const matchesVillage = villageFilter ? apartment.village === villageFilter : true;
    
    return matchesSearch && matchesVillage;
  });
  
  const handleVillageFilterChange = (event: SelectChangeEvent) => {
    setVillageFilter(event.target.value);
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleApartmentClick = (id: string) => {
    navigate(`/apartments/${id}`);
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

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">Apartments</Typography>
          {currentUser?.role === 'admin' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddDialogOpen}
            >
              Add a new Apartment
            </Button>
          )}
        </Box>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <TextField
                label="Search Apartments"
                variant="outlined"
                fullWidth
                size="small"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by name or owner"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            
            <Box sx={{ minWidth: { xs: '100%', md: '200px' } }}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Village</InputLabel>
                <Select
                  value={villageFilter}
                  label="Filter by Village"
                  onChange={handleVillageFilterChange}
                >
                  <MenuItem value="">
                    <em>All Villages</em>
                  </MenuItem>
                  {villages.map(village => (
                    <MenuItem key={village} value={village}>{village}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          
          {villageFilter && (
            <Box sx={{ mt: 2 }}>
              <Chip 
                label={`Village: ${villageFilter}`} 
                onDelete={() => setVillageFilter('')} 
                color="primary" 
                variant="outlined"
              />
            </Box>
          )}
        </Paper>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Apartment Name</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Apartment Phase</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Paying Status</TableCell>
                <TableCell>Village</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredApartments.length > 0 ? (
                filteredApartments.map((apartment) => (
                  <TableRow 
                    key={apartment.id}
                    hover
                    onClick={() => handleApartmentClick(apartment.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{apartment.name}</TableCell>
                    <TableCell>{apartment.ownerName}</TableCell>
                    <TableCell>{apartment.phase}</TableCell>
                    <TableCell>
                      <Chip 
                        label={apartment.status} 
                        size="small"
                        color={
                          apartment.status === 'Available' ? 'success' :
                          apartment.status === 'Occupied by Owner' ? 'primary' : 'warning'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={apartment.payingStatus} 
                        size="small"
                        color={
                          apartment.payingStatus === 'Payed By Transfer' ? 'success' :
                          apartment.payingStatus === 'Payed By Rent' ? 'info' : 'error'
                        }
                      />
                    </TableCell>
                    <TableCell>{apartment.village}</TableCell>
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
    </Container>
  );
} 