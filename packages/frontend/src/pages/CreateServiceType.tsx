import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { serviceRequestService } from '../services/serviceRequestService';
import type { 
  ServiceType, 
  CreateServiceTypeRequest, 
  UpdateServiceTypeRequest
} from '../services/serviceRequestService';
import { userService } from '../services/userService';
import type { User } from '../services/userService';

export default function CreateServiceType() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNew = id === 'new' || !id;
  
  // Form data
  const [formData, setFormData] = useState<{
    name: string;
    cost: number | string;
    currency: 'EGP' | 'GBP';
    description: string;
    default_assignee_id?: number;
  }>({
    name: '',
    cost: 0,
    currency: 'EGP',
    description: '',
  });

  // Check if user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);

  // Check for success messages
  useEffect(() => {
    const success = searchParams.get('success');
    const message = searchParams.get('message');
    
    if (success && message) {
      // Show success message if needed
      console.log('Success:', decodeURIComponent(message));
    }
  }, [searchParams]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load users for assignee selection
        const usersData = await userService.getUsers({ limit: 100 });
        setUsers(usersData.data || []);

        // If editing, load the service type
        if (!isNew && id && id !== 'new') {
          const serviceTypeData = await serviceRequestService.getServiceTypeById(parseInt(id));
          setServiceType(serviceTypeData);
          
          // Pre-fill form with existing data
          setFormData({
            name: serviceTypeData.name,
            cost: serviceTypeData.cost,
            currency: serviceTypeData.currency,
            description: serviceTypeData.description || '',
            default_assignee_id: serviceTypeData.default_assignee_id
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isNew, id]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cost' ? (value === '' ? 0 : parseFloat(value)) : value
    }));
  };

  const handleSelectChange = (event: SelectChangeEvent, fieldName: string) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [fieldName]: fieldName === 'default_assignee_id' 
        ? (value ? parseInt(value) : undefined)
        : value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name || formData.name.trim() === '') {
      return 'Service name is required';
    }

    if (Number(formData.cost) <= 0) {
      return 'Cost must be greater than 0';
    }

    if (formData.name.length > 100) {
      return 'Service name must be 100 characters or less';
    }

    if (formData.description && formData.description.length > 1000) {
      return 'Description must be 1000 characters or less';
    }

    return null;
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Validate form data
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      if (isNew) {
        // Create new service type
        await serviceRequestService.createServiceType({
          ...formData,
          cost: Number(formData.cost)
        });
        navigate('/services?tab=0&success=Service%20type%20created%20successfully');
      } else if (id) {
        // Update existing service type
        const updateData: UpdateServiceTypeRequest = {
          name: formData.name,
          cost: Number(formData.cost),
          currency: formData.currency,
          description: formData.description,
          default_assignee_id: formData.default_assignee_id
        };
        
        await serviceRequestService.updateServiceType(parseInt(id), updateData);
        navigate('/services?tab=0&success=Service%20type%20updated%20successfully');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save service type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/services');
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md">
        <Box sx={{ mb: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Button
              variant="text"
              color="primary"
              startIcon={<ArrowBackIcon />}
              onClick={handleCancel}
            >
              Back
            </Button>
            <Typography variant="h4" sx={{ mt: 3, ml: 2 }}>
              {isNew ? 'Create New Service Type' : `Edit Service Type`}
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Service Type Information</Typography>
            
            <Grid container spacing={3}>
              <Grid size={{xs: 12}}>
                <TextField
                  label="Service Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  error={!formData.name && formData.name !== ''}
                  helperText={!formData.name && formData.name !== '' ? 'Service name is required' : 'Enter a descriptive name for this service type'}
                  inputProps={{ maxLength: 100 }}
                />
              </Grid>
              
              <Grid size={{xs: 12, sm: 6}}>
                <TextField
                  label="Cost"
                  name="cost"
                  type="number"
                  value={formData.cost}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  error={typeof formData.cost === 'number' && formData.cost <= 0}
                  helperText={typeof formData.cost === 'number' && formData.cost <= 0 ? 'Cost must be greater than 0' : 'Enter the service cost'}
                  inputProps={{ min: 0, step: 0.01, max: 999999.99 }}
                />
              </Grid>
              
              <Grid size={{xs: 12, sm: 6}}>
                <FormControl fullWidth required>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={formData.currency}
                    label="Currency"
                    onChange={(e) => handleSelectChange(e, 'currency')}
                  >
                    <MenuItem value="EGP">EGP (Egyptian Pound)</MenuItem>
                    <MenuItem value="GBP">GBP (British Pound)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={{xs: 12}}>
                <TextField
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={4}
                  helperText="Provide a detailed description of what this service includes (optional)"
                  inputProps={{ maxLength: 1000 }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Preview */}
          {formData.name && typeof formData.cost === 'number' && formData.cost > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Preview</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Service Name</Typography>
                    <Typography variant="body1">{formData.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Cost</Typography>
                    <Typography variant="body1" color="primary" fontWeight="bold">
                      {formData.cost.toFixed(2)} {formData.currency}
                    </Typography>
                  </Box>
                  {formData.description && (
                    <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                      <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                      <Typography variant="body1">{formData.description}</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
          
          {/* Action Buttons */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
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
              onClick={handleSubmit}
              disabled={submitting || !formData.name || typeof formData.cost === 'number' && formData.cost <= 0}
            >
              {submitting ? (isNew ? 'Creating...' : 'Updating...') : (isNew ? 'Create Service Type' : 'Update Service Type')}
            </Button>
          </Box>
        </Box>
      </Container>
    </LocalizationProvider>
  );
} 