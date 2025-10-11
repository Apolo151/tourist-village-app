import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { payingStatusTypeService } from '../services/payingStatusTypeService';
import { salesStatusTypeService } from '../services/salesStatusTypeService';
import type { Village } from '../services/villageService';
import type { User } from '../services/userService';
import type { PayingStatusType } from '../services/payingStatusTypeService';
import type { SalesStatusType } from '../services/salesStatusTypeService';
import type { Apartment, UpdateApartmentRequest } from '../services/apartmentService';
import SearchableDropdown from '../components/SearchableDropdown';

export default function EditApartment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [villages, setVillages] = useState<Village[]>([]);
  const [owners, setOwners] = useState<User[]>([]);
  const [payingStatusTypes, setPayingStatusTypes] = useState<PayingStatusType[]>([]);
  const [salesStatusTypes, setSalesStatusTypes] = useState<SalesStatusType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchingOwners, setSearchingOwners] = useState(false);
  const [ownerSearchText, setOwnerSearchText] = useState('');
  
  const [formData, setFormData] = useState<UpdateApartmentRequest>({
    name: '',
    village_id: 0,
    phase: 1,
    owner_id: 0,
    purchase_date: '',
    paying_status_id: 0,
    sales_status_id: 0
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/apartments');
      return;
    }
    if (!id) {
      navigate('/apartments');
      return;
    }
    loadData();
  }, [isAdmin, id, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [apartmentData, villagesData, payingStatusData, salesStatusData] = await Promise.all([
        apartmentService.getApartmentById(parseInt(id!)),
        villageService.getVillages({ limit: 100 }),
        payingStatusTypeService.getPayingStatusTypes({ limit: 100, is_active: true }),
        salesStatusTypeService.getSalesStatusTypes({ limit: 100, is_active: true })
      ]);
      
      setApartment(apartmentData);
      setVillages(villagesData.data);
      setPayingStatusTypes(payingStatusData.data);
      setSalesStatusTypes(salesStatusData.data);
      
      // Set form data from apartment
      setFormData({
        name: apartmentData.name,
        village_id: apartmentData.village_id,
        phase: apartmentData.phase,
        owner_id: apartmentData.owner_id,
        purchase_date: apartmentData.purchase_date ? apartmentData.purchase_date.split('T')[0] : '',
        paying_status_id: apartmentData.paying_status_id,
        sales_status_id: apartmentData.sales_status_id
      });

      // Load the current owner data
      if (apartmentData.owner_id) {
        try {
          const ownerData = await userService.getUserById(apartmentData.owner_id);
          if (ownerData) {
            setOwners([ownerData]);
            setOwnerSearchText(ownerData.name);
          }
        } catch (err) {
          console.error('Error loading owner data:', err);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load apartment data');
    } finally {
      setLoading(false);
    }
  };

  const getPhases = (villageId: number) => {
    if (!villages || villages.length === 0) return [];
    const village = villages.find(v => v.id === villageId);
    if (!village) return [];
    return Array.from({ length: village.phases }, (_, i) => i + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
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
        phase: 1
      }));
    } else if (name === 'owner_id') {
      setFormData(prev => ({ ...prev, owner_id: parseInt(value) }));
    } else if (name === 'phase') {
      setFormData(prev => ({ ...prev, phase: parseInt(value) }));
    } else if (name === 'paying_status_id') {
      setFormData(prev => ({ ...prev, paying_status_id: parseInt(value) }));
    } else if (name === 'sales_status_id') {
      setFormData(prev => ({ ...prev, sales_status_id: parseInt(value) }));
    }
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /**
   * Handle owner search with server-side filtering
   */
  const handleOwnerSearch = async (searchQuery: string): Promise<void> => {
    if (searchQuery.length < 2) return;

    try {
      setSearchingOwners(true);
      const result = await userService.getUsers({ 
        role: 'owner',
        search: searchQuery,
        limit: 50
      });
      
      setOwners(result.data);
    } catch (err) {
      console.error('Error searching for owners:', err);
    } finally {
      setSearchingOwners(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
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

    if (!formData.paying_status_id) {
      newErrors.paying_status_id = 'Paying status is required';
    }

    if (!formData.sales_status_id) {
      newErrors.sales_status_id = 'Sales status is required';
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
      
      await apartmentService.updateApartment(parseInt(id!), formData);
      
      navigate(`/apartments/${id}?success=true&message=${encodeURIComponent('Apartment updated successfully')}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update apartment');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(`/apartments/${id}`);
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

  if (!apartment) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>Apartment not found</Alert>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/apartments')} 
          sx={{ mt: 2 }}
        >
          Back to Apartments
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4, mt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            variant="text"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Back to Apartment
          </Button>
          <Typography variant="h4">Edit Apartment</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid size={{xs: 12}}>
                <TextField
                  fullWidth
                  label="Apartment Name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                />
              </Grid>

              <Grid size={{xs: 12, sm: 6}}>
                <FormControl fullWidth error={!!errors.village_id} required>
                  <InputLabel>Project</InputLabel>
                  <Select
                    name="village_id"
                    value={formData.village_id?.toString() || ''}
                    label="Project"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="">
                      <em>Select Project</em>
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

              <Grid size={{xs: 12, sm: 6}}>
                <FormControl fullWidth error={!!errors.phase} required disabled={!formData.village_id}>
                  <InputLabel>Apartment Phase</InputLabel>
                  <Select
                    name="phase"
                    value={formData.phase?.toString() || ''}
                    label="Apartment Phase"
                    onChange={handleSelectChange}
                  >
                    {getPhases(formData.village_id || 0).map(phase => (
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

              <Grid size={{xs: 12}}>
                <SearchableDropdown
                  options={owners.map(owner => ({
                    id: owner.id,
                    label: `${owner.name} (${owner.email})${owner.phone_number ? ` - ${owner.phone_number}` : ''}`,
                    name: owner.name,
                    email: owner.email,
                    phone_number: owner.phone_number
                  }))}
                  value={formData.owner_id || null}
                  onChange={(value) => setFormData(prev => ({ ...prev, owner_id: value as number || 0 }))}
                  label="Owner Name"
                  placeholder="Type at least 2 characters to search owners..."
                  required
                  disabled={saving}
                  error={!!errors.owner_id}
                  helperText={errors.owner_id || 'Search for apartment owners by name or email'}
                  getOptionLabel={(option) => option.label}
                  loading={searchingOwners}
                  serverSideSearch={true}
                  onServerSearch={handleOwnerSearch}
                  inputValue={ownerSearchText}
                  onInputChange={(value) => setOwnerSearchText(value)}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body1">{option.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.email}{option.phone_number ? ` • ${option.phone_number}` : ''}
                        </Typography>
                      </Box>
                    </li>
                  )}
                />
              </Grid>

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

              <Grid size={{xs: 12, sm: 6}}>
                <FormControl fullWidth error={!!errors.paying_status_id} required>
                  <InputLabel>Paying Status</InputLabel>
                  <Select
                    name="paying_status_id"
                    value={(formData.paying_status_id || 0).toString()}
                    label="Paying Status"
                    onChange={handleSelectChange}
                  >
                    {payingStatusTypes.map(status => (
                      <MenuItem key={status.id} value={status.id.toString()}>
                        {status.display_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.paying_status_id && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                      {errors.paying_status_id}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid size={{xs: 12}}>
                <FormControl fullWidth error={!!errors.sales_status_id} required>
                  <InputLabel>Sales Status</InputLabel>
                  <Select
                    name="sales_status_id"
                    value={(formData.sales_status_id || 0).toString()}
                    label="Sales Status"
                    onChange={handleSelectChange}
                  >
                    {salesStatusTypes.map(status => (
                      <MenuItem key={status.id} value={status.id.toString()}>
                        {status.display_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.sales_status_id && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                      {errors.sales_status_id}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
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
                {saving ? 'Updating...' : 'Update Apartment'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}