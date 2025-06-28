import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, TextField, Typography, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { EnhancedErrorDisplay } from '../components/EnhancedErrorDisplay';
import { ErrorMessageHandler } from '../utils/errorUtils';
import type { DetailedError } from '../utils/errorUtils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [detailedError, setDetailedError] = useState<DetailedError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading while checking auth status
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailedError(null);
    setIsSubmitting(true);
    
    // Client-side validation
    if (!email.trim()) {
      setDetailedError({
        title: 'Email Required',
        message: 'Please enter your email address.',
        action: 'Enter the email address you used when registering your account.',
        field: 'email',
        type: 'validation'
      });
      setIsSubmitting(false);
      return;
    }

    if (!password.trim()) {
      setDetailedError({
        title: 'Password Required',
        message: 'Please enter your password.',
        action: 'Enter the password for your account.',
        field: 'password',
        type: 'validation'
      });
      setIsSubmitting(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setDetailedError({
        title: 'Invalid Email Format',
        message: 'Please enter a valid email address.',
        action: 'Make sure your email contains @ and a valid domain (e.g., user@example.com).',
        field: 'email',
        type: 'validation'
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      const success = await login(email, password);
      
      if (success) {
        // Use replace to prevent going back to login page
        navigate('/', { replace: true });
      } else {
        setDetailedError({
          title: 'Login Failed',
          message: 'Invalid email or password.',
          action: 'Double-check your email and password. If you forgot your password, contact your administrator.',
          type: 'validation'
        });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const enhancedError = ErrorMessageHandler.getContextualErrorMessage('login', err);
      setDetailedError(enhancedError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryLogin = () => {
    setDetailedError(null);
    // Focus on email field for retry
    const emailField = document.getElementById('email');
    if (emailField) {
      emailField.focus();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: 400,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography 
          component="h1" 
          variant="h4" 
          sx={{ 
            mb: 4,
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          Tourist Village Management
        </Typography>
        
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Typography 
            component="h2" 
            variant="h5" 
            sx={{ 
              mb: 2,
              textAlign: 'center'
            }}
          >
            Login
          </Typography>
          
          {detailedError && (
            <Box sx={{ mb: 2 }}>
              <EnhancedErrorDisplay
                error={detailedError}
                onRetry={handleRetryLogin}
                showDetails={true}
              />
            </Box>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              error={detailedError?.field === 'email'}
              helperText={detailedError?.field === 'email' ? 'Please check your email format' : ''}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              error={detailedError?.field === 'password'}
              helperText={detailedError?.field === 'password' ? 'Please enter your password' : ''}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            Demo Login: admin@touristvillage.com / superadmin
          </Typography>    
        </Paper>
      </Box>
    </Box>
  );
} 