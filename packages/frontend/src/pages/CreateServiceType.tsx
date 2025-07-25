import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Container,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { serviceTypeService } from '../services/serviceTypeService';
import type { CreateServiceTypeRequest } from '../services/serviceTypeService';
import { villageService } from '../services/villageService';
import type { Village } from '../services/villageService';

interface VillagePriceForm {
  village_id: number;
  cost: number;
  currency: 'EGP' | 'GBP';
}

export default function CreateServiceType() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Data states
  const [villages, setVillages] = useState<Village[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const [villagePrices, setVillagePrices] = useState<VillagePriceForm[]>([]);
  
  // Load initial data (villages and, if editing, service type)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const villagesData = await villageService.getVillages({ limit: 100 });
        setVillages(villagesData.data);

        if (id) {
          // Edit mode: fetch service type and prefill
          const serviceType = await serviceTypeService.getServiceTypeById(Number(id));
          setFormData({
            name: serviceType.name,
            description: serviceType.description || ''
          });
          // Prefill village prices
          const prices = villagesData.data.map(village => {
            const existing = serviceType.village_prices?.find(vp => vp.village_id === village.id);
            return {
              village_id: village.id,
              cost: existing?.cost || 0,
              currency: existing?.currency || 'EGP'
            };
          });
          setVillagePrices(prices);
          setIsEditMode(true);
        } else {
          // Create mode: default values
          const initialPrices = villagesData.data.map(village => ({
            village_id: village.id,
            cost: 0,
            currency: 'EGP' as 'EGP' | 'GBP'
          }));
          setVillagePrices(initialPrices);
          setIsEditMode(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVillagePriceChange = (villageId: number, field: 'cost' | 'currency', value: string | number) => {
    setVillagePrices(prev => prev.map(vp => 
      vp.village_id === villageId 
        ? { ...vp, [field]: field === 'cost' ? parseFloat(value as string) || 0 : value }
        : vp
    ));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Service type name is required';
    }

    // Validate that at least one village has a valid price
    const validPrices = villagePrices.filter(vp => vp.cost > 0);
    if (validPrices.length === 0) {
      return 'At least one village must have a valid price greater than 0';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Filter out village prices with cost 0 or less
      const validVillagePrices = villagePrices.filter(vp => vp.cost > 0);

      if (isEditMode && id) {
        // Edit mode: update
        await serviceTypeService.updateServiceType(Number(id), {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          village_prices: validVillagePrices
        });
      } else {
        // Create mode: create
        await serviceTypeService.createServiceType({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          village_prices: validVillagePrices
        });
      }
      navigate('/services?tab=0'); // Navigate to service types tab
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save service type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/services');
  };

  const copyPriceToAll = (villageId: number) => {
    const sourcePrice = villagePrices.find(vp => vp.village_id === villageId);
    if (sourcePrice && sourcePrice.cost > 0) {
      setVillagePrices(prev => prev.map(vp => ({
        ...vp,
        cost: sourcePrice.cost,
        currency: sourcePrice.currency
      })));
    }
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

  if (error && villages.length === 0) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleCancel} sx={{ mt: 2 }}>
          Back to Services
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', mb: 4, mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            variant="text"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={handleCancel}
          >
            Back
          </Button>
          <Typography variant="h4" sx={{ ml: 2 }}>
            {isEditMode ? 'Edit Service Type' : 'Create Service Type'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        {/* Basic Information */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Service Type Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Plumbing Repair, Electrical Maintenance"
              />
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={3}
                placeholder="Describe what this service includes..."
              />
            </Grid>
            
            {/* Removed Default Assignee Field */}
          </Grid>
        </Paper>

        {/* Village-Specific Pricing */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Village-Specific Pricing
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set different prices for each village
            </Typography>
          </Box>
          
          <Grid container spacing={3}>
            {villages.map((village, index) => {
              const villagePrice = villagePrices.find(vp => vp.village_id === village.id);
              
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={village.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {village.name}
                        </Typography>
                        {villagePrice && villagePrice.cost > 0 && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => copyPriceToAll(village.id)}
                            title="Copy this price to all villages"
                          >
                            Copy to All
                          </Button>
                        )}
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 8, sm: 7, md: 6 }}>
                          <TextField
                            fullWidth
                            label="Cost"
                            type="number"
                            value={villagePrice?.cost || 0}
                            onChange={(e) => handleVillagePriceChange(village.id, 'cost', e.target.value)}
                            inputProps={{ min: 0, step: 0.01 }}
                            size="small"
                          />
                        </Grid>
                        <Grid size={{ xs: 4, sm: 5, md: 6 }}>
                          <FormControl fullWidth size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Currency</InputLabel>
                            <Select
                              value={villagePrice?.currency || 'EGP'}
                              label="Currency"
                              onChange={(e) => handleVillagePriceChange(village.id, 'currency', e.target.value)}
                            >
                              <MenuItem value="EGP">EGP</MenuItem>
                              <MenuItem value="GBP">GBP</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Paper>

        {/* Summary */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Service Name</Typography>
                <Typography variant="body1">{formData.name || 'Not specified'}</Typography>
              </Box>
              {/* Removed Default Assignee Summary */}
              <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                <Typography variant="subtitle2" color="text.secondary">Village Pricing</Typography>
                <Box sx={{ mt: 1 }}>
                  {villagePrices
                    .filter(vp => vp.cost > 0)
                    .map(vp => {
                      const village = villages.find(v => v.id === vp.village_id);
                      return (
                        <Typography key={vp.village_id} variant="body2" sx={{ mb: 0.5 }}>
                          <strong>{village?.name}:</strong> {vp.cost.toFixed(2)} {vp.currency}
                        </Typography>
                      );
                    })
                  }
                  {villagePrices.filter(vp => vp.cost > 0).length === 0 && (
                    <Typography variant="body2" color="error">
                      No valid pricing set
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
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
            disabled={submitting || !formData.name.trim()}
          >
            {submitting ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Service Type')}
          </Button>
        </Box>
    </Box>
  );
} 