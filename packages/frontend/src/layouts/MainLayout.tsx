import { Outlet, Link, useNavigate } from 'react-router-dom';
import { AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Divider, Button } from '@mui/material';
import { Menu as MenuIcon, Dashboard, Apartment, Email, BookOnline, Payments, Engineering, WaterDrop, People, Settings, Logout } from '@mui/icons-material';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, link: '/' },
    { text: 'Apartments', icon: <Apartment />, link: '/apartments' },
    { text: 'Bookings', icon: <BookOnline />, link: '/bookings', adminOnly: true },
    { text: 'Services', icon: <Engineering />, link: '/services' },
    { text: 'Utilities', icon: <WaterDrop />, link: '/utilities', adminOnly: true },
    { text: 'Payments', icon: <Payments />, link: '/payments' },
    { text: 'Emails', icon: <Email />, link: '/emails', adminOnly: true },
    { text: 'Users', icon: <People />, link: '/users', adminOnly: true },
    { text: 'Settings', icon: <Settings />, link: '/settings', adminOnly: true },
  ];

  const drawer = (
    <>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Tourist Village
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          // Only show admin-only items to admin users
          (!item.adminOnly || currentUser?.role === 'admin') && (
            <ListItem key={item.text} disablePadding>
              <ListItemButton component={Link} to={item.link}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          )
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><Logout /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
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
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Tourist Village Management
          </Typography>
          {currentUser && (
            <Typography variant="body1" sx={{ mr: 2 }}>
              {currentUser.name} ({currentUser.role})
            </Typography>
          )}
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, marginTop: '64px' }}
      >
        <Outlet />
      </Box>
    </Box>
  );
} 