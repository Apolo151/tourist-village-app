import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import { serviceRequestService } from '../services/serviceRequestService';
import type { 
  ServiceType, 
  CreateServiceTypeRequest, 
  UpdateServiceTypeRequest
} from '../services/serviceRequestService';
import { userService } from '../services/userService';
import type { User } from '../services/userService';

export default function ServiceTypeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew] = useState(id === 'new');
  
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
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      navigate('/unauthorized');
    }
  }, [currentUser?.role, navigate]);

  // Check for success messages
  useEffect(() => {
    const success = searchParams.get('success');
    const message = searchParams.get('message');
    
    if (success && message) {
      // Show success message (you can implement a snackbar here)
      console.log('Success:', decodeURIComponent(message));
    }
  }, [searchParams]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading service type data for ID:', id);
        
        // Load users for assignee selection
        const usersData = await userService.getUsers({ limit: 100 });
        setUsers(usersData.data);

        if (!isNew && id) {
          console.log('Fetching service type by ID:', id);
          // Load service type
          const serviceTypeData = await serviceRequestService.getServiceTypeById(parseInt(id));
          console.log('Loaded service type:', serviceTypeData);
          setServiceType(serviceTypeData);
          setFormData({
            name: serviceTypeData.name,
            cost: serviceTypeData.cost,
            currency: serviceTypeData.currency,
            description: serviceTypeData.description || '',
            default_assignee_id: serviceTypeData.default_assignee_id
          });
        } else if (isNew) {
          setIsEditing(true);
        }
      } catch (err) {
        console.error('Error loading service type data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load service type');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isNew]);

  // If error, set error if service type not found
  useEffect(() => {
    if (!isNew && !serviceType && !loading) {
      setError('Service type not found');
    }
  }, [serviceType, isNew, loading]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cost' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  const handleSelectChange = (event: SelectChangeEvent, fieldName: string) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [fieldName]: fieldName === 'default_assignee_id' ? (value === '' ? undefined : parseInt(value)) : value
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (isNew) {
      navigate('/services');
    } else {
      setIsEditing(false);
      // Reset form data
      if (serviceType) {
        setFormData({
          name: serviceType.name,
          cost: serviceType.cost,
          currency: serviceType.currency,
          description: serviceType.description || '',
          default_assignee_id: serviceType.default_assignee_id
        });
      }
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate form data
      if (!formData.name || formData.name.trim() === '') {
        setError('Service name is required');
        return;
      }

      if (typeof formData.cost === 'number' && formData.cost <= 0) {
        setError('Cost must be greater than 0');
        return;
      }

      console.log('Saving service type with data:', formData);

      if (isNew) {
        try {
          const apiData = {
            ...formData,
            cost: typeof formData.cost === 'string' ? parseFloat(formData.cost) || 0 : formData.cost
          };
          const newServiceType = await serviceRequestService.createServiceType(apiData);
          console.log('Created service type:', newServiceType);
          
          if (newServiceType && newServiceType.id) {
            console.log('Navigating to service type detail page:', `/services/types/${newServiceType.id}`);
            // Navigate to the created service type's detail page
            navigate(`/services/types/${newServiceType.id}?success=true&message=${encodeURIComponent('Service type created successfully')}`);
          } else {
            console.error('Service type created but no ID returned:', newServiceType);
            setError('Service type was created but navigation failed. Check the services list.');
            // Navigate back to services list instead
            navigate(`/services?success=true&message=${encodeURIComponent('Service type created successfully')}&tab=0`);
          }
        } catch (createError) {
          console.error('Create service type error:', createError);
          throw createError;
        }
      } else if (id) {
        const updateData: UpdateServiceTypeRequest = {
          name: formData.name,
          cost: typeof formData.cost === 'string' ? parseFloat(formData.cost) || 0 : formData.cost,
          currency: formData.currency,
          description: formData.description,
          default_assignee_id: formData.default_assignee_id
        };
        
        console.log('Updating service type with data:', updateData);
        const updatedServiceType = await serviceRequestService.updateServiceType(parseInt(id), updateData);
        console.log('Updated service type:', updatedServiceType);
        
        setServiceType(updatedServiceType);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error saving service type:', err);
      if (err instanceof Error) {
        setError(`Failed to save service type: ${err.message}`);
      } else {
        setError('Failed to save service type: Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || isNew) return;
    
    if (window.confirm('Are you sure you want to delete this service type? This action cannot be undone.')) {
      try {
        setLoading(true);
        await serviceRequestService.deleteServiceType(parseInt(id));
        navigate(`/services?success=true&message=${encodeURIComponent('Service type deleted successfully')}&tab=0`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete service type');
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
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

  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Services
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="text" color="primary" startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Back
            </Button>
            <Typography variant="h4" sx={{ mt: 3 }}>
              {isNew ? 'New Service Type' : serviceType?.name || 'Service Type'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isEditing && !isNew && (
              <>
                <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
                  Edit
                </Button>
                <Tooltip title="Delete Service Type">
                  <IconButton color="error" onClick={handleDelete}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {isEditing && (
              <>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                  Save
                </Button>
                <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Form */}
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <TextField
              label="Service Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              required
              disabled={!isEditing}
              error={!formData.name}
              helperText={!formData.name ? 'Service name is required' : ''}
            />
            
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Cost"
                name="cost"
                type="number"
                value={formData.cost === '' ? '' : formData.cost}
                onChange={handleInputChange}
                fullWidth
                required
                disabled={!isEditing}
                inputProps={{ min: 0, step: 0.01 }}
                error={formData.cost !== '' && Number(formData.cost) <= 0}
                helperText={formData.cost !== '' && Number(formData.cost) <= 0 ? 'Cost must be greater than 0' : ''}
              />
              
              <FormControl fullWidth disabled={!isEditing}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.currency}
                  label="Currency"
                  onChange={(e) => handleSelectChange(e, 'currency')}
                >
                  <MenuItem value="EGP">EGP</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={3}
              disabled={!isEditing}
            />
            
            <FormControl fullWidth disabled={!isEditing}>
              <InputLabel>Default Assignee (Optional)</InputLabel>
              <Select
                value={formData.default_assignee_id?.toString() || ''}
                label="Default Assignee (Optional)"
                onChange={(e) => handleSelectChange(e, 'default_assignee_id')}
              >
                <MenuItem value="">
                  <em>No default assignee</em>
                </MenuItem>
                {(users || []).filter(user => user.role === 'admin' || user.role === 'super_admin').map(user => (
                  <MenuItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        {/* Service Type Info (when not editing) */}
        {!isEditing && serviceType && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Service Type Information</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Created By</Typography>
                  <Typography variant="body1">{serviceType.created_by_user?.name || 'Unknown'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Created Date</Typography>
                  <Typography variant="body1">{new Date(serviceType.created_at).toLocaleDateString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Last Updated</Typography>
                  <Typography variant="body1">{new Date(serviceType.updated_at).toLocaleDateString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Service Type ID</Typography>
                  <Typography variant="body1">{serviceType.id}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
} 