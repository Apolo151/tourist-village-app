import { useState, useEffect, useCallback } from 'react';
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
import ExcelImport from '../components/ExcelImport';
import { excelService } from '../services/excelService';

export default function Users({ hideSuperAdmin = false }: { hideSuperAdmin?: boolean }) {
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
  
  // Global stats
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    admins: 0,
    owners: 0,
    renters: 0
  });
  
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
  // Update the state to remove responsible_village
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    role: 'renter' as 'super_admin' | 'admin' | 'owner' | 'renter',
    is_active: true,
    village_ids: [] as number[],
    passport_number: '',
    passport_expiry_date: '',
    address: '',
    next_of_kin_name: '',
    next_of_kin_address: '',
    next_of_kin_email: '',
    next_of_kin_phone: '',
    next_of_kin_will: ''
  });

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Allow both admin and super_admin to access this page
  useEffect(() => {
    if (currentUser && currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);

  // Initial load of user stats on component mount
  useEffect(() => {
    fetchUserStats();
  }, []);

  // Load data on component mount and when page changes
  useEffect(() => {
    loadData();
  }, [page]);

  // Apply filters whenever filter values change
  useEffect(() => {
    applyFilters();
  }, [users, startDate, endDate]);

  // Filter out super_admin users for admin
  useEffect(() => {
    let filtered = [...users];
    if (hideSuperAdmin) {
      filtered = filtered.filter(user => user.role !== 'super_admin');
    }
    setFilteredUsers(filtered);
  }, [users, hideSuperAdmin]);

  // Function to fetch global user stats
  const fetchUserStats = useCallback(async () => {
    try {
      // Use the dedicated endpoint for user counts
      const response = await userService.getUserCounts();
      
      if (response) {
        setUserStats(response);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
      // Fallback to using the paginated API with maximum allowed limit
      try {
        const statsResponse = await userService.getUsers({ limit: 100 });
        if (statsResponse && statsResponse.pagination) {
          // Use pagination.total for total count
          const total = statsResponse.pagination.total;
          setUserStats(prev => ({
            ...prev,
            total
          }));
        }
      } catch (fallbackErr) {
        console.error('Error in fallback stats fetch:', fallbackErr);
      }
    }
  }, []);
  
  // Update the loadData function to ensure we get complete user data with villages
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Prepare filters for API call
      const filters: any = {
        page,
        limit: pageSize
      };
      
      // Add optional filters if they exist
      if (searchTerm) filters.search = searchTerm;
      if (roleFilter) filters.role = roleFilter;
      if (statusFilter === 'active') filters.is_active = true;
      if (statusFilter === 'inactive') filters.is_active = false;
      
      // Village filter needs special handling since it's not directly supported by the API
      // We'll handle it client-side after getting the results
      
      // Load users and villages in parallel
      const [usersResult, villagesResult] = await Promise.all([
        userService.getUsers(filters),
        villageService.getVillages()
      ]);
      
      // Process users to ensure villages are properly set
      const processedUsers = usersResult.data.map(user => {
        // If user has no villages but has responsible_village, create a villages array
        if (!user.villages && user.responsible_village) {
          const village = villagesResult.data.find(v => v.id === user.responsible_village);
          if (village) {
            return {
              ...user,
              villages: [village]
            };
          }
        }
        return user;
      });
      
      // Apply village filter client-side if needed
      let filteredUsers = processedUsers;
      if (villageFilter) {
        const villageId = parseInt(villageFilter);
        if (!isNaN(villageId)) {
          filteredUsers = filteredUsers.filter(user => {
            // Check in villages array first
            if (user.villages && user.villages.length > 0) {
              return user.villages.some(v => v.id === villageId);
            }
            // Fallback to responsible_village for backward compatibility
            return user.responsible_village === villageId;
          });
        }
      }
      
      setUsers(filteredUsers);
      setTotalUsers(usersResult.pagination?.total || 0);
      setVillages(villagesResult.data);
      
      // Fetch global stats in the background if needed
      fetchUserStats();
    } catch (err: any) {
      console.error('Error loading users data:', err);
      setError(err.message || 'Failed to load users data');
    } finally {
      setLoading(false);
    }
  };

  // Update the applyFilters function to apply client-side filters
  const applyFilters = () => {
    // Apply client-side filters only
    // This is needed because we're doing server-side pagination, but we still want to apply some filters client-side
    // like date filtering and hiding super_admin users
    let filtered = [...users];

    // Date filter (this is applied client-side since it's not part of the backend API)
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
    setPage(1); // Reset to first page when filter changes
    // We'll load data in the next render cycle after state updates
    setTimeout(() => loadData(), 0);
  };

  const handleRoleFilterChange = (event: SelectChangeEvent) => {
    setRoleFilter(event.target.value);
    setPage(1); // Reset to first page when filter changes
    // We'll load data in the next render cycle after state updates
    setTimeout(() => loadData(), 0);
  };

  const handleVillageFilterChange = (event: SelectChangeEvent) => {
    setVillageFilter(event.target.value);
    setPage(1); // Reset to first page when filter changes
    // We'll load data in the next render cycle after state updates
    setTimeout(() => loadData(), 0);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
    setPage(1); // Reset to first page when filter changes
    // We'll load data in the next render cycle after state updates
    setTimeout(() => loadData(), 0);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    // When changing pages, we'll rely on the loadData effect to fetch new data
  };

  // Update the handleViewDetails function to handle users with responsible_village but no villages
  const handleViewDetails = (user: User) => {
    // If user has no villages but has responsible_village, create a villages array
    if (!user.villages && user.responsible_village) {
      const village = villages.find(v => v.id === user.responsible_village);
      if (village) {
        user = {
          ...user,
          villages: [village]
        };
      }
    }
    
    setSelectedUser(user);
    setDetailsDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    // If user has no villages but has responsible_village, create a villages array
    let userVillages = user.villages || [];
    if (userVillages.length === 0 && user.responsible_village) {
      const village = villages.find(v => v.id === user.responsible_village);
      if (village) {
        userVillages = [village];
      }
    }
    
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      password: '',
      phone_number: user.phone_number || '',
      role: user.role,
      is_active: user.is_active,
      village_ids: userVillages.map(v => v.id),
      passport_number: user.passport_number || '',
      passport_expiry_date: user.passport_expiry_date || '',
      address: user.address || '',
      next_of_kin_name: user.next_of_kin_name || '',
      next_of_kin_address: user.next_of_kin_address || '',
      next_of_kin_email: user.next_of_kin_email || '',
      next_of_kin_phone: user.next_of_kin_phone || '',
      next_of_kin_will: user.next_of_kin_will || ''
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
      village_ids: [],
      passport_number: '',
      passport_expiry_date: '',
      address: '',
      next_of_kin_name: '',
      next_of_kin_address: '',
      next_of_kin_email: '',
      next_of_kin_phone: '',
      next_of_kin_will: ''
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

  // Add a helper function to get user projects
  const getUserProjects = (user: User): string => {
    if (user.villages && user.villages.length > 0) {
      return user.villages.map(v => v.name).join(', ');
    }
    
    if (user.responsible_village) {
      const village = villages.find(v => v.id === user.responsible_village);
      return village ? village.name : '';
    }
    
    return '';
  };

  // Update the transformUsersForExport function to use the helper function
  const transformUsersForExport = (usersData: User[]) => {
    return usersData.map(user => ({
      name: user.name,
      email: user.email,
      phone: user.phone_number || '',
      role: user.role,
      status: user.is_active ? 'Active' : 'Inactive',
      projects: getUserProjects(user),
      passport_number: user.passport_number || '',
      passport_expiry_date: user.passport_expiry_date ? formatDate(user.passport_expiry_date) : '',
      address: user.address || '',
      next_of_kin_name: user.next_of_kin_name || '',
      next_of_kin_phone: user.next_of_kin_phone || '',
      next_of_kin_email: user.next_of_kin_email || '',
      next_of_kin_address: user.next_of_kin_address || '',
      created_at: formatDate(user.created_at),
      last_login: user.last_login ? formatDate(user.last_login) : 'Never'
    }));
  };

  // Don't paginate the data locally since we're already paginating on the server
  const paginatedUsers = filteredUsers;
  const totalPages = Math.ceil(totalUsers / pageSize);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  function clearFilters(_event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    setSearchTerm('');
    setRoleFilter('');
    setVillageFilter('');
    setStatusFilter('');
    setStartDate(null);
    setEndDate(null);
  }
  
  function handleDownloadTemplate() {
    excelService.generateUserImportTemplate();
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
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddUser}
                  sx={{ minWidth: 140 }}
                >
                  Add User
                </Button>
                <ExcelImport
                  onTemplateDownload={handleDownloadTemplate}
                  onImport={(data) => excelService.processUserImport(data)}
                  buttonText="Import Users"
                  title="Import Users from Excel"
                  successMessage="Users imported successfully"
                  allowedFileTypes=".xlsx, .xls, .csv"
                  maxFileSize={10}
                />
              </Box>
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
                  {userStats.total}
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
                  {userStats.active}
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
                  {userStats.admins}
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
                  {userStats.owners}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="subtitle1">
              <FilterListIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Filters
            </Typography>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </Box>
          
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
                <InputLabel>Project</InputLabel>
                <Select
                  value={villageFilter}
                  label="Project"
                  onChange={handleVillageFilterChange}
                >
                  <MenuItem value="">All Projects</MenuItem>
                  {villages.map(village => (
                    <MenuItem key={village.id} value={village.id.toString()}>{village.name}</MenuItem>
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
          columns={["name", "email", "phone", "role", "status", "projects", "passport_number", "passport_expiry_date", "address", "next_of_kin_name", "next_of_kin_phone", "next_of_kin_email", "next_of_kin_address", "created_at", "last_login"]} 
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
                <TableCell>Project</TableCell>
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
                      {user.villages && user.villages.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {user.villages.slice(0, 2).map(village => (
                            <Chip
                              key={village.id}
                              label={village.name}
                              size="small"
                              variant="outlined"
                              icon={<HomeIcon fontSize="small" />}
                              sx={{ maxWidth: 150 }}
                            />
                          ))}
                          {user.villages.length > 2 && (
                            <Chip
                              label={`+${user.villages.length - 2} more`}
                              size="small"
                              variant="outlined"
                              sx={{ maxWidth: 150 }}
                            />
                          )}
                        </Box>
                      ) : user.responsible_village ? (
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
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(user)}
                              color="info"
                              disabled={hideSuperAdmin && user.role === 'super_admin'}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Edit User">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleEditUser(user)}
                              color="primary"
                              disabled={hideSuperAdmin && user.role === 'super_admin'}
                            >
                              <EditIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Delete User">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteUser(user)}
                              color="error"
                              disabled={user.id === currentUser?.id || (hideSuperAdmin && user.role === 'super_admin')}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
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
                  
                  {selectedUser?.villages && selectedUser.villages.length > 0 && (
                    <Grid size={{ xs: 12, sm: 12 }}>
                      <Typography variant="subtitle2" color="text.secondary">Projects (Multiple)</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {selectedUser.villages.map(village => (
                          <Chip 
                            key={village.id}
                            label={village.name}
                            color="primary"
                            variant="outlined"
                            icon={<HomeIcon fontSize="small" />}
                          />
                        ))}
                      </Box>
                    </Grid>
                  )}
                  
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
                  
                  {/* New fields */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Passport Number</Typography>
                    <Typography variant="body1">{selectedUser.passport_number || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Passport Expiry Date</Typography>
                    <Typography variant="body1">
                      {selectedUser.passport_expiry_date ? formatDate(selectedUser.passport_expiry_date) : '-'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                    <Typography variant="body1">{selectedUser.address || '-'}</Typography>
                  </Grid>
                  
                  {/* Next of Kin Information */}
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Next of Kin Information</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                    <Typography variant="body1">{selectedUser.next_of_kin_name || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                    <Typography variant="body1">{selectedUser.next_of_kin_phone || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                    <Typography variant="body1">{selectedUser.next_of_kin_email || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                    <Typography variant="body1">{selectedUser.next_of_kin_address || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary">Will</Typography>
                    <Typography variant="body1">{selectedUser.next_of_kin_will || '-'}</Typography>
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
                <>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Projects (Multiple)</InputLabel>
                    <Select
                      multiple
                      value={newUser.village_ids}
                      label="Projects (Multiple)"
                      onChange={(e) => {
                        const values = e.target.value as unknown as number[];
                        setNewUser({
                          ...newUser,
                          village_ids: values
                        });
                      }}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as unknown as number[]).map((value) => {
                            const village = villages.find(v => v.id === value);
                            return <Chip key={value} label={village?.name || value} />;
                          })}
                        </Box>
                      )}
                    >
                      {villages.map(village => (
                        <MenuItem key={village.id} value={village.id}>
                          {village.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
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
              
              {/* Passport Information */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Passport Information</Typography>
              <TextField
                fullWidth
                label="Passport Number"
                value={newUser.passport_number}
                onChange={(e) => setNewUser({ ...newUser, passport_number: e.target.value })}
                margin="normal"
              />
              <DatePicker
                label="Passport Expiry Date"
                value={newUser.passport_expiry_date ? new Date(newUser.passport_expiry_date) : null}
                onChange={(date) => setNewUser({ 
                  ...newUser, 
                  passport_expiry_date: date ? date.toISOString().split('T')[0] : '' 
                })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal'
                  }
                }}
              />
              
              {/* Address */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Address</Typography>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={3}
                value={newUser.address}
                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                margin="normal"
              />
              
              {/* Next of Kin Information */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Next of Kin Information</Typography>
              <TextField
                fullWidth
                label="Next of Kin Name"
                value={newUser.next_of_kin_name}
                onChange={(e) => setNewUser({ ...newUser, next_of_kin_name: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Next of Kin Phone"
                value={newUser.next_of_kin_phone}
                onChange={(e) => setNewUser({ ...newUser, next_of_kin_phone: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Next of Kin Email"
                type="email"
                value={newUser.next_of_kin_email}
                onChange={(e) => setNewUser({ ...newUser, next_of_kin_email: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Next of Kin Address"
                multiline
                rows={3}
                value={newUser.next_of_kin_address}
                onChange={(e) => setNewUser({ ...newUser, next_of_kin_address: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Next of Kin Will"
                multiline
                rows={3}
                value={newUser.next_of_kin_will}
                onChange={(e) => setNewUser({ ...newUser, next_of_kin_will: e.target.value })}
                margin="normal"
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
