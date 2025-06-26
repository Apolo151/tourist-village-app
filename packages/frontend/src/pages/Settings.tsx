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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Pagination,
  Stack
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
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
  Water as WaterIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
  AdminPanelSettings as AdminIcon,
  AccountCircle as OwnerIcon,
  PersonOutline as RenterIcon
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
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  // User filtering states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userVillageFilter, setUserVillageFilter] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('');
  const [userStartDate, setUserStartDate] = useState<Date | null>(null);
  const [userEndDate, setUserEndDate] = useState<Date | null>(null);

  // User pagination
  const [userPage, setUserPage] = useState(1);
  const [userPageSize] = useState(10);

  // Dialog states
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openVillageDialog, setOpenVillageDialog] = useState(false);
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);

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
    is_active: true,
    responsible_village: undefined as number | undefined
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

  // Only show user management for super_admins
  const isSuperAdmin = currentUser?.role === 'super_admin';
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

  // Apply user filters whenever filter values change
  useEffect(() => {
    applyUserFilters();
  }, [users, userSearchTerm, userRoleFilter, userVillageFilter, userStatusFilter, userStartDate, userEndDate]);

  const applyUserFilters = () => {
    let filtered = [...users];

    // Search filter
    if (userSearchTerm) {
      const searchLower = userSearchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.phone_number && user.phone_number.toLowerCase().includes(searchLower))
      );
    }

    // Role filter
    if (userRoleFilter) {
      filtered = filtered.filter(user => user.role === userRoleFilter);
    }

    // Village filter
    if (userVillageFilter) {
      const selectedVillage = villages.find(v => v.name === userVillageFilter);
      if (selectedVillage) {
        filtered = filtered.filter(user => user.responsible_village === selectedVillage.id);
      }
    }

    // Status filter
    if (userStatusFilter) {
      if (userStatusFilter === 'active') {
        filtered = filtered.filter(user => user.is_active);
      } else if (userStatusFilter === 'inactive') {
        filtered = filtered.filter(user => !user.is_active);
      }
    }

    // Date filter
    if (userStartDate || userEndDate) {
      filtered = filtered.filter(user => {
        const userDate = new Date(user.created_at);
        if (userStartDate && userDate < userStartDate) return false;
        if (userEndDate && userDate > userEndDate) return false;
        return true;
      });
    }

    setFilteredUsers(filtered);
  };

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
    const result = await userService.getUsers({ limit: 200 }); // Load more for filtering
    setUsers(result.data);
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // User management handlers
  const handleOpenAddUserDialog = async () => {
    setEditingUser(null);
    setNewUser({
      name: '',
      email: '',
      password: '',
      phone_number: '',
      role: 'renter',
      is_active: true,
      responsible_village: undefined
    });
    // Load villages for the dropdown
    await loadVillages();
    setOpenUserDialog(true);
  };

  const handleEditUser = async (user: User) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      password: '', // Don't pre-fill password
      phone_number: user.phone_number || '',
      role: user.role,
      is_active: user.is_active,
      responsible_village: user.responsible_village
    });
    // Load villages for the dropdown
    await loadVillages();
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
          is_active: newUser.is_active,
          responsible_village: newUser.responsible_village
        };
        
        // Include password only if provided
        if (newUser.password) {
          updateData.password = newUser.password;
        }
        
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

  const handleResponsibleVillageChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setNewUser(prev => ({
      ...prev,
      responsible_village: value === '' ? undefined : Number(value)
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

  // User filter handlers
  const handleUserSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserSearchTerm(event.target.value);
  };

  const handleUserRoleFilterChange = (event: SelectChangeEvent) => {
    setUserRoleFilter(event.target.value);
  };

  const handleUserVillageFilterChange = (event: SelectChangeEvent) => {
    setUserVillageFilter(event.target.value);
  };

  const handleUserStatusFilterChange = (event: SelectChangeEvent) => {
    setUserStatusFilter(event.target.value);
  };

  const handleUserPageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setUserPage(value);
  };

  const handleViewUserDetails = (user: User) => {
    setSelectedUserForDetails(user);
    setUserDetailsDialogOpen(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <AdminIcon color="error" />;
      case 'admin':
        return <AdminIcon color="primary" />;
      case 'owner':
        return <OwnerIcon color="secondary" />;
      case 'renter':
        return <RenterIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getRoleColor = (role: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (role) {
      case 'super_admin':
        return 'error';
      case 'admin':
        return 'primary';
      case 'owner':
        return 'secondary';
      case 'renter':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
    } catch {
      return dateString;
    }
  };

  // Calculate pagination for users
  const paginatedUsers = filteredUsers.slice((userPage - 1) * userPageSize, userPage * userPageSize);
  const userTotalPages = Math.ceil(filteredUsers.length / userPageSize);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
          {isSuperAdmin ? (
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

                {/* Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          Total Users
                        </Typography>
                        <Typography variant="h4">
                          {filteredUsers.length}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          Active Users
                        </Typography>
                        <Typography variant="h4" color="success.main">
                          {filteredUsers.filter(u => u.is_active).length}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          Admins
                        </Typography>
                        <Typography variant="h4" color="primary.main">
                          {filteredUsers.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          Owners
                        </Typography>
                        <Typography variant="h4" color="secondary.main">
                          {filteredUsers.filter(u => u.role === 'owner').length}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Filters */}
                <Paper sx={{ p: 2, mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <FilterListIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Filters
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                      <TextField
                        label="Search users..."
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={userSearchTerm}
                        onChange={handleUserSearchChange}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                        }}
                        placeholder="Name, email, or phone"
                      />
                    </Box>
                    
                    <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Role</InputLabel>
                        <Select
                          value={userRoleFilter}
                          label="Role"
                          onChange={handleUserRoleFilterChange}
                        >
                          <MenuItem value="">All Roles</MenuItem>
                          <MenuItem value="super_admin">Super Admin</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="owner">Owner</MenuItem>
                          <MenuItem value="renter">Renter</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Village</InputLabel>
                        <Select
                          value={userVillageFilter}
                          label="Village"
                          onChange={handleUserVillageFilterChange}
                        >
                          <MenuItem value="">All Villages</MenuItem>
                          {villages.map(village => (
                            <MenuItem key={village.id} value={village.name}>{village.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>

                    <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={userStatusFilter}
                          label="Status"
                          onChange={handleUserStatusFilterChange}
                        >
                          <MenuItem value="">All Status</MenuItem>
                          <MenuItem value="active">Active</MenuItem>
                          <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    
                    <Box sx={{ flex: '1 1 300px', minWidth: '260px' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <DatePicker
                          label="Created From"
                          value={userStartDate}
                          onChange={setUserStartDate}
                          slotProps={{ textField: { size: 'small' } }}
                          format="MM/dd/yyyy"
                        />
                        <DatePicker
                          label="Created To"
                          value={userEndDate}
                          onChange={setUserEndDate}
                          slotProps={{ textField: { size: 'small' } }}
                          format="MM/dd/yyyy"
                        />
                      </Box>
                    </Box>
                  </Box>
                </Paper>
                
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    {/* Users Table */}
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Contact</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Village</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell>Last Login</TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedUsers.length > 0 ? (
                            paginatedUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {getRoleIcon(user.role)}
                                    <Box>
                                      <Typography variant="body2" fontWeight="medium">
                                        {user.name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        ID: {user.id}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box>
                                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <EmailIcon fontSize="small" />
                                      {user.email}
                                    </Typography>
                                    {user.phone_number && (
                                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                        <PhoneIcon fontSize="small" />
                                        {user.phone_number}
                                      </Typography>
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={user.role.replace('_', ' ')} 
                                    size="small" 
                                    color={getRoleColor(user.role)}
                                    sx={{ textTransform: 'capitalize' }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={user.is_active ? 'Active' : 'Inactive'}
                                    size="small"
                                    color={user.is_active ? 'success' : 'error'}
                                    variant={user.is_active ? 'filled' : 'outlined'}
                                  />
                                </TableCell>
                                <TableCell>
                                  {user.responsible_village ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <HomeIcon fontSize="small" />
                                      {villages.find(v => v.id === user.responsible_village)?.name || 'Unknown'}
                                    </Box>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {new Date(user.created_at).toLocaleDateString()}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color={user.last_login ? 'text.primary' : 'text.secondary'}>
                                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <Tooltip title="View Details">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleViewUserDetails(user)}
                                        color="info"
                                      >
                                        <VisibilityIcon />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Edit User">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleEditUser(user)}
                                        color="primary"
                                      >
                                        <EditIcon />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete User">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDeleteUser(user.id)}
                                        color="error"
                                        disabled={user.id === currentUser?.id}
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={8} align="center">
                                <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                                  No users found matching your criteria.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Pagination */}
                    {userTotalPages > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Pagination
                          count={userTotalPages}
                          page={userPage}
                          onChange={handleUserPageChange}
                          color="primary"
                          showFirstButton
                          showLastButton
                        />
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </TabPanel>
          ) : isAdmin ? (
            // For admins, show only their own profile
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom>My Profile</Typography>
                    <List>
                      <ListItem><ListItemText primary="Name" secondary={currentUser?.name} /></ListItem>
                      <ListItem><ListItemText primary="Email" secondary={currentUser?.email} /></ListItem>
                      <ListItem><ListItemText primary="Phone" secondary={currentUser?.phone_number || '-'} /></ListItem>
                      <ListItem><ListItemText primary="Role" secondary={currentUser?.role} /></ListItem>
                      {isAdmin && currentUser?.responsible_village && (
                        <ListItem><ListItemText primary="Responsible Village" secondary={villages.find(v => v.id === currentUser.responsible_village)?.name || 'Unknown'} /></ListItem>
                      )}
                    </List>
                    <Button variant="contained" onClick={async () => {
                      setEditingUser(currentUser);
                      setNewUser({
                        name: currentUser?.name || '',
                        email: currentUser?.email || '',
                        password: '',
                        phone_number: currentUser?.phone_number || '',
                        role: currentUser?.role || 'admin',
                        is_active: true,
                        responsible_village: currentUser?.responsible_village
                      });
                      await loadVillages();
                      setOpenUserDialog(true);
                    }}>Edit Profile</Button>
                  </Paper>
                </Box>
              </Box>
            </TabPanel>
          ) : (
            // For renters/owners, show only their own profile
            <TabPanel value={tabValue} index={1}>
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
                    <Button variant="contained" onClick={async () => {
                      setEditingUser(currentUser);
                      setNewUser({
                        name: currentUser?.name || '',
                        email: currentUser?.email || '',
                        password: '',
                        phone_number: currentUser?.phone_number || '',
                        role: currentUser?.role || 'renter',
                        is_active: true,
                        responsible_village: currentUser?.responsible_village
                      });
                      await loadVillages();
                      setOpenUserDialog(true);
                    }}>Edit Profile</Button>
                  </Paper>
                </Box>
              </Box>
            </TabPanel>
          )}
          
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
            {editingUser && (
              <TextField
                label="New Password (leave blank to keep current)"
                name="password"
                type="password"
                value={newUser.password}
                onChange={handleUserChange}
                fullWidth
                helperText="Only fill this if you want to change the password"
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
            {/* Responsible Village (for admin only) */}
            {isAdmin && (
              <FormControl fullWidth>
                <InputLabel>Responsible Village</InputLabel>
                <Select
                  name="responsible_village"
                  value={newUser.responsible_village ? String(newUser.responsible_village) : ''}
                  onChange={handleResponsibleVillageChange}
                  label="Responsible Village"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {villages.map((village) => (
                    <MenuItem key={village.id} value={String(village.id)}>{village.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
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

      {/* User Details Dialog */}
      <Dialog
        open={userDetailsDialogOpen}
        onClose={() => setUserDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedUserForDetails && getRoleIcon(selectedUserForDetails.role)}
            User Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedUserForDetails && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                  <Typography variant="body1">{selectedUserForDetails.name}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{selectedUserForDetails.email}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{selectedUserForDetails.phone_number || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Role</Typography>
                  <Chip 
                    label={selectedUserForDetails.role.replace('_', ' ')} 
                    size="small" 
                    color={getRoleColor(selectedUserForDetails.role)}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={selectedUserForDetails.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={selectedUserForDetails.is_active ? 'success' : 'error'}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Responsible Village</Typography>
                  <Typography variant="body1">
                    {selectedUserForDetails.responsible_village 
                      ? villages.find(v => v.id === selectedUserForDetails.responsible_village)?.name || 'Unknown'
                      : '-'
                    }
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
                  <Typography variant="body1">{formatDate(selectedUserForDetails.created_at)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Last Login</Typography>
                  <Typography variant="body1">
                    {selectedUserForDetails.last_login ? formatDate(selectedUserForDetails.last_login) : 'Never'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailsDialogOpen(false)}>Close</Button>
          {selectedUserForDetails && (
            <Button 
              variant="contained" 
              onClick={() => {
                setUserDetailsDialogOpen(false);
                handleEditUser(selectedUserForDetails);
              }}
            >
              Edit User
            </Button>
          )}
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
