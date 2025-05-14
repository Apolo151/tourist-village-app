import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Container, 
  Alert, 
  InputAdornment
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { mockServiceTypes } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { ServiceType } from '../types';

export default function ServiceTypeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const isNew = location.pathname === '/services/new';
  const [isEditing, setIsEditing] = useState(isNew);
  const [error, setError] = useState('');
  
  // Find service type from mock data
  const initialServiceType = id 
    ? mockServiceTypes.find(service => service.id === id) 
    : { id: '', name: '', cost: 0, description: '' };
  
  const [serviceType, setServiceType] = useState<ServiceType | undefined>(initialServiceType);
  
  useEffect(() => {
    // Redirect if not admin
    if (currentUser?.role !== 'admin') {
      navigate('/unauthorized');
    }
    
    // Set error if service type not found
    if (!isNew && !serviceType) {
      setError('Service type not found');
    }
  }, [currentUser?.role, serviceType, isNew, navigate]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (serviceType) {
      setServiceType({
        ...serviceType,
        [name]: name === 'cost' ? parseFloat(value) || 0 : value,
      });
    }
  };
  
  const handleBack = () => {
    navigate('/services');
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    if (isNew) {
      navigate('/services');
    } else {
      setIsEditing(false);
      // Reset to original values
      setServiceType(initialServiceType);
    }
  };
  
  const handleSave = () => {
    if (!serviceType?.name || serviceType.cost <= 0) {
      setError('Please fill in all required fields');
      return;
    }
    
    // In a real app, this would send data to an API
    console.log('Saving service type:', serviceType);
    
    if (isNew) {
      // Redirect to services page after creating
      navigate('/services');
    } else {
      // Exit edit mode
      setIsEditing(false);
      setError('');
    }
  };
  
  if (error && !serviceType) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Back to Services
          </Button>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              startIcon={<ArrowBackIcon />} 
              onClick={handleBack}
              sx={{ mr: 2 }}
            >
              Back
            </Button>
            <Typography variant="h5">
              {isNew ? 'Add New Service Type' : serviceType?.name}
            </Typography>
          </Box>
          
          {!isNew && !isEditing && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit
            </Button>
          )}
        </Box>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        <Paper sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3
          }}>
            <Box sx={{ gridColumn: { xs: '1', md: '1 / 3' } }}>
              <TextField
                fullWidth
                label="Service Name"
                name="name"
                value={serviceType?.name || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                required
                error={isEditing && !serviceType?.name}
                helperText={isEditing && !serviceType?.name ? 'Service name is required' : ''}
              />
            </Box>
            
            <Box sx={{ gridColumn: { xs: '1', md: '1' } }}>
              <TextField
                fullWidth
                label="Cost"
                name="cost"
                type="number"
                value={serviceType?.cost || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">EGP</InputAdornment>,
                }}
                error={isEditing && (serviceType?.cost || 0) <= 0}
                helperText={isEditing && (serviceType?.cost || 0) <= 0 ? 'Cost must be greater than 0' : ''}
              />
            </Box>
            
            <Box sx={{ gridColumn: { xs: '1', md: '1 / 3' } }}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                multiline
                rows={4}
                value={serviceType?.description || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </Box>
          </Box>
          
          {isEditing && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
              >
                Save
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
} 