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
  FormGroup,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  CardActions,
  Chip,
  Grid,
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
  Lock as LockIcon
} from '@mui/icons-material';
import { mockSettings, mockPaymentMethods, mockUsers, mockVillages } from '../mockData';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { User, Village } from '../types';

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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Settings() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsData, setSettingsData] = useState({ ...mockSettings });
  const [paymentMethods, setPaymentMethods] = useState([...mockPaymentMethods]);
  const [openAddPaymentDialog, setOpenAddPaymentDialog] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({ name: '', description: '' });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [users, setUsers] = useState([...mockUsers]);
  const [villages, setVillages] = useState([...mockVillages]);
  
  // For the user dialog
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'renter',
    permissions: {
      villageAccess: [] as string[],
      canView: true,
      canAdd: false,
      canEdit: false
    }
  });
  
  // For village dialog
  const [openVillageDialog, setOpenVillageDialog] = useState(false);
  const [editingVillage, setEditingVillage] = useState<Village | null>(null);
  const [newVillage, setNewVillage] = useState({
    name: '',
    address: '',
    city: '',
    country: 'Egypt',
    electricityPrice: 1.5,
    gasPrice: 1.2,
    waterPrice: 0.75,
    numberOfPhases: 1,
    contactEmail: '',
    contactPhone: '',
    description: ''
  });
  
  // Admin check
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettingsData(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };
  
  const handleSaveSettings = () => {
    // In a real app, this would save to an API
    setEditingSettings(false);
    setSnackbarMessage('Settings saved successfully');
    setOpenSnackbar(true);
  };
  
  const handlePaymentMethodChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: 'name' | 'description'
  ) => {
    setNewPaymentMethod(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };
  
  const handleAddPaymentMethod = () => {
    if (!newPaymentMethod.name) {
      setSnackbarMessage('Name is required');
      setOpenSnackbar(true);
      return;
    }
    
    // In a real app, this would save to an API
    const newMethod = {
      id: `method${paymentMethods.length + 1}`,
      ...newPaymentMethod
    };
    
    setPaymentMethods(prev => [...prev, newMethod]);
    setNewPaymentMethod({ name: '', description: '' });
    setOpenAddPaymentDialog(false);
    setSnackbarMessage('Payment method added successfully');
    setOpenSnackbar(true);
  };
  
  const handleDeletePaymentMethod = (id: string) => {
    // In a real app, this would delete from an API
    setPaymentMethods(prev => prev.filter(method => method.id !== id));
    setSnackbarMessage('Payment method deleted successfully');
    setOpenSnackbar(true);
  };
  
  const handleEditPaymentMethod = (id: string) => {
    const method = paymentMethods.find(m => m.id === id);
    if (method) {
      setNewPaymentMethod({ name: method.name, description: method.description || '' });
      setOpenAddPaymentDialog(true);
    }
  };
  
  // User management handlers
  const handleOpenAddUserDialog = () => {
    setEditingUser(null);
    setNewUser({
      name: '',
      email: '',
      phone: '',
      role: 'renter',
      permissions: {
        villageAccess: [],
        canView: true,
        canAdd: false,
        canEdit: false
      }
    });
    setOpenUserDialog(true);
  };
  
  const handleEditUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setEditingUser(user);
      setNewUser({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        permissions: user.permissions || {
          villageAccess: [],
          canView: true,
          canAdd: false,
          canEdit: false
        }
      });
      setOpenUserDialog(true);
    }
  };
  
  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
    setSnackbarMessage('User deleted successfully');
    setOpenSnackbar(true);
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
      role: event.target.value as 'admin' | 'owner' | 'renter'
    }));
  };
  
  const handleVillageAccessChange = (villageId: string) => {
    setNewUser(prev => {
      const isSelected = prev.permissions.villageAccess.includes(villageId);
      const updatedAccess = isSelected
        ? prev.permissions.villageAccess.filter(id => id !== villageId)
        : [...prev.permissions.villageAccess, villageId];
        
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          villageAccess: updatedAccess
        }
      };
    });
  };
  
  const handlePermissionChange = (permission: 'canView' | 'canAdd' | 'canEdit') => {
    setNewUser(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission]
      }
    }));
  };
  
  const handleSaveUser = () => {
    if (!newUser.name || !newUser.email) {
      setSnackbarMessage('Name and email are required');
      setOpenSnackbar(true);
      return;
    }
    
    if (editingUser) {
      // Update existing user
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id 
          ? { ...user, 
              name: newUser.name, 
              email: newUser.email, 
              phone: newUser.phone,
              role: newUser.role as 'admin' | 'owner' | 'renter',
              permissions: newUser.permissions
            } 
          : user
      ));
      setSnackbarMessage('User updated successfully');
    } else {
      // Create new user
      const newUserObj: User = {
        id: `user${users.length + 1}`,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role as 'admin' | 'owner' | 'renter',
        permissions: newUser.permissions
      };
      setUsers(prev => [...prev, newUserObj]);
      setSnackbarMessage('User added successfully');
    }
    
    setOpenUserDialog(false);
    setOpenSnackbar(true);
  };
  
  // Village management handlers
  const handleOpenAddVillageDialog = () => {
    setEditingVillage(null);
    setNewVillage({
      name: '',
      address: '',
      city: '',
      country: 'Egypt',
      electricityPrice: 1.5,
      gasPrice: 1.2,
      waterPrice: 0.75,
      numberOfPhases: 1,
      contactEmail: '',
      contactPhone: '',
      description: ''
    });
    setOpenVillageDialog(true);
  };
  
  const handleEditVillage = (villageId: string) => {
    const village = villages.find(v => v.id === villageId);
    if (village) {
      setEditingVillage(village);
      setNewVillage({
        name: village.name,
        address: village.address,
        city: village.city,
        country: village.country,
        electricityPrice: village.electricityPrice,
        gasPrice: village.gasPrice,
        waterPrice: village.waterPrice,
        numberOfPhases: village.numberOfPhases,
        contactEmail: village.contactEmail,
        contactPhone: village.contactPhone,
        description: village.description
      });
      setOpenVillageDialog(true);
    }
  };
  
  const handleDeleteVillage = (villageId: string) => {
    setVillages(prev => prev.filter(village => village.id !== villageId));
    setSnackbarMessage('Village deleted successfully');
    setOpenSnackbar(true);
  };
  
  const handleVillageChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewVillage(prev => ({
      ...prev,
      [name]: name === 'electricityPrice' || name === 'gasPrice' || name === 'waterPrice' || name === 'numberOfPhases'
        ? parseFloat(value)
        : value
    }));
  };
  
  const handleSaveVillage = () => {
    if (!newVillage.name || !newVillage.address || !newVillage.city) {
      setSnackbarMessage('Village name, address and city are required');
      setOpenSnackbar(true);
      return;
    }
    
    if (editingVillage) {
      // Update existing village
      setVillages(prev => prev.map(village => 
        village.id === editingVillage.id 
          ? { 
              ...village,
              name: newVillage.name,
              address: newVillage.address,
              city: newVillage.city,
              country: newVillage.country,
              electricityPrice: newVillage.electricityPrice,
              gasPrice: newVillage.gasPrice,
              waterPrice: newVillage.waterPrice,
              numberOfPhases: newVillage.numberOfPhases,
              contactEmail: newVillage.contactEmail,
              contactPhone: newVillage.contactPhone,
              description: newVillage.description
            } 
          : village
      ));
      setSnackbarMessage('Village updated successfully');
    } else {
      // Create new village
      const newVillageObj: Village = {
        id: `village${villages.length + 1}`,
        name: newVillage.name,
        address: newVillage.address,
        city: newVillage.city,
        country: newVillage.country,
        electricityPrice: newVillage.electricityPrice,
        gasPrice: newVillage.gasPrice,
        waterPrice: newVillage.waterPrice,
        numberOfPhases: newVillage.numberOfPhases,
        contactEmail: newVillage.contactEmail,
        contactPhone: newVillage.contactPhone,
        description: newVillage.description
      };
      setVillages(prev => [...prev, newVillageObj]);
      setSnackbarMessage('Village added successfully');
    }
    
    setOpenVillageDialog(false);
    setOpenSnackbar(true);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      
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
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">General Settings</Typography>
              <Button
                variant={editingSettings ? "outlined" : "contained"}
                onClick={() => setEditingSettings(!editingSettings)}
              >
                {editingSettings ? "Cancel" : "Edit Settings"}
              </Button>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <Box component="form" sx={{ 
              display: 'grid', 
              gap: 3,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              maxWidth: 800
            }}>
              <TextField
                label="Default Electricity Price (EGP per unit)"
                type="number"
                name="electricityPrice"
                value={settingsData.electricityPrice}
                onChange={handleSettingsChange}
                disabled={!editingSettings}
                fullWidth
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
              <TextField
                label="Default Water Price (EGP per unit)"
                type="number"
                name="waterPrice"
                value={settingsData.waterPrice}
                onChange={handleSettingsChange}
                disabled={!editingSettings}
                fullWidth
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
              <TextField
                label="Default Gas Price (EGP per unit)"
                type="number"
                name="gasPrice"
                value={settingsData.gasPrice}
                onChange={handleSettingsChange}
                disabled={!editingSettings}
                fullWidth
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Box>
            
            {editingSettings && (
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={handleSaveSettings}>
                  Save Settings
                </Button>
              </Box>
            )}
          </Box>
        </TabPanel>
        
        {/* Users Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
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
            
            <List>
              {users.map(user => (
                <ListItem key={user.id} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle1">{user.name}</Typography>
                        <Chip 
                          size="small"
                          label={user.role.charAt(0).toUpperCase() + user.role.slice(1)} 
                          color={user.role === 'admin' ? 'error' : user.role === 'owner' ? 'primary' : 'default'}
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography component="span" variant="body2">
                          {user.email} {user.phone && `| ${user.phone}`}
                        </Typography>
                        <br />
                        {user.permissions && (
                          <Typography component="span" variant="body2" color="text.secondary">
                            Access: {user.permissions.villageAccess.length > 0 
                              ? villages
                                  .filter(v => user.permissions?.villageAccess.includes(v.id))
                                  .map(v => v.name)
                                  .join(', ')
                              : 'No village access'
                            }
                            <br />
                            Permissions: {[
                              user.permissions.canView ? 'View' : null,
                              user.permissions.canAdd ? 'Add' : null,
                              user.permissions.canEdit ? 'Edit' : null,
                            ].filter(Boolean).join(', ') || 'None'}
                          </Typography>
                        )}
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="edit" onClick={() => handleEditUser(user.id)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteUser(user.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        </TabPanel>
        
        {/* Payment Methods Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Payment Methods</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenAddPaymentDialog(true)}
              >
                Add Method
              </Button>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <List>
              {paymentMethods.map(method => (
                <ListItem key={method.id} divider>
                  <ListItemText
                    primary={method.name}
                    secondary={method.description || 'No description'}
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="edit"
                      onClick={() => handleEditPaymentMethod(method.id)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleDeletePaymentMethod(method.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        </TabPanel>
        
        {/* Village Details Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 2 }}>
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
            
            <Grid container spacing={3}>
              {villages.map(village => (
                <Grid key={village.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" gutterBottom>{village.name}</Typography>
                        <Chip label={`${village.numberOfPhases} Phases`} color="primary" size="small" />
                      </Box>
                      
                      <Typography variant="body2" gutterBottom>
                        <strong>Address:</strong> {village.address}, {village.city}, {village.country}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Contact:</strong> {village.contactEmail} | {village.contactPhone}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" gutterBottom>
                        <strong>Electricity:</strong> {village.electricityPrice} EGP/unit
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Gas:</strong> {village.gasPrice} EGP/unit
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Water:</strong> {village.waterPrice} EGP/unit
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      
                      <Typography variant="body2" color="text.secondary">
                        {village.description}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        startIcon={<EditIcon />} 
                        onClick={() => handleEditVillage(village.id)}
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
          </Box>
        </TabPanel>
      </Paper>
      
      {/* Add/Edit User Dialog */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent dividers>
          <Box component="form" sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Name"
                  name="name"
                  value={newUser.name}
                  onChange={handleUserChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={newUser.email}
                  onChange={handleUserChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Phone"
                  name="phone"
                  value={newUser.phone}
                  onChange={handleUserChange}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={newUser.role}
                    label="Role"
                    onChange={handleUserRoleChange}
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="owner">Owner</MenuItem>
                    <MenuItem value="renter">Renter</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Divider>
                  <Chip icon={<LockIcon />} label="Permissions" />
                </Divider>
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" gutterBottom>Village Access</Typography>
                <FormGroup row>
                  {villages.map(village => (
                    <FormControlLabel
                      key={village.id}
                      control={
                        <Checkbox 
                          checked={newUser.permissions.villageAccess.includes(village.id)} 
                          onChange={() => handleVillageAccessChange(village.id)}
                        />
                      }
                      label={village.name}
                    />
                  ))}
                </FormGroup>
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" gutterBottom>User Privileges</Typography>
                <FormGroup row>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={newUser.permissions.canView} 
                        onChange={() => handlePermissionChange('canView')}
                      />
                    }
                    label="Can View"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={newUser.permissions.canAdd} 
                        onChange={() => handlePermissionChange('canAdd')}
                      />
                    }
                    label="Can Add"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={newUser.permissions.canEdit} 
                        onChange={() => handlePermissionChange('canEdit')}
                      />
                    }
                    label="Can Edit"
                  />
                </FormGroup>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            startIcon={<SaveIcon />}
            onClick={handleSaveUser}
          >
            {editingUser ? 'Update User' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add/Edit Village Dialog */}
      <Dialog open={openVillageDialog} onClose={() => setOpenVillageDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingVillage ? 'Edit Village' : 'Add New Village'}</DialogTitle>
        <DialogContent dividers>
          <Box component="form" sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Village Name"
                  name="name"
                  value={newVillage.name}
                  onChange={handleVillageChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Number of Phases"
                  name="numberOfPhases"
                  type="number"
                  value={newVillage.numberOfPhases}
                  onChange={handleVillageChange}
                  fullWidth
                  required
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Address"
                  name="address"
                  value={newVillage.address}
                  onChange={handleVillageChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="City"
                  name="city"
                  value={newVillage.city}
                  onChange={handleVillageChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Country"
                  name="country"
                  value={newVillage.country}
                  onChange={handleVillageChange}
                  fullWidth
                />
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Divider>
                  <Chip icon={<PaymentIcon />} label="Utility Prices" />
                </Divider>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Electricity Price (EGP/unit)"
                  name="electricityPrice"
                  type="number"
                  value={newVillage.electricityPrice}
                  onChange={handleVillageChange}
                  fullWidth
                  required
                  InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Gas Price (EGP/unit)"
                  name="gasPrice"
                  type="number"
                  value={newVillage.gasPrice}
                  onChange={handleVillageChange}
                  fullWidth
                  required
                  InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Water Price (EGP/unit)"
                  name="waterPrice"
                  type="number"
                  value={newVillage.waterPrice}
                  onChange={handleVillageChange}
                  fullWidth
                  required
                  InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                />
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Divider>
                  <Chip icon={<HomeIcon />} label="Contact Information" />
                </Divider>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Contact Email"
                  name="contactEmail"
                  type="email"
                  value={newVillage.contactEmail}
                  onChange={handleVillageChange}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Contact Phone"
                  name="contactPhone"
                  value={newVillage.contactPhone}
                  onChange={handleVillageChange}
                  fullWidth
                />
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Description"
                  name="description"
                  value={newVillage.description}
                  onChange={handleVillageChange}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVillageDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            startIcon={<SaveIcon />}
            onClick={handleSaveVillage}
          >
            {editingVillage ? 'Update Village' : 'Add Village'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add/Edit Payment Method Dialog */}
      <Dialog open={openAddPaymentDialog} onClose={() => setOpenAddPaymentDialog(false)}>
        <DialogTitle>{newPaymentMethod.name ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, width: 400, maxWidth: '100%' }}>
            <TextField
              label="Name"
              value={newPaymentMethod.name}
              onChange={(e) => handlePaymentMethodChange(e, 'name')}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Description"
              value={newPaymentMethod.description}
              onChange={(e) => handlePaymentMethodChange(e, 'description')}
              fullWidth
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddPaymentDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddPaymentMethod} 
            variant="contained"
            disabled={!newPaymentMethod.name}
          >
            {newPaymentMethod.name ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={5000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
} 