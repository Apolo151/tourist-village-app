import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Divider, Button, Avatar } from '@mui/material';
import { Menu as MenuIcon, Dashboard, Apartment, BookOnline, Payments, Engineering, WaterDrop, Receipt, Email, Settings } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import { userService } from '../services/userService';

const drawerWidth = 240;

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profile, setProfile] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', phone: currentUser?.phone_number || '' });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profilePassword, setProfilePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close mobile drawer when navigating
  useEffect(() => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  }, [location.pathname]);

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, link: '/' },
    { text: 'Apartments', icon: <Apartment />, link: '/apartments' },
    { text: 'Bookings', icon: <BookOnline />, link: '/bookings', adminOnly: true },
    { text: 'Services', icon: <Engineering />, link: '/services' },
    { text: 'Utilities', icon: <WaterDrop />, link: '/utilities', adminOnly: true },
    { text: 'Payments', icon: <Payments />, link: '/payments' },
    { text: 'Bills', icon: <Receipt />, link: '/bills' },
    { text: 'Emails', icon: <Email />, link: '/emails', adminOnly: true },
    { text: 'Settings', icon: <Settings />, link: '/settings' },
  ];

  // Function to check if a menu item is active
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Only allow Dashboard, Apartments, and Services for owner/renter
  const allowedForOwnerRenter = ['Dashboard', 'Apartments', 'Services'];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        p: 2.5, 
        backgroundColor: '#0c1e35', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center' 
      }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          Tourist Village
        </Typography>
      </Box>
      <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
      <List sx={{ 
        flexGrow: 1, 
        backgroundColor: '#0c1e35', 
        color: 'white', 
        height: '100%',
        pt: 1 
      }}>
        {menuItems.map((item) => (
          (currentUser && (currentUser.role === 'owner' || currentUser.role === 'renter'))
            ? (allowedForOwnerRenter.includes(item.text) && (
                <ListItem key={item.text} disablePadding sx={{ mb: 0.5, mx: 1 }}>
                  <ListItemButton 
                    component={Link} 
                    to={item.link} 
                    selected={isActive(item.link)}
                    sx={{ 
                      color: 'white',
                      borderRadius: '8px',
                      py: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.25)',
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ 
                      color: isActive(item.link) ? 'white' : 'rgba(255, 255, 255, 0.7)', 
                      minWidth: '40px' 
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: isActive(item.link) ? 'bold' : 'normal'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            : (
              // Existing admin/super_admin logic
              (!item.adminOnly || (currentUser?.role === 'admin' || currentUser?.role === 'super_admin')) &&
              (item.text !== 'Settings' || (currentUser?.role === 'admin' || currentUser?.role === 'super_admin')) &&
              ((item.text !== 'Bills' && item.text !== 'Payments') || (currentUser?.role === 'admin' || currentUser?.role === 'super_admin')) && (
                <ListItem key={item.text} disablePadding sx={{ mb: 0.5, mx: 1 }}>
                  <ListItemButton 
                    component={Link} 
                    to={item.link} 
                    selected={isActive(item.link)}
                    sx={{ 
                      color: 'white',
                      borderRadius: '8px',
                      py: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.25)',
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ 
                      color: isActive(item.link) ? 'white' : 'rgba(255, 255, 255, 0.7)', 
                      minWidth: '40px' 
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: isActive(item.link) ? 'bold' : 'normal'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )
            )
        ))}
      </List>
      {currentUser && (
        <div onClick={() => setProfileDialogOpen(true)} style={{ cursor: 'pointer' }}>
          <Box sx={{
            p: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}>
            <Avatar sx={{ 
              width: 36, 
              height: 36, 
              bgcolor: 'primary.main',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}>
              {currentUser?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'medium', lineHeight: 1.2 }}>
                {currentUser?.name}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'capitalize' }}>
                {currentUser?.role}
              </Typography>
            </Box>
          </Box>
        </div>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'white',
          color: 'black',
          boxShadow: 'none',
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'medium' }}>
            {menuItems.find(item => isActive(item.link))?.text || 'Tourist Village Management'}
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
            sx={{ 
              textTransform: 'none',
              color: '#555',
              fontWeight: 'medium',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: '#0c1e35',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: '#0c1e35',
              borderRight: 'none'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          width: { sm: `calc(100% - ${drawerWidth}px)` }, 
          marginTop: '64px',
          height: 'calc(100vh - 64px)',
          backgroundColor: '#f8fafc',
          display: 'flex',
          overflow: 'auto'
        }}
      >
        <Box
          sx={{ 
            flexGrow: 1,
            width: '100%',
            height: '100%',
            p: 0
          }}
        >
          <Outlet />
        </Box>
      </Box>
      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)}>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          {profileError && <Alert severity="error" sx={{ mb: 2 }}>{profileError}</Alert>}
          {profileSuccess && <Alert severity="success" sx={{ mb: 2 }}>{profileSuccess}</Alert>}
          <TextField
            margin="dense"
            label="Name"
            fullWidth
            value={profile.name}
            onChange={e => setProfile({ ...profile, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Email"
            fullWidth
            value={profile.email}
            onChange={e => setProfile({ ...profile, email: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Phone"
            fullWidth
            value={profile.phone}
            onChange={e => setProfile({ ...profile, phone: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            value={profilePassword}
            onChange={e => setProfilePassword(e.target.value)}
            helperText="Leave blank to keep current password"
            InputProps={{
              endAdornment: (
                <Button onClick={() => setShowPassword(v => !v)} size="small">
                  {showPassword ? 'Hide' : 'Show'}
                </Button>
              )
            }}
          />
          <TextField
            margin="dense"
            label="Role"
            fullWidth
            value={currentUser?.role}
            disabled
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)} disabled={profileLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              setProfileError('');
              setProfileSuccess('');
              setProfileLoading(true);
              try {
                if (!currentUser) throw new Error('No user');
                const updateData: any = { name: profile.name, email: profile.email, phone_number: profile.phone };
                if (profilePassword) updateData.password = profilePassword;
                await userService.updateUser(currentUser.id, updateData);
                setProfileSuccess('Profile updated successfully');
                setProfilePassword('');
              } catch (err) {
                if (err instanceof Error) {
                  setProfileError(err.message || 'Failed to update profile');
                } else {
                  setProfileError('Failed to update profile');
                }
              } finally {
                setProfileLoading(false);
              }
            }}
            disabled={profileLoading}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 