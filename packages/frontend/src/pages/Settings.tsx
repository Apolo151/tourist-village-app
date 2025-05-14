import { useState } from 'react';
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
  Snackbar
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Payment as PaymentIcon,
  Home as HomeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { mockSettings, mockPaymentMethods, mockUsers } from '../mockData';

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
  const [tabValue, setTabValue] = useState(0);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsData, setSettingsData] = useState({ ...mockSettings });
  const [paymentMethods, setPaymentMethods] = useState([...mockPaymentMethods]);
  const [openAddPaymentDialog, setOpenAddPaymentDialog] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({ name: '', description: '' });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [userRole, setUserRole] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  
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
  
  const handleUserRoleChange = (event: SelectChangeEvent) => {
    setUserRole(event.target.value);
  };
  
  const handleSelectedUserChange = (event: SelectChangeEvent) => {
    setSelectedUser(event.target.value);
  };
  
  const handleSaveUserRole = () => {
    if (!selectedUser || !userRole) {
      setSnackbarMessage('Please select both user and role');
      setOpenSnackbar(true);
      return;
    }
    
    // In a real app, this would save to an API
    setSnackbarMessage('User role updated successfully');
    setOpenSnackbar(true);
    setSelectedUser('');
    setUserRole('');
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
          <Tab icon={<PersonIcon />} iconPosition="start" label="Users" />
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
                label="Electricity Price (EGP per unit)"
                type="number"
                name="electricityPrice"
                value={settingsData.electricityPrice}
                onChange={handleSettingsChange}
                disabled={!editingSettings}
                fullWidth
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
              <TextField
                label="Water Price (EGP per unit)"
                type="number"
                name="waterPrice"
                value={settingsData.waterPrice}
                onChange={handleSettingsChange}
                disabled={!editingSettings}
                fullWidth
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
              <TextField
                label="Gas Price (EGP per unit)"
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
            <Typography variant="h6" gutterBottom>Manage Users</Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>Change User Role</Typography>
              <Box sx={{ 
                display: 'grid', 
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                maxWidth: 800,
                mb: 2
              }}>
                <FormControl fullWidth>
                  <InputLabel>Select User</InputLabel>
                  <Select
                    value={selectedUser}
                    label="Select User"
                    onChange={handleSelectedUserChange}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {mockUsers.map(user => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={userRole}
                    label="Role"
                    onChange={handleUserRoleChange}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="owner">Owner</MenuItem>
                    <MenuItem value="renter">Renter</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Button 
                variant="contained" 
                onClick={handleSaveUserRole}
                disabled={!selectedUser || !userRole}
              >
                Update Role
              </Button>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="subtitle1" gutterBottom>User List</Typography>
            <List>
              {mockUsers.map(user => (
                <ListItem key={user.id} divider>
                  <ListItemText
                    primary={user.name}
                    secondary={
                      <>
                        <Typography component="span" variant="body2">
                          {user.email}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" color="text.secondary">
                          Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="edit">
                      <EditIcon />
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
            <Typography variant="h6" gutterBottom>Village Details</Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box component="form" sx={{ 
              display: 'grid', 
              gap: 3,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              maxWidth: 800
            }}>
              <TextField
                label="Village Name"
                defaultValue="Tourist Village Resort"
                disabled={!editingSettings}
                fullWidth
              />
              <TextField
                label="Location"
                defaultValue="Coastal Road, Alexandria, Egypt"
                disabled={!editingSettings}
                fullWidth
              />
              <TextField
                label="Contact Email"
                defaultValue="info@touristvillage.com"
                disabled={!editingSettings}
                fullWidth
              />
              <TextField
                label="Contact Phone"
                defaultValue="+20123456789"
                disabled={!editingSettings}
                fullWidth
              />
              <TextField
                label="Description"
                defaultValue="A luxury tourist village with all amenities and services."
                disabled={!editingSettings}
                fullWidth
                multiline
                rows={4}
                sx={{ gridColumn: { sm: 'span 2' } }}
              />
            </Box>
          </Box>
        </TabPanel>
      </Paper>
      
      {/* Add Payment Method Dialog */}
      <Dialog open={openAddPaymentDialog} onClose={() => setOpenAddPaymentDialog(false)}>
        <DialogTitle>Add Payment Method</DialogTitle>
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
            Add
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