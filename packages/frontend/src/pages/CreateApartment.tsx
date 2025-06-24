import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { apartmentService } from '../services/apartmentService';
import { villageService } from '../services/villageService';
import { userService } from '../services/userService';
import type { Village } from '../services/villageService';
import type { User } from '../services/userService';
import type { CreateApartmentRequest } from '../services/apartmentService';

export default function CreateApartment() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Data state
  const [villages, setVillages] = useState<Village[]>([]);
  const [owners, setOwners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState<CreateApartmentRequest>({
    name: '',
    village_id: 0,
    phase: 1,
    owner_id: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    paying_status: 'non-payer'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/apartments');
      return;
    }
    loadInitialData();
  }, [isAdmin, navigate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [villagesData, usersData] = await Promise.all([
        villageService.getVillages({ limit: 100 }),
        userService.getUsers({ limit: 100, role: 'owner' })
      ]);
      
      setVillages(villagesData.data);
      setOwners(usersData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  // Get phases for the selected village
  const getPhases = (villageId: number) => {
    if (!villages || villages.length === 0) return [];
    const village = villages.find(v => v.id === villageId);
    if (!village) return [];
    return Array.from({ length: village.phases }, (_, i) => i + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    
    if (name === 'village_id') {
      setFormData(prev => ({ 
        ...prev, 
        village_id: parseInt(value), 
        phase: 1 // Reset phase when village changes
      }));
    } else if (name === 'owner_id') {
      setFormData(prev => ({ ...prev, owner_id: parseInt(value) }));
    } else if (name === 'phase') {
      setFormData(prev => ({ ...prev, phase: parseInt(value) }));
    } else if (name === 'paying_status') {
      setFormData(prev => ({ ...prev, paying_status: value as 'transfer' | 'rent' | 'non-payer' }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Apartment name is required';
    }
    
    if (!formData.village_id) {
      newErrors.village_id = 'Village is required';
    }
    
    if (!formData.owner_id) {
      newErrors.owner_id = 'Owner is required';
    }
    
    if (!formData.phase) {
      newErrors.phase = 'Phase is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      
      const apartment = await apartmentService.createApartment(formData);
      
      // Navigate to the created apartment with success message
      navigate(`/apartments/${apartment.id}?success=true&message=${encodeURIComponent('Apartment created successfully')}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create apartment');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/apartments');
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
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            variant="text"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Back to Apartments
          </Button>
          <Typography variant="h4">Add New Apartment</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Apartment Name */}
              <Grid size={{xs: 12}}>
                <TextField
                  fullWidth
                  label="Apartment Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                />
              </Grid>

              {/* Village */}
              <Grid size={{xs: 12, sm: 6}}>
                <FormControl fullWidth error={!!errors.village_id} required>
                  <InputLabel>Village</InputLabel>
                  <Select
                    name="village_id"
                    value={formData.village_id.toString()}
                    label="Village"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="0">
                      <em>Select Village</em>
                    </MenuItem>
                    {villages.map(village => (
                      <MenuItem key={village.id} value={village.id.toString()}>
                        {village.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.village_id && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                      {errors.village_id}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              {/* Phase */}
              <Grid size={{xs: 12, sm: 6}}>
                <FormControl fullWidth error={!!errors.phase} required disabled={!formData.village_id}>
                  <InputLabel>Apartment Phase</InputLabel>
                  <Select
                    name="phase"
                    value={formData.phase.toString()}
                    label="Apartment Phase"
                    onChange={handleSelectChange}
                  >
                    {getPhases(formData.village_id).map(phase => (
                      <MenuItem key={phase} value={phase.toString()}>
                        Phase {phase}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.phase && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                      {errors.phase}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              {/* Owner */}
              <Grid size={{xs: 12}}>
                <FormControl fullWidth error={!!errors.owner_id} required>
                  <InputLabel>Owner Name</InputLabel>
                  <Select
                    name="owner_id"
                    value={formData.owner_id.toString()}
                    label="Owner Name"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="0">
                      <em>Select Owner</em>
                    </MenuItem>
                    {owners.map(owner => (
                      <MenuItem key={owner.id} value={owner.id.toString()}>
                        {owner.name} ({owner.email})
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.owner_id && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                      {errors.owner_id}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              {/* Purchase Date */}
              <Grid size={{xs: 12, sm: 6}}>
                <TextField
                  fullWidth
                  label="Purchase Date"
                  name="purchase_date"
                  type="date"
                  value={formData.purchase_date || ''}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              {/* Paying Status */}
              <Grid size={{xs: 12, sm: 6}}>
                <FormControl fullWidth required>
                  <InputLabel>Paying Status</InputLabel>
                  <Select
                    name="paying_status"
                    value={formData.paying_status}
                    label="Paying Status"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="transfer">Payed By Transfer</MenuItem>
                    <MenuItem value="rent">Payed By Rent</MenuItem>
                    <MenuItem value="non-payer">Non-Payer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Action Buttons */}
              <Grid size={{xs: 12}}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleBack}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={saving}
                  >
                    {saving ? 'Creating...' : 'Create Apartment'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Container>
  );
} 