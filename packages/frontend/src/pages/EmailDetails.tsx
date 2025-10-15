import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  Grid,
  CircularProgress,
  Container,
  Chip,
  Divider,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import { emailService } from '../services/emailService';
import type { Email } from '../services/emailService';
import { format, parseISO } from 'date-fns';

const EmailDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<Email | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Check permissions
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Check admin access
  useEffect(() => {
    if (!isAdmin) {
      navigate('/unauthorized');
    }
  }, [currentUser?.role, navigate, isAdmin]);

  // Load email data
  useEffect(() => {
    const loadEmailData = async () => {
      if (!id) {
        setError('Email ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const emailData = await emailService.getEmailById(parseInt(id));
        setEmail(emailData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load email data');
      } finally {
        setLoading(false);
      }
    };

    loadEmailData();
  }, [id]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  // Handle actions
  const handleBack = () => {
    navigate('/emails');
  };

  const handleEdit = () => {
    navigate(`/emails/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      setDeleting(true);
      await emailService.deleteEmail(parseInt(id));
      setDeleteDialogOpen(false);
      navigate('/emails?success=true&message=Email%20deleted%20successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete email');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !email) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error || 'Email not found'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Emails
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ width: '100%', mt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" sx={{ flex: 1 }}>
            Email Details
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              startIcon={<EditIcon />}
              variant="outlined"
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              color="error"
              variant="contained"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </Box>
        </Box>

        {/* Email Details */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            {/* Email Header */}
            <Grid size={{xs: 12}}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">{email.subject}</Typography>
                <Chip 
                  label={emailService.getEmailTypeDisplayName(email.type)}
                  color={emailService.getEmailTypeColor(email.type)}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            {/* Email Metadata */}
            <Grid size={{xs: 12, sm: 6}}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                  <Typography variant="body1">{formatDate(email.date)}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{xs: 12, sm: 6}}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip
                    label={email.status === 'completed' ? 'Completed' : 'Pending'}
                    color={email.status === 'completed' ? 'success' : 'warning'}
                    size="small"
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{xs: 12, sm: 6}}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">From</Typography>
                  <Typography variant="body1">{email.from}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{xs: 12, sm: 6}}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">To</Typography>
                  <Typography variant="body1">{email.to}</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Related Information */}
            <Grid size={{xs: 12, sm: 6}}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Related Apartment</Typography>
                  <Typography variant="body1">
                    {email.apartment?.name || `Apartment #${email.apartment_id}`}
                  </Typography>
                  {email.apartment?.village && (
                    <Typography variant="body2" color="text.secondary">
                      {email.apartment.village.name} - Phase {email.apartment.phase}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {email.booking && (
              <Grid size={{xs: 12, sm: 6}}>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Related Booking</Typography>
                    <Typography variant="body1">
                      Booking #{email.booking.id}
                    </Typography>
                    {email.booking.user && (
                      <Typography variant="body2" color="text.secondary">
                        {email.booking.user.name} ({email.booking.user_type})
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Email Content */}
            <Grid size={{xs: 12}}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Email Content</Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 3, 
                  backgroundColor: 'background.default',
                  whiteSpace: 'pre-wrap',
                  overflow: 'auto',
                  maxHeight: '400px'
                }}
              >
                <Typography variant="body1">
                  {email.content}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Email</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this email? This action cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default EmailDetails;
