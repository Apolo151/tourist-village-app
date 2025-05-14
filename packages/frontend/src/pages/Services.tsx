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
  Snackbar,
  Container,
  Divider,
  Chip
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  Build as BuildIcon, 
  EventAvailable as EventAvailableIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { mockServiceTypes, mockApartments } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { ServiceType, ServiceRequest } from '../types';

export default function Services() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [requestDate, setRequestDate] = useState('');
  const [serviceDate, setServiceDate] = useState('');
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
    setRequestDate(new Date().toISOString().split('T')[0]); // Set current date as default request date
    setOpenRequestDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenRequestDialog(false);
    setSelectedService(null);
    setSelectedApartment('');
    setRequestDate('');
    setServiceDate('');
    setNotes('');
  };
  
  const handleApartmentChange = (event: SelectChangeEvent) => {
    setSelectedApartment(event.target.value);
  };
  
  const handleRequestSubmit = () => {
    // In a real app, this would send data to an API
    const newServiceRequest: Partial<ServiceRequest> = {
      serviceTypeId: selectedService?.id,
      apartmentId: selectedApartment,
      requestDate: requestDate,
      serviceDate: serviceDate,
      notes: notes,
      status: 'pending',
      userId: currentUser?.id
    };
    
    console.log('Creating service request:', newServiceRequest);
    
    // Show success message and close dialog
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
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
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
            placeholder="Search by service name or description"
          />
        </Paper>
        
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)'
          },
          gap: 3
        }}>
          {filteredServices.length > 0 ? (
            filteredServices.map(service => (
              <Card key={service.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" 
                      onClick={() => currentUser?.role === 'admin' && handleServiceTypeClick(service.id)} 
                      sx={{ 
                        cursor: currentUser?.role === 'admin' ? 'pointer' : 'default',
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <BuildIcon sx={{ mr: 1 }} fontSize="small" />
                      {service.name}
                    </Typography>
                    <Chip 
                      label={`${service.cost} EGP`} 
                      color="primary" 
                      variant="outlined"
                    />
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {service.description}
                  </Typography>
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0 }}>
                  {currentUser?.role !== 'admin' && (
                    <Button 
                      size="small" 
                      color="primary"
                      startIcon={<EventAvailableIcon />}
                      onClick={() => handleOpenRequestDialog(service)}
                      fullWidth
                      variant="contained"
                    >
                      Request Service
                    </Button>
                  )}
                  {currentUser?.role === 'admin' && (
                    <Button 
                      size="small" 
                      color="primary"
                      startIcon={<InfoIcon />}
                      onClick={() => handleServiceTypeClick(service.id)}
                      fullWidth
                      variant="outlined"
                    >
                      View Details
                    </Button>
                  )}
                </CardActions>
              </Card>
            ))
          ) : (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography>
                  No services found matching your criteria.
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>
      </Box>
      
      {/* Service Request Dialog */}
      <Dialog open={openRequestDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Request Service: {selectedService?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" sx={{ mt: 1 }}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="apartment-select-label">Related Apartment</InputLabel>
              <Select
                labelId="apartment-select-label"
                value={selectedApartment}
                label="Related Apartment"
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
              disabled
              helperText="Date when the request is created (today)"
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="serviceDate"
              label="Wanted Service Date"
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="When would you like the service to be performed"
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
              placeholder="Add any additional information that might be helpful"
            />
            
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Service Details:</Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Service:</strong> {selectedService?.name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Cost:</strong> {selectedService?.cost} EGP
              </Typography>
              <Typography variant="body2">
                <strong>Description:</strong> {selectedService?.description}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleRequestSubmit}
            variant="contained"
            disabled={!selectedApartment || !serviceDate}
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
          Service request submitted successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
} 