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
  FormControlLabel
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Payment as PaymentIcon,
  Home as HomeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,

  ElectricBolt as ElectricIcon,

  Water as WaterIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { paymentMethodService } from '../services/paymentMethodService';
import { villageService } from '../services/villageService';
import type { User } from '../services/userService';
import type { PaymentMethod } from '../services/paymentMethodService';
import type { Village } from '../services/villageService';

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
  const [users, setUsers] = useState<User[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  // Dialog states
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openVillageDialog, setOpenVillageDialog] = useState(false);

  // Editing states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [editingVillage, setEditingVillage] = useState<Village | null>(null);

  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    role: 'renter' as 'super_admin' | 'admin' | 'owner' | 'renter',
    is_active: true
  });

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
        case 1: // Users tab
          await loadUsers();
          break;
        case 2: // Payment Methods tab
          await loadPaymentMethods();
          break;
        case 3: // Villages tab
          await loadVillages();
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

  const loadUsers = async () => {
    const result = await userService.getUsers({ limit: 100 });
    setUsers(result.data);
  };

  const loadPaymentMethods = async () => {
    const result = await paymentMethodService.getPaymentMethods({ limit: 100 });
    setPaymentMethods(result.data);
  };

  const loadVillages = async () => {
    const result = await villageService.getVillages({ limit: 100 });
    setVillages(result.data);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // User management handlers
  const handleOpenAddUserDialog = () => {
    setEditingUser(null);
    setNewUser({
      name: '',
      email: '',
      password: '',
      phone_number: '',
      role: 'renter',
      is_active: true
    });
    setOpenUserDialog(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      password: '', // Don't pre-fill password
      phone_number: user.phone_number || '',
      role: user.role,
      is_active: user.is_active
    });
    setOpenUserDialog(true);
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.deleteUser(userId);
        setSnackbarMessage('User deleted successfully');
        setOpenSnackbar(true);
        loadUsers();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete user');
      }
    }
  };

  const handleSaveUser = async () => {
    try {
      if (!newUser.name || !newUser.email) {
        setError('Name and email are required');
        return;
      }

      if (editingUser) {
        // Update existing user (without password if empty)
        const updateData: any = {
          name: newUser.name,
          email: newUser.email,
          phone_number: newUser.phone_number || undefined,
          role: newUser.role,
          is_active: newUser.is_active
        };
        
        await userService.updateUser(editingUser.id, updateData);
        setSnackbarMessage('User updated successfully');
      } else {
        // Create new user
        if (!newUser.password) {
          setError('Password is required for new users');
          return;
        }
        
        await userService.createUser(newUser);
        setSnackbarMessage('User created successfully');
      }

      setOpenUserDialog(false);
      setOpenSnackbar(true);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    }
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

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUserRoleChange = (event: SelectChangeEvent) => {
    setNewUser(prev => ({
      ...prev,
      role: event.target.value as 'super_admin' | 'admin' | 'owner' | 'renter'
    }));
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
      [name]: name === 'phases' ? parseInt(value) || 1 : 
               (name === 'electricity_price' || name === 'water_price') ? parseFloat(value) || 0 : value
    }));
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Settings</Typography>
        
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
            <Tab icon={<PersonIcon />} iconPosition="start" label="Manage Users" />
            <Tab icon={<PaymentIcon />} iconPosition="start" label="Payment Methods" />
            <Tab icon={<HomeIcon />} iconPosition="start" label="Village Details" />
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
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Manage Users</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAddUserDialog}
                >
                  Add User
                </Button>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {users.map(user => (
                    <ListItem key={user.id} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">{user.name}</Typography>
                            <Chip 
                              label={user.role} 
                              size="small" 
                              color={
                                user.role === 'super_admin' ? 'error' :
                                user.role === 'admin' ? 'primary' :
                                user.role === 'owner' ? 'secondary' : 'default'
                              }
                            />
                            {!user.is_active && (
                              <Chip label="Inactive" size="small" color="error" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography component="span" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <EmailIcon fontSize="small" />
                              {user.email}
                            </Typography>
                            {user.phone_number && (
                              <Typography component="span" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PhoneIcon fontSize="small" />
                                {user.phone_number}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                              Created: {new Date(user.created_at).toLocaleDateString()}
                              {user.last_login && ` | Last login: ${new Date(user.last_login).toLocaleDateString()}`}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Edit User">
                          <IconButton edge="end" onClick={() => handleEditUser(user)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                          <IconButton edge="end" onClick={() => handleDeleteUser(user.id)}>
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
          
          {/* Villages Tab */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Village Details</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAddVillageDialog}
                >
                  Add Village
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
        </Paper>
      </Box>

      {/* User Dialog */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              name="name"
              value={newUser.name}
              onChange={handleUserChange}
              fullWidth
              required
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={newUser.email}
              onChange={handleUserChange}
              fullWidth
              required
            />
            <TextField
              label="Phone Number"
              name="phone_number"
              value={newUser.phone_number}
              onChange={handleUserChange}
              fullWidth
            />
            {!editingUser && (
              <TextField
                label="Password"
                name="password"
                type="password"
                value={newUser.password}
                onChange={handleUserChange}
                fullWidth
                required
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newUser.role}
                label="Role"
                onChange={handleUserRoleChange}
              >
                <MenuItem value="renter">Renter</MenuItem>
                <MenuItem value="owner">Owner</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                {currentUser?.role === 'super_admin' && (
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={newUser.is_active}
                  onChange={(e) => setNewUser(prev => ({ ...prev, is_active: e.target.checked }))}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveUser}>
            {editingUser ? 'Update User' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Village Dialog */}
      <Dialog open={openVillageDialog} onClose={() => setOpenVillageDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingVillage ? 'Edit Village' : 'Add Village'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Village Name"
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
            {editingVillage ? 'Update Village' : 'Add Village'}
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
  );
}
