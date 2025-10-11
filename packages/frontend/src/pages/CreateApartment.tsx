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
  CircularProgress,
  Grid
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
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
import type { CreateApartmentRequest } from '../services/apartmentService';
import { EnhancedErrorDisplay } from '../components/EnhancedErrorDisplay';
import { ErrorMessageHandler } from '../utils/errorUtils';
import type { DetailedError } from '../utils/errorUtils';
import SearchableDropdown from '../components/SearchableDropdown';
import ClearableSearchDropdown from '../components/ClearableSearchDropdown';

export default function CreateApartment() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Data state
  const [villages, setVillages] = useState<Village[]>([]);
  const [owners, setOwners] = useState<User[]>([]);
  const [payingStatusTypes, setPayingStatusTypes] = useState<PayingStatusType[]>([]);
  const [salesStatusTypes, setSalesStatusTypes] = useState<SalesStatusType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchingOwners, setSearchingOwners] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailedError, setDetailedError] = useState<DetailedError | null>(null);
  const [ownerSearchText, setOwnerSearchText] = useState('');  
  
  // Form state
  const [formData, setFormData] = useState<CreateApartmentRequest>({
    name: '',
    village_id: 0,
    phase: 1,
    owner_id: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    paying_status_id: 0,
    sales_status_id: 0
  });
  
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
      setDetailedError(null);
      
      const [villagesData, payingStatusData, salesStatusData] = await Promise.all([
        villageService.getVillages({ limit: 100 }),
        payingStatusTypeService.getPayingStatusTypes({ limit: 100, is_active: true }),
        salesStatusTypeService.getSalesStatusTypes({ limit: 100, is_active: true })
      ]);
      
      // Initial list of popular/recent owners (limit to 20 to improve performance)
      const usersData = await userService.getUsers({ 
        role: 'owner', 
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc' 
      });
      
      setVillages(villagesData.data);
      setOwners(usersData.data);
      setPayingStatusTypes(payingStatusData.data);
      setSalesStatusTypes(salesStatusData.data);
      
      // Set default values if available
      if (payingStatusData.data.length > 0) {
        const defaultPayingStatus = payingStatusData.data.find(s => s.name === 'non-payer') || payingStatusData.data[0];
        setFormData(prev => ({ ...prev, paying_status_id: defaultPayingStatus.id }));
      }
      
      if (salesStatusData.data.length > 0) {
        const defaultSalesStatus = salesStatusData.data.find(s => s.name === 'not_for_sale') || salesStatusData.data[0];
        setFormData(prev => ({ ...prev, sales_status_id: defaultSalesStatus.id }));
      }
      
      // If the admin has a responsible village, prefill the village field
      if (currentUser?.responsible_village) {
        setFormData(prev => ({
          ...prev,
          village_id: currentUser.responsible_village!
        }));
      }
    } catch (err: any) {
      console.error('Load initial data error:', err);
      const enhancedError = ErrorMessageHandler.parseApiError(err);
      setDetailedError({
        ...enhancedError,
        title: 'Failed to Load Required Data',
        message: 'Could not load villages, owners, and status types required for creating an apartment.',
        action: 'Please refresh the page to try again. If the problem persists, contact support.'
      });
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
    
    // Clear field error for this field
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Clear general error when user starts typing
    if (detailedError) {
      setDetailedError(null);
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
    } else if (name === 'paying_status_id') {
      setFormData(prev => ({ ...prev, paying_status_id: parseInt(value) }));
    } else if (name === 'sales_status_id') {
      setFormData(prev => ({ ...prev, sales_status_id: parseInt(value) }));
    }
    
    // Clear field error for this field
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Clear general error when user makes changes
    if (detailedError) {
      setDetailedError(null);
    }
  };

  const validateForm = (): boolean => {
    const newFieldErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newFieldErrors.name = ErrorMessageHandler.getFormValidationMessage('name', 'required');
    } else if (formData.name.length > 100) {
      newFieldErrors.name = ErrorMessageHandler.getFormValidationMessage('name', 'length_max');
    }
    
    if (!formData.village_id || formData.village_id === 0) {
      newFieldErrors.village_id = ErrorMessageHandler.getFormValidationMessage('village_id', 'required');
    }
    
    if (!formData.owner_id || formData.owner_id === 0) {
      newFieldErrors.owner_id = ErrorMessageHandler.getFormValidationMessage('owner_id', 'required');
    }
    
    if (!formData.phase || formData.phase < 1) {
      newFieldErrors.phase = ErrorMessageHandler.getFormValidationMessage('phase', 'required');
    }
    
    if (typeof formData.paying_status_id !== 'number' || formData.paying_status_id <= 0) {
      newFieldErrors.paying_status_id = 'Payment status is required';
    }
    
    if (typeof formData.sales_status_id !== 'number' || formData.sales_status_id <= 0) {
      newFieldErrors.sales_status_id = 'Sales status is required';
    }
    
    // Validate that selected phase exists for the village
    if (formData.village_id && formData.phase) {
      const availablePhases = getPhases(formData.village_id);
      if (!availablePhases.includes(formData.phase)) {
        newFieldErrors.phase = `Phase ${formData.phase} is not available for this village. Available phases: ${availablePhases.join(', ')}.`;
      }
    }
    
    setFieldErrors(newFieldErrors);
    
    // If there are field errors, show a summary error
    if (Object.keys(newFieldErrors).length > 0) {
      setDetailedError({
        title: 'Form Validation Failed',
        message: 'Please fix the highlighted fields below.',
        action: 'Check each required field and ensure all information is correct before saving.',
        type: 'validation'
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      setDetailedError(null);
      
      const apartment = await apartmentService.createApartment(formData);
      
      // Navigate to the created apartment with success message
      navigate(`/apartments/${apartment.id}?success=true&message=${encodeURIComponent('Apartment created successfully')}`);
    } catch (err: any) {
      console.error('Create apartment error:', err);
      const enhancedError = ErrorMessageHandler.getContextualErrorMessage('create_apartment', err);
      setDetailedError(enhancedError);
    } finally {
      setSaving(false);
    }
  };

  const handleRetrySubmit = () => {
    setDetailedError(null);
    handleSubmit(new Event('submit') as any);
  };

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
      // Don't show an error message to the user during searching
    } finally {
      setSearchingOwners(false);
    }
  };
  
  // Handle clearing the owner selection
  const handleClearOwner = () => {
    // Clear both the search term and the selection
    setOwnerSearchText('');
    setFormData(prev => ({ ...prev, owner_id: 0 }));
    
    // Clear field error for this field if it exists
    if (fieldErrors.owner_id) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.owner_id;
        return newErrors;
      });
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
      <Box sx={{ mb: 4, mt: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Back to Apartments
          </Button>
          <Typography variant="h4" component="h1">
            Create New Apartment
          </Typography>
        </Box>

        {/* Error Display */}
        {detailedError && (
          <Box sx={{ mb: 3 }}>
            <EnhancedErrorDisplay
              error={detailedError}
              onRetry={detailedError.type === 'network' ? loadInitialData : handleRetrySubmit}
              showDetails={true}
            />
          </Box>
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
                  error={!!fieldErrors.name}
                  helperText={fieldErrors.name || 'Enter a unique name for this apartment (e.g., Villa A1, Unit 205)'}
                  required
                  disabled={saving}
                  placeholder="e.g., Villa A1, Unit 205"
                />
              </Grid>

              {/* Village */}
              <Grid size={{xs: 12, sm: 6}}>
                <SearchableDropdown
                  options={villages.map(village => ({
                    id: village.id,
                    label: `${village.name} (${village.phases} phases)`,
                    name: village.name,
                    phases: village.phases
                  }))}
                  value={formData.village_id || null}
                  onChange={(value) => handleSelectChange({ target: { name: 'village_id', value: value?.toString() || '0' } } as SelectChangeEvent<string>)}
                  label="Project"
                  placeholder="Search projects by name..."
                  required
                  disabled={!!currentUser?.responsible_village || saving}
                  error={!!fieldErrors.village_id}
                  helperText={fieldErrors.village_id || (currentUser?.responsible_village ? 'Project pre-filled based on your assigned responsibility' : 'Select the project where this apartment is located')}
                  getOptionLabel={(option) => option.label}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body1">{option.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.phases} phases
                        </Typography>
                      </Box>
                    </li>
                  )}
                />
              </Grid>

              {/* Phase */}
              <Grid size={{xs: 12, sm: 6}}>
                <FormControl fullWidth error={!!fieldErrors.phase} required disabled={!formData.village_id || saving}>
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
                  {fieldErrors.phase && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2, display: 'block' }}>
                      {fieldErrors.phase}
                    </Typography>
                  )}
                  {!formData.village_id && !fieldErrors.phase && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 2, display: 'block' }}>
                      Select a village first to see available phases
                    </Typography>
                  )}
                  {formData.village_id && !fieldErrors.phase && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 2, display: 'block' }}>
                      Phase determines the apartment's development stage
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              {/* Owner */}
              <Grid size={{xs: 12}}>
                <ClearableSearchDropdown
                  options={owners.map(owner => ({
                    id: owner.id,
                    label: `${owner.name} (${owner.email})${owner.phone_number ? ` - ${owner.phone_number}` : ''}`,
                    name: owner.name,
                    email: owner.email,
                    phone_number: owner.phone_number
                  }))}
                  value={formData.owner_id || null}
                  onChange={(value) => handleSelectChange({ target: { name: 'owner_id', value: value?.toString() || '0' } } as SelectChangeEvent<string>)}
                  onClearSelection={handleClearOwner}
                  label="Owner Name"
                  placeholder="Type at least 2 characters to search owners..."
                  required
                  disabled={saving}
                  error={!!fieldErrors.owner_id}
                  helperText={fieldErrors.owner_id || 'Search for apartment owners by name or email'}
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
                  clearable={true}
                  showClearButton={!!formData.owner_id}
                />
              </Grid>

              {/* Purchase Date */}
              <Grid size={{xs: 12, sm: 6}}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Purchase Date"
                    value={formData.purchase_date ? new Date(formData.purchase_date) : null}
                    onChange={(date) => {
                      setFormData(prev => ({
                        ...prev,
                        purchase_date: date ? date.toISOString().split('T')[0] : ''
                      }));
                    }}
                    format="dd/MM/yyyy"
                    slotProps={{ textField: { fullWidth: true, size: 'small', margin: 'dense', helperText: 'When was this apartment purchased? (Optional)', disabled: saving } }}
                  />
                </LocalizationProvider>
              </Grid>

              {/* Paying Status */}
              <Grid size={{xs: 12, sm: 6}}>
                <FormControl fullWidth error={!!fieldErrors.paying_status_id} required disabled={saving}>
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    name="paying_status_id"
                    value={(formData.paying_status_id || 0).toString()}
                    label="Payment Status"
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    {payingStatusTypes.map(status => (
                      <MenuItem key={status.id} value={status.id}>
                        {status.display_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.paying_status_id && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2, display: 'block' }}>
                      {fieldErrors.paying_status_id}
                    </Typography>
                  )}
                  {!payingStatusTypes.length && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 2, display: 'block' }}>
                      No payment status types available. Please add one in the settings.
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              {/* Sales Status */}
              <Grid size={{xs: 12}}>
                <FormControl fullWidth error={!!fieldErrors.sales_status_id} required disabled={saving}>
                  <InputLabel>Sales Status</InputLabel>
                  <Select
                    name="sales_status_id"
                    value={(formData.sales_status_id || 0).toString()}
                    label="Sales Status"
                    onChange={handleSelectChange}
                    disabled={saving}
                  >
                    {salesStatusTypes.map(status => (
                      <MenuItem key={status.id} value={status.id}>
                        {status.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.sales_status_id && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2, display: 'block' }}>
                      {fieldErrors.sales_status_id}
                    </Typography>
                  )}
                  {!salesStatusTypes.length && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 2, display: 'block' }}>
                      No sales status types available. Please add one in the settings.
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                onClick={handleBack}
                disabled={saving}
                variant="outlined"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Apartment'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
} 