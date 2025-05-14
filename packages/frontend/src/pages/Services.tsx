import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Card,
  CardContent,
  CardActions,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { mockServiceTypes, mockApartments } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { ServiceType } from '../types';

export default function Services() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [requestDate, setRequestDate] = useState('');
  const [notes, setNotes] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Filter services based on search
  const filteredServices = mockServiceTypes.filter(service => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleOpenRequestDialog = (service: ServiceType) => {
    setSelectedService(service);
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedService(null);
    setSelectedApartment('');
    setRequestDate('');
    setNotes('');
  };
  
  const handleApartmentChange = (event: SelectChangeEvent) => {
    setSelectedApartment(event.target.value);
  };
  
  const handleRequestSubmit = () => {
    // In a real app, this would send data to an API
    // For now, just show a success message
    setOpenSnackbar(true);
    handleCloseDialog();
  };
  
  const handleAddServiceType = () => {
    navigate('/services/new');
  };
  
  const handleServiceTypeClick = (id: string) => {
    navigate(`/services/${id}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Services</Typography>
        {currentUser?.role === 'admin' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddServiceType}
          >
            Add Service Type
          </Button>
        )}
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          label="Search Services"
          variant="outlined"
          size="small"
          fullWidth
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
      </Paper>
      
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {filteredServices.length > 0 ? (
          filteredServices.map(service => (
            <Card key={service.id}>
              <CardContent>
                <Typography variant="h6" gutterBottom onClick={() => currentUser?.role === 'admin' && handleServiceTypeClick(service.id)} sx={{ cursor: currentUser?.role === 'admin' ? 'pointer' : 'default' }}>
                  {service.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {service.description}
                </Typography>
                <Typography variant="h6" color="primary">
                  {service.cost.toLocaleString()} EGP
                </Typography>
              </CardContent>
              <CardActions>
                {currentUser?.role !== 'admin' && (
                  <Button 
                    size="small" 
                    color="primary"
                    onClick={() => handleOpenRequestDialog(service)}
                  >
                    Request Service
                  </Button>
                )}
                {currentUser?.role === 'admin' && (
                  <Button 
                    size="small" 
                    color="primary"
                    onClick={() => handleServiceTypeClick(service.id)}
                  >
                    View Details
                  </Button>
                )}
              </CardActions>
            </Card>
          ))
        ) : (
          <Paper sx={{ p: 3, gridColumn: '1 / -1' }}>
            <Typography align="center">
              No services found matching your criteria.
            </Typography>
          </Paper>
        )}
      </Box>
      
      {/* Service Request Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Request Service: {selectedService?.name}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="apartment-select-label">Apartment</InputLabel>
              <Select
                labelId="apartment-select-label"
                value={selectedApartment}
                label="Apartment"
                onChange={handleApartmentChange}
              >
                {mockApartments.map(apt => (
                  <MenuItem key={apt.id} value={apt.id}>{apt.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="requestDate"
              label="Request Date"
              type="date"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="notes"
              label="Notes"
              multiline
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Cost: {selectedService?.cost.toLocaleString()} EGP
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleRequestSubmit}
            variant="contained"
            disabled={!selectedApartment || !requestDate}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success Snackbar */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
          Service request submitted successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
} 