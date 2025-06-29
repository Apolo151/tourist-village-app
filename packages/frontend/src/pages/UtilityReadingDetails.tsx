import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  Chip,
  Divider,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { utilityReadingService, type UtilityReading } from '../services/utilityReadingService';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const UtilityReadingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reading, setReading] = useState<UtilityReading | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);

  // Load utility reading data
  useEffect(() => {
    const loadReading = async () => {
      if (!id) {
        setError('No utility reading ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const readingData = await utilityReadingService.getUtilityReadingById(parseInt(id));
        setReading(readingData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load utility reading');
      } finally {
        setLoading(false);
      }
    };

    loadReading();
  }, [id]);

  // Helper functions
  const getUtilityTypesDisplay = (reading: UtilityReading): string[] => {
    const types: string[] = [];
    if (reading.water_start_reading !== undefined || reading.water_end_reading !== undefined) {
      types.push('Water');
    }
    if (reading.electricity_start_reading !== undefined || reading.electricity_end_reading !== undefined) {
      types.push('Electricity');
    }
    return types;
  };

  const calculateBill = (utilityType: 'water' | 'electricity') => {
    if (!reading || !reading.apartment?.village) return null;

    const village = reading.apartment.village;
    let startReading: number | undefined;
    let endReading: number | undefined;
    let unitPrice: number;

    if (utilityType === 'water') {
      startReading = reading.water_start_reading;
      endReading = reading.water_end_reading;
      unitPrice = village.water_price;
    } else {
      startReading = reading.electricity_start_reading;
      endReading = reading.electricity_end_reading;
      unitPrice = village.electricity_price;
    }

    if (startReading === undefined || endReading === undefined || endReading <= startReading) {
      return null;
    }

    const consumption = endReading - startReading;
    return {
      consumption,
      cost: consumption * unitPrice
    };
  };

  const handleDelete = async () => {
    if (!reading) return;

    try {
      await utilityReadingService.deleteUtilityReading(reading.id);
      navigate('/utilities');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete utility reading');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !reading) {
    return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/utilities')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4">
            Utility Reading Details
          </Typography>
        </Box>
        
        <Alert severity="error">
          {error || 'Utility reading not found'}
        </Alert>
      </Box>
    );
  }

  const utilityTypes = getUtilityTypesDisplay(reading);
  const waterBill = calculateBill('water');
  const electricityBill = calculateBill('electricity');
  const totalCost = (waterBill?.cost || 0) + (electricityBill?.cost || 0);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/utilities')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" sx={{ mt: 3 }}>
            Utility Reading Details
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, pr: 2 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/utilities/${reading.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Reading Information
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="primary">
                  Apartment
                </Typography>
                <Typography variant="body1">
                  {reading.apartment?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {reading.apartment?.village?.name} - Phase {reading.apartment?.phase}
                </Typography>
              </Grid>

              {reading.booking && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="primary">
                    Related Booking
                  </Typography>
                  <Typography variant="body1">
                    {reading.booking.user?.name} ({reading.booking.user_type})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {utilityReadingService.formatDate(reading.booking.arrival_date)} - {utilityReadingService.formatDate(reading.booking.leaving_date)}
                  </Typography>
                </Grid>
              )}

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="primary">
                  Reading Period
                </Typography>
                <Typography variant="body1">
                  {utilityReadingService.formatDate(reading.start_date)} - {utilityReadingService.formatDate(reading.end_date)}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="primary">
                  Who Pays
                </Typography>
                <Chip
                  label={reading.who_pays}
                  color={utilityReadingService.getWhoPaysBadgeColor(reading.who_pays)}
                  size="small"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="primary">
                  Utility Types
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {utilityTypes.map(type => (
                    <Chip key={type} label={type} size="small" />
                  ))}
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="primary">
                  Created By
                </Typography>
                <Typography variant="body1">
                  {reading.created_by_user?.name || `User ID: ${reading.created_by}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {utilityReadingService.formatDateTime(reading.created_at)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Utility Readings Table */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Meter Readings
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Utility Type</TableCell>
                    <TableCell align="right">Start Reading</TableCell>
                    <TableCell align="right">End Reading</TableCell>
                    <TableCell align="right">Consumption</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total Cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reading.water_start_reading !== undefined && (
                    <TableRow>
                      <TableCell>💧 Water</TableCell>
                      <TableCell align="right">
                        {reading.water_start_reading?.toFixed(2) || '-'}
                      </TableCell>
                      <TableCell align="right">
                        {reading.water_end_reading?.toFixed(2) || '-'}
                      </TableCell>
                      <TableCell align="right">
                        {waterBill ? `${waterBill.consumption.toFixed(2)} units` : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {reading.apartment?.village?.water_price?.toFixed(2)} EGP/unit
                      </TableCell>
                      <TableCell align="right">
                        {waterBill ? `${waterBill.cost.toFixed(2)} EGP` : '-'}
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {reading.electricity_start_reading !== undefined && (
                    <TableRow>
                      <TableCell>⚡ Electricity</TableCell>
                      <TableCell align="right">
                        {reading.electricity_start_reading?.toFixed(2) || '-'}
                      </TableCell>
                      <TableCell align="right">
                        {reading.electricity_end_reading?.toFixed(2) || '-'}
                      </TableCell>
                      <TableCell align="right">
                        {electricityBill ? `${electricityBill.consumption.toFixed(2)} units` : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {reading.apartment?.village?.electricity_price?.toFixed(2)} EGP/unit
                      </TableCell>
                      <TableCell align="right">
                        {electricityBill ? `${electricityBill.cost.toFixed(2)} EGP` : '-'}
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {(waterBill || electricityBill) && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ fontWeight: 'bold' }}>
                        Total Cost
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {totalCost.toFixed(2)} EGP
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Summary Cards */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Bill Summary */}
          {(waterBill || electricityBill) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                  Bill Summary
                </Typography>
                
                {waterBill && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="medium">
                      💧 Water Bill
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {waterBill.consumption.toFixed(2)} units × {reading.apartment?.village?.water_price?.toFixed(2)} EGP
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {waterBill.cost.toFixed(2)} EGP
                    </Typography>
                  </Box>
                )}
                
                {electricityBill && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="medium">
                      ⚡ Electricity Bill
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {electricityBill.consumption.toFixed(2)} units × {reading.apartment?.village?.electricity_price?.toFixed(2)} EGP
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {electricityBill.cost.toFixed(2)} EGP
                    </Typography>
                  </Box>
                )}
                
                <Divider sx={{ my: 2 }} />
                
                <Box>
                  <Typography variant="h6" color="primary">
                    Total: {totalCost.toFixed(2)} EGP
                  </Typography>
                  <Chip
                    label={`Paid by ${reading.who_pays}`}
                    color={utilityReadingService.getWhoPaysBadgeColor(reading.who_pays)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Project Information */}
          {reading.apartment?.village && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                  Project Rates
                </Typography>
                
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    💧 Water: {reading.apartment.village.water_price.toFixed(2)} EGP/unit
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2">
                    ⚡ Electricity: {reading.apartment.village.electricity_price.toFixed(2)} EGP/unit
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Status Information */}
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                Status
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Complete Readings
                </Typography>
                <Typography variant="body1">
                  {utilityReadingService.isReadingComplete(reading) ? 'Yes' : 'Incomplete'}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body1">
                  {utilityReadingService.formatDateTime(reading.updated_at)}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Reading ID
                </Typography>
                <Typography variant="body1">
                  #{reading.id || "N/A"}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Utility Reading</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this utility reading? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UtilityReadingDetails;
