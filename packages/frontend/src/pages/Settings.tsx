import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
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
  Card,
  CardContent,
  CardActions,
  Chip,
  Grid,
  CircularProgress,
  Container,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Payment as PaymentIcon,
  Home as HomeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  ElectricBolt as ElectricIcon,
  Water as WaterIcon,
  AccountBalance as PayingStatusIcon,
  AttachMoney as SalesStatusIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { paymentMethodService } from '../services/paymentMethodService';
import { villageService } from '../services/villageService';
import { payingStatusTypeService } from '../services/payingStatusTypeService';
import { salesStatusTypeService } from '../services/salesStatusTypeService';
import type { PaymentMethod } from '../services/paymentMethodService';
import type { Village } from '../services/villageService';
import type { PayingStatusType } from '../services/payingStatusTypeService';
import type { SalesStatusType } from '../services/salesStatusTypeService';
import Users from './Users';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default function Settings() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Data states
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [payingStatusTypes, setPayingStatusTypes] = useState<PayingStatusType[]>([]);
  const [salesStatusTypes, setSalesStatusTypes] = useState<SalesStatusType[]>([]);

  // Dialog states
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openVillageDialog, setOpenVillageDialog] = useState(false);
  const [openPayingStatusDialog, setOpenPayingStatusDialog] = useState(false);
  const [openSalesStatusDialog, setOpenSalesStatusDialog] = useState(false);

  // Editing states
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [editingVillage, setEditingVillage] = useState<Village | null>(null);
  const [editingPayingStatus, setEditingPayingStatus] = useState<PayingStatusType | null>(null);
  const [editingSalesStatus, setEditingSalesStatus] = useState<SalesStatusType | null>(null);

  // Form states
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    name: '',
    description: ''
  });

  const [newVillage, setNewVillage] = useState({
    name: '',
    electricity_price: 1.5,
    water_price: 0.75,
    phases: 1
  });

  const [newPayingStatus, setNewPayingStatus] = useState({
    name: '',
    display_name: '',
    description: '',
    is_active: true
  });

  const [newSalesStatus, setNewSalesStatus] = useState({
    name: '',
    display_name: '',
    description: '',
    is_active: true
  });

  // Only show user management for super_admins
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Admin check
  useEffect(() => {
    if (currentUser && !['admin', 'super_admin'].includes(currentUser.role)) {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);

  // Load data when tab changes
  useEffect(() => {
    loadTabData();
  }, [tabValue]);

  const loadTabData = async () => {
    setLoading(true);
    setError('');

    try {
      switch (tabValue) {
        case 2: // Payment Methods tab
          await loadPaymentMethods();
          break;
        case 3: // Villages tab
          await loadVillages();
          break;
        case 4: // Paying Status Types tab
          await loadPayingStatusTypes();
          break;
        case 5: // Sales Status Types tab
          await loadSalesStatusTypes();
          break;
        default:
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    const result = await paymentMethodService.getPaymentMethods({ limit: 100 });
    setPaymentMethods(result.data);
  };

  const loadVillages = async () => {
    try {
      // Only load villages if user is admin or super_admin
      if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
        return;
      }
      
      const result = await villageService.getVillages({ limit: 100 });
      setVillages(result.data);
    } catch (error) {
      console.error('Failed to load villages:', error);
      // Don't show error to user if they don't have permission
      if (error instanceof Error && error.message.includes('401')) {
        console.warn('User does not have permission to view villages');
      }
    }
  };

  const loadPayingStatusTypes = async () => {
    const result = await payingStatusTypeService.getPayingStatusTypes({ limit: 100 });
    setPayingStatusTypes(result.data);
  };

  const loadSalesStatusTypes = async () => {
    const result = await salesStatusTypeService.getSalesStatusTypes({ limit: 100 });
    setSalesStatusTypes(result.data);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Payment method handlers
  const handleOpenAddPaymentDialog = () => {
    setEditingPayment(null);
    setNewPaymentMethod({ name: '', description: '' });
    setOpenPaymentDialog(true);
  };

  const handleEditPaymentMethod = (payment: PaymentMethod) => {
    setEditingPayment(payment);
    setNewPaymentMethod({
      name: payment.name,
      description: payment.description || ''
    });
    setOpenPaymentDialog(true);
  };

  const handleDeletePaymentMethod = async (paymentId: number) => {
    if (window.confirm('Are you sure you want to delete this payment method?')) {
      try {
        await paymentMethodService.deletePaymentMethod(paymentId);
        setSnackbarMessage('Payment method deleted successfully');
        setOpenSnackbar(true);
        loadPaymentMethods();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete payment method');
      }
    }
  };

  const handleSavePaymentMethod = async () => {
    try {
      if (!newPaymentMethod.name) {
        setError('Payment method name is required');
        return;
      }

      if (editingPayment) {
        await paymentMethodService.updatePaymentMethod(editingPayment.id, newPaymentMethod);
        setSnackbarMessage('Payment method updated successfully');
      } else {
        await paymentMethodService.createPaymentMethod(newPaymentMethod);
        setSnackbarMessage('Payment method created successfully');
      }

      setOpenPaymentDialog(false);
      setOpenSnackbar(true);
      loadPaymentMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment method');
    }
  };

  // Village handlers
  const handleOpenAddVillageDialog = () => {
    setEditingVillage(null);
    setNewVillage({
      name: '',
      electricity_price: 1.5,
      water_price: 0.75,
      phases: 1
    });
    setOpenVillageDialog(true);
  };

  const handleEditVillage = (village: Village) => {
    setEditingVillage(village);
    setNewVillage({
      name: village.name,
      electricity_price: village.electricity_price,
      water_price: village.water_price,
      phases: village.phases
    });
    setOpenVillageDialog(true);
  };

  const handleDeleteVillage = async (villageId: number) => {
    if (window.confirm('Are you sure you want to delete this village?')) {
      try {
        await villageService.deleteVillage(villageId);
        setSnackbarMessage('Village deleted successfully');
        setOpenSnackbar(true);
        loadVillages();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete village');
      }
    }
  };

  const handleSaveVillage = async () => {
    try {
      if (!newVillage.name) {
        setError('Village name is required');
        return;
      }

      if (editingVillage) {
        await villageService.updateVillage(editingVillage.id, newVillage);
        setSnackbarMessage('Village updated successfully');
      } else {
        await villageService.createVillage(newVillage);
        setSnackbarMessage('Village created successfully');
      }

      setOpenVillageDialog(false);
      setOpenSnackbar(true);
      loadVillages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save village');
    }
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
    setNewPaymentMethod(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleVillageChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewVillage(prev => ({
      ...prev,
      [name]: name === 'phases' ? (value === '' ? '' : parseInt(value)) : 
               (name === 'electricity_price' || name === 'water_price') ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
    } catch {
      return dateString;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ mt: 3 }}>Settings</Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
        )}
        
        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="settings tabs"
          >
            <Tab icon={<SettingsIcon />} iconPosition="start" label="General" />
            {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
              <Tab icon={<PersonIcon />} iconPosition="start" label="Manage Users" />
            )}
            <Tab icon={<PaymentIcon />} iconPosition="start" label="Payment Methods" />
            {(currentUser?.role === 'super_admin') && (
              <Tab icon={<HomeIcon />} iconPosition="start" label="Project Details" />
            )}
            <Tab icon={<PayingStatusIcon />} iconPosition="start" label="Paying Status Types" />
            <Tab icon={<SalesStatusIcon />} iconPosition="start" label="Sales Status Types" />
          </Tabs>
          
          {/* General Settings Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>General Settings</Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Alert severity="info">
                General settings configuration will be implemented in future updates.
              </Alert>
            </Box>
          </TabPanel>
          
          {/* Users Management Tab */}
          <TabPanel value={tabValue} index={1}>
            {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') ? (
              <Users hideSuperAdmin={currentUser?.role === 'admin'} />
            ) : (currentUser?.role === 'owner' || currentUser?.role === 'renter') ? (
              <Box sx={{ p: 3 }}>
                <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom>My Profile</Typography>
                    <List>
                      <ListItem><ListItemText primary="Name" secondary={currentUser?.name} /></ListItem>
                      <ListItem><ListItemText primary="Email" secondary={currentUser?.email} /></ListItem>
                      <ListItem><ListItemText primary="Phone" secondary={currentUser?.phone_number || '-'} /></ListItem>
                      <ListItem><ListItemText primary="Role" secondary={currentUser?.role} /></ListItem>
                    </List>
                    <Button variant="contained">Edit Profile</Button>
                  </Paper>
                </Box>
              </Box>
            ) : null}
          </TabPanel>
          
          {/* Payment Methods Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Payment Methods</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAddPaymentDialog}
                >
                  Add Payment Method
                </Button>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {paymentMethods.map(method => (
                    <ListItem key={method.id} divider>
                      <ListItemText
                        primary={method.name}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {method.description || 'No description provided'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Created by: {method.creator?.name || 'Unknown'} | 
                              {' '}Created: {new Date(method.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Edit Payment Method">
                          <IconButton edge="end" onClick={() => handleEditPaymentMethod(method)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Payment Method">
                          <IconButton edge="end" onClick={() => handleDeletePaymentMethod(method.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </TabPanel>
          
          {/* Projects Tab */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Project Details</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAddVillageDialog}
                >
                  Add Project
                </Button>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {villages.map(village => (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={village.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Typography variant="h6" gutterBottom>{village.name}</Typography>
                            <Chip label={`${village.phases} Phases`} color="primary" size="small" />
                          </Box>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ElectricIcon fontSize="small" color="warning" />
                              <Typography variant="body2">
                                Electricity: {village.electricity_price} EGP/unit
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <WaterIcon fontSize="small" color="info" />
                              <Typography variant="body2">
                                Water: {village.water_price} EGP/unit
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                            Created: {new Date(village.created_at).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button 
                            size="small" 
                            startIcon={<EditIcon />} 
                            onClick={() => handleEditVillage(village)}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="small" 
                            color="error" 
                            startIcon={<DeleteIcon />} 
                            onClick={() => handleDeleteVillage(village.id)}
                          >
                            Delete
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </TabPanel>

          {/* Paying Status Types Tab */}
          <TabPanel value={tabValue} index={4}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Paying Status Types</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingPayingStatus(null);
                    setNewPayingStatus({ name: '', display_name: '', description: '', is_active: true });
                    setOpenPayingStatusDialog(true);
                  }}
                >
                  Add Paying Status Type
                </Button>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {payingStatusTypes.map(status => (
                    <ListItem key={status.id} divider>
                      <ListItemText
                        primary={status.name}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Display Name: {status.display_name}
                            </Typography>
                            <Typography variant="body2">
                              Description: {status.description || 'No description'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Is Active: {status.is_active ? 'Yes' : 'No'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Created by: {status.creator?.name || 'Unknown'} | 
                              {' '}Created: {new Date(status.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Edit Paying Status Type">
                          <IconButton edge="end" onClick={() => {
                            setEditingPayingStatus(status);
                            setNewPayingStatus({
                              name: status.name,
                              display_name: status.display_name,
                              description: status.description || '',
                              is_active: status.is_active
                            });
                            setOpenPayingStatusDialog(true);
                          }}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Paying Status Type">
                          <IconButton edge="end" onClick={() => {
                            if (window.confirm('Are you sure you want to delete this paying status type?')) {
                              try {
                                payingStatusTypeService.deletePayingStatusType(status.id);
                                setSnackbarMessage('Paying status type deleted successfully');
                                setOpenSnackbar(true);
                                loadPayingStatusTypes();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to delete paying status type');
                              }
                            }
                          }}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </TabPanel>

          {/* Sales Status Types Tab */}
          <TabPanel value={tabValue} index={5}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Sales Status Types</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingSalesStatus(null);
                    setNewSalesStatus({ name: '', display_name: '', description: '', is_active: true });
                    setOpenSalesStatusDialog(true);
                  }}
                >
                  Add Sales Status Type
                </Button>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {salesStatusTypes.map(status => (
                    <ListItem key={status.id} divider>
                      <ListItemText
                        primary={status.name}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Display Name: {status.display_name}
                            </Typography>
                            <Typography variant="body2">
                              Description: {status.description || 'No description'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Is Active: {status.is_active ? 'Yes' : 'No'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Created by: {status.creator?.name || 'Unknown'} | 
                              {' '}Created: {new Date(status.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Edit Sales Status Type">
                          <IconButton edge="end" onClick={() => {
                            setEditingSalesStatus(status);
                            setNewSalesStatus({
                              name: status.name,
                              display_name: status.display_name,
                              description: status.description || '',
                              is_active: status.is_active
                            });
                            setOpenSalesStatusDialog(true);
                          }}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Sales Status Type">
                          <IconButton edge="end" onClick={() => {
                            if (window.confirm('Are you sure you want to delete this sales status type?')) {
                              try {
                                salesStatusTypeService.deleteSalesStatusType(status.id);
                                setSnackbarMessage('Sales status type deleted successfully');
                                setOpenSnackbar(true);
                                loadSalesStatusTypes();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to delete sales status type');
                              }
                            }
                          }}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </TabPanel>
        </Paper>
      </Box>

      {/* Payment Method Dialog */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPayment ? 'Edit Payment Method' : 'Add Payment Method'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={newPaymentMethod.name}
              onChange={(e) => handlePaymentMethodChange(e, 'name')}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newPaymentMethod.description}
              onChange={(e) => handlePaymentMethodChange(e, 'description')}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSavePaymentMethod}>
            {editingPayment ? 'Update Method' : 'Add Method'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Dialog */}
      <Dialog open={openVillageDialog} onClose={() => setOpenVillageDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingVillage ? 'Edit Project' : 'Add Project'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Project Name"
              name="name"
              value={newVillage.name}
              onChange={handleVillageChange}
              fullWidth
              required
            />
            <TextField
              label="Electricity Price (EGP/unit)"
              name="electricity_price"
              type="number"
              value={newVillage.electricity_price}
              onChange={handleVillageChange}
              fullWidth
              required
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
            <TextField
              label="Water Price (EGP/unit)"
              name="water_price"
              type="number"
              value={newVillage.water_price}
              onChange={handleVillageChange}
              fullWidth
              required
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
            <TextField
              label="Number of Phases"
              name="phases"
              type="number"
              value={newVillage.phases}
              onChange={handleVillageChange}
              fullWidth
              required
              InputProps={{ inputProps: { min: 1, max: 20 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVillageDialog(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveVillage}>
            {editingVillage ? 'Update Project' : 'Add Project'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Paying Status Type Dialog */}
      <Dialog open={openPayingStatusDialog} onClose={() => setOpenPayingStatusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPayingStatus ? 'Edit Paying Status Type' : 'Add Paying Status Type'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              name="name"
              value={newPayingStatus.name}
              onChange={(e) => setNewPayingStatus(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              helperText="Internal name (e.g., 'transfer', 'rent', 'non-payer')"
            />
            <TextField
              label="Display Name"
              name="display_name"
              value={newPayingStatus.display_name}
              onChange={(e) => setNewPayingStatus(prev => ({ ...prev, display_name: e.target.value }))}
              fullWidth
              required
              helperText="User-friendly name (e.g., 'Paid by Transfer')"
            />
            <TextField
              label="Description"
              name="description"
              value={newPayingStatus.description}
              onChange={(e) => setNewPayingStatus(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              helperText="Optional description explaining this status"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newPayingStatus.is_active}
                  onChange={(e) => setNewPayingStatus(prev => ({ ...prev, is_active: e.target.checked }))}
                  name="is_active"
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPayingStatusDialog(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={async () => {
            try {
              if (editingPayingStatus) {
                await payingStatusTypeService.updatePayingStatusType(editingPayingStatus.id, newPayingStatus);
                setSnackbarMessage('Paying status type updated successfully');
              } else {
                await payingStatusTypeService.createPayingStatusType(newPayingStatus);
                setSnackbarMessage('Paying status type created successfully');
              }
              setOpenPayingStatusDialog(false);
              setOpenSnackbar(true);
              loadPayingStatusTypes();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to save paying status type');
            }
          }}>
            {editingPayingStatus ? 'Update Status Type' : 'Add Status Type'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sales Status Type Dialog */}
      <Dialog open={openSalesStatusDialog} onClose={() => setOpenSalesStatusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSalesStatus ? 'Edit Sales Status Type' : 'Add Sales Status Type'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              name="name"
              value={newSalesStatus.name}
              onChange={(e) => setNewSalesStatus(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              helperText="Internal name (e.g., 'for_sale', 'not_for_sale')"
            />
            <TextField
              label="Display Name"
              name="display_name"
              value={newSalesStatus.display_name}
              onChange={(e) => setNewSalesStatus(prev => ({ ...prev, display_name: e.target.value }))}
              fullWidth
              required
              helperText="User-friendly name (e.g., 'For Sale')"
            />
            <TextField
              label="Description"
              name="description"
              value={newSalesStatus.description}
              onChange={(e) => setNewSalesStatus(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              helperText="Optional description explaining this status"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newSalesStatus.is_active}
                  onChange={(e) => setNewSalesStatus(prev => ({ ...prev, is_active: e.target.checked }))}
                  name="is_active"
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSalesStatusDialog(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={async () => {
            try {
              if (editingSalesStatus) {
                await salesStatusTypeService.updateSalesStatusType(editingSalesStatus.id, newSalesStatus);
                setSnackbarMessage('Sales status type updated successfully');
              } else {
                await salesStatusTypeService.createSalesStatusType(newSalesStatus);
                setSnackbarMessage('Sales status type created successfully');
              }
              setOpenSalesStatusDialog(false);
              setOpenSnackbar(true);
              loadSalesStatusTypes();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to save sales status type');
            }
          }}>
            {editingSalesStatus ? 'Update Status Type' : 'Add Status Type'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        message={snackbarMessage}
      />
          </Container>
    </LocalizationProvider>
    );
  }
