import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  InputAdornment,
  FormHelperText,
  Chip,
  Alert,
  Divider,
  Snackbar,
  Switch,
  FormControlLabel,
  Stack
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  WaterDrop as WaterIcon,
  ElectricBolt as ElectricityIcon,
  LocalFireDepartment as GasIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { mockUtilityReadings, mockApartments, mockBookings, mockSettings } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { UtilityReading, UtilityType, ReadingType, Payment } from '../types';

// Utility Form component for adding new readings
function UtilityReadingForm({ 
  onSave, 
  onCancel 
}: { 
  onSave: (reading: Partial<UtilityReading>, addEndReading: boolean) => void;
  onCancel: () => void;
}) {
  const { currentUser } = useAuth();
  const [apartmentId, setApartmentId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [type, setType] = useState<ReadingType>('start');
  const [utilityType, setUtilityType] = useState<UtilityType>('electricity');
  const [value, setValue] = useState(0);
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [addEndReading, setAddEndReading] = useState(false);
  const [endValue, setEndValue] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Filter bookings based on selected apartment
  const filteredBookings = mockBookings.filter(booking => 
    !apartmentId || booking.apartmentId === apartmentId
  );
  
  // Get selected booking details
  const selectedBooking = bookingId ? 
    mockBookings.find(booking => booking.id === bookingId) : 
    undefined;
  
  // Update date when booking is selected
  useEffect(() => {
    if (selectedBooking) {
      if (type === 'start') {
        setDate(selectedBooking.arrivalDate);
      } else {
        setDate(selectedBooking.leavingDate);
      }
    }
  }, [bookingId, selectedBooking, type]);
  
  // Reset booking when apartment changes
  useEffect(() => {
    setBookingId('');
  }, [apartmentId]);
  
  // Calculate estimated bill when end reading is added
  const calculateEstimatedBill = () => {
    if (addEndReading && value > 0 && endValue > 0 && endValue > value) {
      const consumption = endValue - value;
      let cost = 0;
      
      switch (utilityType) {
        case 'electricity':
          cost = consumption * mockSettings.electricityPrice;
          break;
        case 'water':
          cost = consumption * mockSettings.waterPrice;
          break;
        case 'gas':
          cost = consumption * mockSettings.gasPrice;
          break;
      }
      
      return cost.toFixed(2);
    }
    return null;
  };
  
  const handleApartmentChange = (event: SelectChangeEvent) => {
    setApartmentId(event.target.value);
  };
  
  const handleBookingChange = (event: SelectChangeEvent) => {
    setBookingId(event.target.value);
  };
  
  const handleTypeChange = (event: SelectChangeEvent) => {
    setType(event.target.value as ReadingType);
  };
  
  const handleUtilityTypeChange = (event: SelectChangeEvent) => {
    setUtilityType(event.target.value as UtilityType);
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!apartmentId) newErrors.apartmentId = 'Apartment is required';
    if (!bookingId) newErrors.bookingId = 'Booking is required';
    if (!utilityType) newErrors.utilityType = 'Utility type is required';
    if (value <= 0) newErrors.value = 'Reading value must be greater than 0';
    if (!date) newErrors.date = 'Date is required';
    
    // Check if reading date is within booking dates
    if (date && selectedBooking) {
      const readingDate = new Date(date);
      const arrivalDate = new Date(selectedBooking.arrivalDate);
      const leavingDate = new Date(selectedBooking.leavingDate);
      
      if (readingDate < arrivalDate || readingDate > leavingDate) {
        newErrors.date = 'Reading date must be within the booking dates';
      }
    }
    
    // Validate end reading if adding both
    if (addEndReading) {
      if (endValue <= 0) {
        newErrors.endValue = 'End reading value must be greater than 0';
      } else if (endValue <= value) {
        newErrors.endValue = 'End reading value must be greater than start reading';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = () => {
    if (validate()) {
      const reading: Partial<UtilityReading> = {
        apartmentId,
        bookingId,
        type,
        utilityType,
        value,
        date,
        notes: notes || undefined,
        createdById: currentUser?.id || ''
      };
      
      onSave(reading, addEndReading && endValue > 0);
    }
  };
  
  // Get min and max dates for the reading based on booking
  const getDateConstraints = () => {
    if (selectedBooking) {
      return {
        min: selectedBooking.arrivalDate,
        max: selectedBooking.leavingDate
      };
    }
    return { min: '', max: '' };
  };
  
  const dateConstraints = getDateConstraints();
  const estimatedBill = calculateEstimatedBill();
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Add New Utility Reading</Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 3
      }}>
        <FormControl fullWidth error={!!errors.apartmentId}>
          <InputLabel>Apartment</InputLabel>
          <Select
            value={apartmentId}
            label="Apartment"
            onChange={handleApartmentChange}
          >
            {mockApartments.map(apt => (
              <MenuItem key={apt.id} value={apt.id}>{apt.name}</MenuItem>
            ))}
          </Select>
          {errors.apartmentId && <FormHelperText>{errors.apartmentId}</FormHelperText>}
        </FormControl>
        
        <FormControl fullWidth error={!!errors.bookingId} disabled={!apartmentId}>
          <InputLabel>Booking</InputLabel>
          <Select
            value={bookingId}
            label="Booking"
            onChange={handleBookingChange}
          >
            {filteredBookings.map(booking => {
              const apt = mockApartments.find(a => a.id === booking.apartmentId);
              return (
                <MenuItem key={booking.id} value={booking.id}>
                  {apt?.name || 'Unknown'} - {new Date(booking.arrivalDate).toLocaleDateString()} to {new Date(booking.leavingDate).toLocaleDateString()}
                </MenuItem>
              );
            })}
          </Select>
          {errors.bookingId && <FormHelperText>{errors.bookingId}</FormHelperText>}
        </FormControl>
        
        <FormControl fullWidth>
          <InputLabel>Reading Type</InputLabel>
          <Select
            value={type}
            label="Reading Type"
            onChange={handleTypeChange}
          >
            <MenuItem value="start">Start Reading</MenuItem>
            <MenuItem value="end">End Reading</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl fullWidth error={!!errors.utilityType}>
          <InputLabel>Utility Type</InputLabel>
          <Select
            value={utilityType}
            label="Utility Type"
            onChange={handleUtilityTypeChange}
          >
            <MenuItem value="electricity">Electricity</MenuItem>
            <MenuItem value="water">Water</MenuItem>
            <MenuItem value="gas">Gas</MenuItem>
          </Select>
          {errors.utilityType && <FormHelperText>{errors.utilityType}</FormHelperText>}
        </FormControl>
        
        <TextField
          fullWidth
          label="Reading Value"
          type="number"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          error={!!errors.value}
          helperText={errors.value}
        />
        
        <TextField
          fullWidth
          label="Reading Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          error={!!errors.date}
          helperText={errors.date || "Date should be within booking dates"}
          inputProps={{
            min: dateConstraints.min,
            max: dateConstraints.max
          }}
        />
        
        <TextField
          fullWidth
          label="Notes"
          multiline
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ gridColumn: { xs: '1', md: '1 / 3' } }}
        />
      </Box>
      
      {type === 'start' && (
        <Box sx={{ mt: 3 }}>
          <FormControlLabel 
            control={
              <Switch 
                checked={addEndReading} 
                onChange={(e) => setAddEndReading(e.target.checked)} 
              />
            } 
            label="Also add end reading now" 
          />
          <Typography variant="caption" color="text.secondary" display="block">
            This will automatically create an end reading and calculate utility bill
          </Typography>
          
          {addEndReading && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>End Reading Details</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="End Reading Value"
                  type="number"
                  value={endValue}
                  onChange={(e) => setEndValue(Number(e.target.value))}
                  error={!!errors.endValue}
                  helperText={errors.endValue}
                />
                <TextField
                  fullWidth
                  label="End Reading Date"
                  type="date"
                  value={selectedBooking?.leavingDate || ''}
                  InputLabelProps={{ shrink: true }}
                  disabled
                  helperText="End reading date is set to booking end date"
                />
              </Stack>
              
              {estimatedBill && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', alignItems: 'center' }}>
                  <ReceiptIcon color="primary" sx={{ mr: 1 }} />
                  <Typography>
                    <strong>Estimated Bill:</strong> {estimatedBill} EGP ({endValue - value} units of {utilityType})
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
        >
          Save Reading
        </Button>
      </Box>
    </Box>
  );
}

// Main Utilities component
export default function Utilities() {
  const [searchTerm, setSearchTerm] = useState('');
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Filter utility readings
  const filteredReadings = mockUtilityReadings.filter(reading => {
    const matchesSearch = searchTerm ? 
      reading.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reading.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reading.utilityType.toLowerCase().includes(searchTerm.toLowerCase()) : 
      true;
    
    const matchesApartment = apartmentFilter ? reading.apartmentId === apartmentFilter : true;
    const matchesBooking = bookingFilter ? reading.bookingId === bookingFilter : true;
    
    return matchesSearch && matchesApartment && matchesBooking;
  });
  
  // Filtered bookings based on selected apartment
  const filteredBookings = mockBookings.filter(booking => 
    !apartmentFilter || booking.apartmentId === apartmentFilter
  );
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleApartmentFilterChange = (event: SelectChangeEvent) => {
    setApartmentFilter(event.target.value);
    setBookingFilter(''); // Reset booking filter when apartment changes
  };
  
  const handleBookingFilterChange = (event: SelectChangeEvent) => {
    setBookingFilter(event.target.value);
  };
  
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };
  
  const handleAddReading = () => {
    setShowAddDialog(true);
  };
  
  const handleCloseDialog = () => {
    setShowAddDialog(false);
  };
  
  const handleEditReading = (id: string) => {
    navigate(`/utilities/${id}`);
  };
  
  const handleSaveReading = (reading: Partial<UtilityReading>, addEndReading: boolean) => {
    console.log('Saving reading:', reading);
    
    // Calculate bill if it's an end reading or if addEndReading is true
    // In a real app, this would be handled by the backend
    if (reading.type === 'end' || addEndReading) {
      // Find the start reading
      const startReading = mockUtilityReadings.find(r => 
        r.bookingId === reading.bookingId && 
        r.utilityType === reading.utilityType && 
        r.type === 'start'
      );
      
      if (startReading) {
        const consumption = reading.value! - startReading.value;
        let cost = 0;
        
        // Calculate cost based on utility type
        switch (reading.utilityType) {
          case 'electricity':
            cost = consumption * mockSettings.electricityPrice;
            break;
          case 'water':
            cost = consumption * mockSettings.waterPrice;
            break;
          case 'gas':
            cost = consumption * mockSettings.gasPrice;
            break;
        }
        
        console.log(`Calculated bill: ${cost} EGP (${consumption} units of ${reading.utilityType || 'unknown'})`);
        
        // Create a new payment for the utility bill
        const booking = mockBookings.find(b => b.id === reading.bookingId);
        if (booking) {
          const newPayment: Partial<Payment> = {
            cost,
            currency: 'EGP',
            description: `${(reading.utilityType || 'utility').charAt(0).toUpperCase() + (reading.utilityType || 'utility').slice(1)} bill (${consumption} units)`,
            placeOfPayment: 'System Generated',
            userType: 'renter',
            userId: booking.userId,
            apartmentId: reading.apartmentId,
            bookingId: reading.bookingId,
            createdById: currentUser?.id || '',
            createdAt: new Date().toISOString()
          };
          
          console.log('Creating payment:', newPayment);
        }
        
        setAlertSeverity('success');
        setAlertMessage(`Utility bill calculated and added: ${cost.toFixed(2)} EGP`);
      } else if (reading.type === 'end') {
        setAlertSeverity('warning');
        setAlertMessage('No start reading found for this booking and utility type. Bill not calculated.');
      }
    } else {
      setAlertSeverity('success');
      setAlertMessage('Reading saved successfully');
    }
    
    setShowAlert(true);
    setShowAddDialog(false);
  };
  
  // Utility icon based on type
  const getUtilityIcon = (type: UtilityType) => {
    switch (type) {
      case 'electricity':
        return <ElectricityIcon color="primary" />;
      case 'water':
        return <WaterIcon color="info" />;
      case 'gas':
        return <GasIcon color="error" />;
      default:
        return null;
    }
  };
  
  // Format reading type
  const formatReadingType = (type: ReadingType) => {
    return type === 'start' ? 'Start Reading' : 'End Reading';
  };
  
  // Check if user is authorized to access this page
  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      navigate('/unauthorized');
    }
  }, [currentUser, navigate]);
  
  // Check if a reading has a corresponding end/start reading
  const hasCorrespondingReading = (reading: UtilityReading) => {
    const readingType = reading.type === 'start' ? 'end' : 'start';
    return mockUtilityReadings.some(r => 
      r.bookingId === reading.bookingId && 
      r.utilityType === reading.utilityType && 
      r.type === readingType
    );
  };
  
  // Get bill amount if available
  const getBillAmount = (reading: UtilityReading) => {
    if (reading.type === 'end') {
      const startReading = mockUtilityReadings.find(r => 
        r.bookingId === reading.bookingId && 
        r.utilityType === reading.utilityType && 
        r.type === 'start'
      );
      
      if (startReading) {
        const consumption = reading.value - startReading.value;
        let cost = 0;
        
        switch (reading.utilityType) {
          case 'electricity':
            cost = consumption * mockSettings.electricityPrice;
            break;
          case 'water':
            cost = consumption * mockSettings.waterPrice;
            break;
          case 'gas':
            cost = consumption * mockSettings.gasPrice;
            break;
        }
        
        return `${cost.toFixed(2)} EGP`;
      }
    }
    return null;
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Utilities Readings</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddReading}
          >
            Add New Reading
          </Button>
        </Box>
        
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="Search"
              variant="outlined"
              size="small"
              sx={{ flexGrow: 1, minWidth: '200px' }}
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              placeholder="Search by ID, utility type, or notes"
            />
            
            <Button
              startIcon={<FilterListIcon />}
              onClick={toggleFilters}
              variant={showFilters ? "contained" : "outlined"}
              size="small"
            >
              Filters {(apartmentFilter || bookingFilter) && '(Active)'}
            </Button>
          </Box>
          
          {showFilters && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel>Apartment</InputLabel>
                <Select
                  value={apartmentFilter}
                  label="Apartment"
                  onChange={handleApartmentFilterChange}
                >
                  <MenuItem value="">
                    <em>All Apartments</em>
                  </MenuItem>
                  {mockApartments.map(apt => (
                    <MenuItem key={apt.id} value={apt.id}>{apt.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl sx={{ minWidth: 200 }} size="small" disabled={!apartmentFilter}>
                <InputLabel>Booking</InputLabel>
                <Select
                  value={bookingFilter}
                  label="Booking"
                  onChange={handleBookingFilterChange}
                >
                  <MenuItem value="">
                    <em>All Bookings</em>
                  </MenuItem>
                  {filteredBookings.map(booking => (
                    <MenuItem key={booking.id} value={booking.id}>
                      {new Date(booking.arrivalDate).toLocaleDateString()} - {new Date(booking.leavingDate).toLocaleDateString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </Paper>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Utility Type</TableCell>
                <TableCell>Reading Type</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Apartment</TableCell>
                <TableCell>Booking Dates</TableCell>
                <TableCell>Bill</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReadings.length > 0 ? (
                filteredReadings.map(reading => {
                  const apartment = mockApartments.find(apt => apt.id === reading.apartmentId);
                  const booking = mockBookings.find(booking => booking.id === reading.bookingId);
                  const billAmount = getBillAmount(reading);
                  const hasCorresponding = hasCorrespondingReading(reading);
                  
                  return (
                    <TableRow key={reading.id}>
                      <TableCell>{reading.id}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getUtilityIcon(reading.utilityType)}
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {reading.utilityType}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={formatReadingType(reading.type)} 
                          color={reading.type === 'start' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{reading.value}</TableCell>
                      <TableCell>{new Date(reading.date).toLocaleDateString()}</TableCell>
                      <TableCell>{apartment?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        {booking ? (
                          <>
                            {new Date(booking.arrivalDate).toLocaleDateString()} - {new Date(booking.leavingDate).toLocaleDateString()}
                          </>
                        ) : 'No booking'}
                      </TableCell>
                      <TableCell>
                        {billAmount ? (
                          <Chip 
                            icon={<ReceiptIcon />} 
                            label={billAmount} 
                            color="success" 
                            size="small" 
                            variant="outlined" 
                          />
                        ) : (
                          reading.type === 'end' ? 
                            <Chip label="No start reading" color="error" size="small" variant="outlined" /> :
                            hasCorresponding ? 
                              <Chip label="Completed" color="success" size="small" variant="outlined" /> : 
                              <Chip label="Pending end" color="warning" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>{reading.notes || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleEditReading(reading.id)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography variant="body1" py={3}>
                      No utility readings found matching your criteria.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      
      {/* Add Reading Dialog */}
      <Dialog open={showAddDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogContent>
          <UtilityReadingForm
            onSave={handleSaveReading}
            onCancel={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>
      
      {/* Alert Snackbar */}
      <Snackbar
        open={showAlert}
        autoHideDuration={6000}
        onClose={() => setShowAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowAlert(false)} 
          severity={alertSeverity} 
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
} 