import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Tooltip,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Pagination,
  Stack,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  FilterList as FilterListIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AdminPanelSettings as AdminIcon,
  Home as HomeIcon,
  AccountCircle as OwnerIcon,
  PersonOutline as RenterIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userService, type User } from '../services/userService';
import { villageService, type Village } from '../services/villageService';
import ExportButtons from '../components/ExportButtons';

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [villageFilter, setVillageFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Form states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    role: 'renter' as 'super_admin' | 'admin' | 'owner' | 'renter',
    is_active: true,
    responsible_village: undefined as number | undefined
  });

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Allow both admin and super_admin to access this page
  useEffect(() => {
    if (currentUser && currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [page]);

  // Apply filters whenever filter values change
  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, roleFilter, villageFilter, statusFilter, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load users and villages in parallel
      const [usersResult, villagesResult] = await Promise.all([
        userService.getUsers({ 
          page, 
          limit: Math.min(pageSize * 5, 100) // Ensure limit doesn't exceed 100
        }),
        villageService.getVillages()
      ]);
      
      setUsers(usersResult.data);
      setTotalUsers(usersResult.pagination?.total || usersResult.data.length);
      setVillages(villagesResult.data);
    } catch (err: any) {
      console.error('Error loading users data:', err);
      setError(err.message || 'Failed to load users data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.phone_number && user.phone_number.toLowerCase().includes(searchLower))
      );
    }

    // Role filter
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Village filter
    if (villageFilter) {
      const selectedVillage = villages.find(v => v.name === villageFilter);
      if (selectedVillage) {
        filtered = filtered.filter(user => user.responsible_village === selectedVillage.id);
      }
    }

    // Status filter
    if (statusFilter) {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.is_active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(user => !user.is_active);
      }
    }

    // Date filter
    if (startDate || endDate) {
      filtered = filtered.filter(user => {
        const userDate = new Date(user.created_at);
        if (startDate && userDate < startDate) return false;
        if (endDate && userDate > endDate) return false;
        return true;
      });
    }

    setFilteredUsers(filtered);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleRoleFilterChange = (event: SelectChangeEvent) => {
    setRoleFilter(event.target.value);
  };

  const handleVillageFilterChange = (event: SelectChangeEvent) => {
    setVillageFilter(event.target.value);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setDetailsDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      password: '',
      phone_number: user.phone_number || '',
      role: user.role,
      is_active: user.is_active,
      responsible_village: user.responsible_village
    });
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await userService.deleteUser(userToDelete.id);
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setDialogError(null);
    } catch (err: any) {
      setDialogError(err.message || 'Failed to delete user');
    }
  };

  // Add frontend validation matching backend
  const validateUserForm = (user: typeof newUser) => {
    if (!user.name || !user.name.trim()) {
      return 'Name is required';
    }
    if (!user.email || !user.email.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      return 'Invalid email format';
    }
    if (!user.role) {
      return 'Role is required';
    }
    const validRoles = ['super_admin', 'admin', 'owner', 'renter'];
    if (!validRoles.includes(user.role)) {
      return 'Invalid role specified';
    }
    if (user.phone_number && !/^\d+$/.test(user.phone_number)) {
      return 'Invalid phone number format';
    }
    return null;
  };

  const handleSaveUser = async () => {
    // Run frontend validation first
    const validationError = validateUserForm(newUser);
    if (validationError) {
      setDialogError(validationError);
      return;
    }
    try {
      if (editingUser) {
        // Update existing user
        const updatedUser = await userService.updateUser(editingUser.id, newUser);
        setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
      } else {
        // Create new user
        const createdUser = await userService.createUser(newUser);
        setUsers([createdUser, ...users]);
      }
      setEditDialogOpen(false);
      setEditingUser(null);
      resetForm();
      setDialogError(null);
    } catch (err: any) {
      // Show more detailed error message
      setDialogError(err.message || JSON.stringify(err) || 'Failed to save user');
    }
  };

  const resetForm = () => {
    setNewUser({
      name: '',
      email: '',
      password: '',
      phone_number: '',
      role: 'renter',
      is_active: true,
      responsible_village: undefined
    });
  };

  const handleAddUser = () => {
    setEditingUser(null);
    resetForm();
    setEditDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateString;
    }
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

  // Data transformer for export
  const transformUsersForExport = (usersData: User[]) => {
    return usersData.map(user => ({
      name: user.name,
      email: user.email,
      phone: user.phone_number || '',
      role: user.role,
      status: user.is_active ? 'Active' : 'Inactive',
      village: villages.find(v => v.id === user.responsible_village)?.name || '',
      created_at: formatDate(user.created_at),
      last_login: user.last_login ? formatDate(user.last_login) : 'Never'
    }));
  };

  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box sx={{ mb: 3 }}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', height: 48, mt: 3, ml: 2 }}>
                Users Management
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddUser}
                sx={{ minWidth: 140 }}
              >
                Add User
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

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
                value={searchTerm}
                onChange={handleSearchChange}
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
                  value={roleFilter}
                  label="Role"
                  onChange={handleRoleFilterChange}
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
                  value={villageFilter}
                  label="Village"
                  onChange={handleVillageFilterChange}
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
                  value={statusFilter}
                  label="Status"
                  onChange={handleStatusFilterChange}
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
                  value={startDate}
                  onChange={setStartDate}
                  slotProps={{ textField: { size: 'small' } }}
                  format="MM/dd/yyyy"
                />
                <DatePicker
                  label="Created To"
                  value={endDate}
                  onChange={setEndDate}
                  slotProps={{ textField: { size: 'small' } }}
                  format="MM/dd/yyyy"
                />
              </Box>
            </Box>
          </Box>
        </Paper>
        
        {/* Export Buttons */}
        <ExportButtons 
          data={transformUsersForExport(filteredUsers)} 
          columns={["name", "email", "phone", "role", "status", "village", "created_at", "last_login"]} 
          excelFileName="users.xlsx" 
          pdfFileName="users.pdf" 
        />
        
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
                        {formatDate(user.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={user.last_login ? 'text.primary' : 'text.secondary'}>
                        {user.last_login ? formatDate(user.last_login) : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(user)}
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
                            onClick={() => handleDeleteUser(user)}
                            color="error"
                            disabled={user.id === currentUser?.id} // Prevent self-deletion
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
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}

        {/* User Details Dialog */}
        <Dialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {selectedUser && getRoleIcon(selectedUser.role)}
              User Details
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Box sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                    <Typography variant="body1">{selectedUser.name}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                    <Typography variant="body1">{selectedUser.email}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                    <Typography variant="body1">{selectedUser.phone_number || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Role</Typography>
                    <Chip 
                      label={selectedUser.role.replace('_', ' ')} 
                      size="small" 
                      color={getRoleColor(selectedUser.role)}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Chip 
                      label={selectedUser.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={selectedUser.is_active ? 'success' : 'error'}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Responsible Village</Typography>
                    <Typography variant="body1">
                      {selectedUser.responsible_village 
                        ? villages.find(v => v.id === selectedUser.responsible_village)?.name || 'Unknown'
                        : '-'
                      }
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
                    <Typography variant="body1">{formatDate(selectedUser.created_at)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Last Login</Typography>
                    <Typography variant="body1">
                      {selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            {selectedUser && (
              <Button 
                variant="contained" 
                onClick={() => {
                  setDetailsDialogOpen(false);
                  handleEditUser(selectedUser);
                }}
              >
                Edit User
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Edit/Add User Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => { setEditDialogOpen(false); setDialogError(null); }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogContent>
            {dialogError && (
              <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>
            )}
            <Box sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                margin="normal"
                required={!editingUser}
                helperText={editingUser ? "Leave empty to keep current password" : ""}
              />
              <TextField
                fullWidth
                label="Phone Number"
                value={newUser.phone_number}
                onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Role</InputLabel>
                <Select
                  value={newUser.role}
                  label="Role"
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                >
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="owner">Owner</MenuItem>
                  <MenuItem value="renter">Renter</MenuItem>
                </Select>
              </FormControl>
              
              {(newUser.role === 'admin') && (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Responsible Village</InputLabel>
                  <Select
                    value={newUser.responsible_village?.toString() || ''}
                    label="Responsible Village"
                    onChange={(e) => setNewUser({ 
                      ...newUser, 
                      responsible_village: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                  >
                    <MenuItem value="">None</MenuItem>
                    {villages.map(village => (
                      <MenuItem key={village.id} value={village.id}>{village.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              <FormControlLabel
                control={
                  <Switch
                    checked={newUser.is_active}
                    onChange={(e) => setNewUser({ ...newUser, is_active: e.target.checked })}
                  />
                }
                label="Active"
                sx={{ mt: 1 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveUser}>
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => { setDeleteDialogOpen(false); setDialogError(null); }}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            {dialogError && (
              <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>
            )}
            <Typography>
              Are you sure you want to delete user "{userToDelete?.name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={confirmDeleteUser}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
} 