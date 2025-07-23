import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Container, 
  Alert,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { serviceTypeService } from '../services/serviceTypeService';
import type { ServiceType, UpdateServiceTypeRequest } from '../services/serviceTypeService';
import { villageService } from '../services/villageService';
import type { Village } from '../services/villageService';

interface VillagePriceForm {
  village_id: number;
  cost: number;
  currency: 'EGP' | 'GBP';
}

export default function ServiceTypeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form data for editing
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const [villagePrices, setVillagePrices] = useState<VillagePriceForm[]>([]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setError('Service type ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [serviceTypeData, villagesData] = await Promise.all([
          serviceTypeService.getServiceTypeById(parseInt(id)),
          villageService.getVillages({ limit: 100 })
        ]);

        setServiceType(serviceTypeData);
        setVillages(villagesData.data);

        // Initialize form data
        setFormData({
          name: serviceTypeData.name,
          description: serviceTypeData.description || '',
        });

        // Initialize village prices
        const prices = villagesData.data.map(village => {
          const existingPrice = serviceTypeData.village_prices?.find(vp => vp.village_id === village.id);
          return {
            village_id: village.id,
            cost: existingPrice?.cost || 0,
            currency: existingPrice?.currency || 'EGP'
          };
        });
        setVillagePrices(prices);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load service type');
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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (serviceType) {
      setFormData({
        name: serviceType.name,
        description: serviceType.description || '',
      });
      
      // Reset village prices
      const prices = villages.map(village => {
        const existingPrice = serviceType.village_prices?.find(vp => vp.village_id === village.id);
        return {
          village_id: village.id,
          cost: existingPrice?.cost || 0,
          currency: existingPrice?.currency || 'EGP'
        };
      });
      setVillagePrices(prices);
    }
  };

  const handleSave = async () => {
    if (!id || !serviceType) return;

    try {
      setSubmitting(true);
      setError(null);

      // Filter out village prices with cost 0 or less
      const validVillagePrices = villagePrices.filter(vp => vp.cost > 0);

      const updateData: UpdateServiceTypeRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        village_prices: validVillagePrices
      };

      const updatedServiceType = await serviceTypeService.updateServiceType(parseInt(id), updateData);
      setServiceType(updatedServiceType);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    const confirmMessage = 'Are you sure you want to delete this service type? This action cannot be undone.';
    if (window.confirm(confirmMessage)) {
      try {
        setSubmitting(true);
        await serviceTypeService.deleteServiceType(parseInt(id));
        navigate('/services?tab=0'); // Navigate back to service types tab
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete service type');
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    navigate('/services?tab=0');
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

  const canEdit = () => {
    return currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  };

  const canDelete = () => {
    return currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
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

  if (error && !serviceType) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Services
        </Button>
      </Container>
    );
  }

  if (!serviceType) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>Service type not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Services
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4, mt: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="text" color="primary" startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Back
            </Button>
            <Typography variant="h4">
              {serviceType.name}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isEditing && canEdit() && (
              <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
                Edit
              </Button>
            )}
            {!isEditing && canDelete() && (
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                disabled={submitting}
              >
                Delete
              </Button>
            )}
            {isEditing && (
              <>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Basic Information */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="text.secondary">Service Name</Typography>
              {isEditing ? (
                <TextField
                  fullWidth
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  size="small"
                  sx={{ mt: 1 }}
                />
              ) : (
                <Typography variant="body1" sx={{ mt: 0.5 }}>{serviceType.name}</Typography>
              )}
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="text.secondary">Description</Typography>
              {isEditing ? (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  size="small"
                  sx={{ mt: 1 }}
                />
              ) : (
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {serviceType.description || 'No description provided'}
                </Typography>
              )}
            </Grid>
          </Grid>
        </Paper>

        {/* Village-Specific Pricing */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Village-Specific Pricing
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          {isEditing ? (
            <Grid container spacing={3}>
              {villages.map(village => {
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
                          <Grid size={{ xs: 8 }}>
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
                          <Grid size={{ xs: 4 }}>
                            <FormControl fullWidth size="small">
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
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Village</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Currency</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {serviceType.village_prices?.map(vp => {
                    const village = villages.find(v => v.id === vp.village_id);
                    return (
                      <TableRow key={vp.id}>
                        <TableCell>{village?.name || 'Unknown Village'}</TableCell>
                        <TableCell align="right">{vp.cost.toFixed(2)}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={vp.currency} 
                            size="small" 
                            color={vp.currency === 'EGP' ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  }) || (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography color="text.secondary">
                          No pricing information available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Additional Information */}
        {!isEditing && (
          <Card>
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