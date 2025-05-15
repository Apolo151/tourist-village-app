import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Container,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormHelperText
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  WaterDrop as WaterIcon,
  ElectricBolt as ElectricityIcon,
  LocalFireDepartment as GasIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { mockUtilityReadings, mockApartments, mockBookings, mockSettings } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { UtilityReading, UtilityType, ReadingType, Payment } from '../types';

export default function UtilityReadingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const isNew = location.pathname === '/utilities/new';
  const [isEditing, setIsEditing] = useState(isNew);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Find reading from mock data
  const initialReading = id 
    ? mockUtilityReadings.find(reading => reading.id === id) 
    : undefined;
  
  const [reading, setReading] = useState<UtilityReading | undefined>(initialReading);
  const [apartmentId, setApartmentId] = useState(reading?.apartmentId || '');
  const [bookingId, setBookingId] = useState(reading?.bookingId || '');
  const [type, setType] = useState<ReadingType>(reading?.type || 'start');
  const [utilityType, setUtilityType] = useState<UtilityType>(reading?.utilityType || 'electricity');
  const [value, setValue] = useState(reading?.value || 0);
  const [date, setDate] = useState(reading?.date || '');
  const [notes, setNotes] = useState(reading?.notes || '');
  
  // Filter bookings based on selected apartment
  const filteredBookings = mockBookings.filter(booking => 
    !apartmentId || booking.apartmentId === apartmentId
  );
  
  // Get selected booking details
  const selectedBooking = bookingId ? 
    mockBookings.find(booking => booking.id === bookingId) : 
    undefined;
  
  // Apartment details
  const apartment = apartmentId ? 
    mockApartments.find(apt => apt.id === apartmentId) : 
    undefined;
  
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
  
  // Calculate bill if it's an end reading
  const calculateBill = () => {
    if (type === 'end' && bookingId) {
      // Find the start reading for this booking and utility
      const startReading = mockUtilityReadings.find(r => 
        r.bookingId === bookingId && 
        r.utilityType === utilityType && 
        r.type === 'start'
      );
      
      if (startReading && value > startReading.value) {
        const consumption = value - startReading.value;
        let cost = 0;
        
        // Calculate cost based on utility type
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
        
        return {
          consumption,
          cost: cost.toFixed(2),
          hasStartReading: true
        };
      }
      
      return {
        consumption: 0,
        cost: '0.00',
        hasStartReading: !!startReading
      };
    }
    
    return null;
  };
  
  const billDetails = calculateBill();
  
  useEffect(() => {
    // Redirect if not admin
    if (currentUser?.role !== 'admin') {
      navigate('/unauthorized');
    }
    
    // Set error if reading not found
    if (!isNew && !reading) {
      setError('Utility reading not found');
    }
  }, [currentUser?.role, reading, isNew, navigate]);
  
  useEffect(() => {
    // Reset booking when apartment changes
    if (apartmentId !== reading?.apartmentId) {
      setBookingId('');
    }
  }, [apartmentId, reading?.apartmentId]);
  
  // Update reading date when booking and type change
  useEffect(() => {
    if (selectedBooking && isEditing) {
      if (type === 'start') {
        setDate(selectedBooking.arrivalDate);
      } else {
        setDate(selectedBooking.leavingDate);
      }
    }
  }, [bookingId, type, selectedBooking, isEditing]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: inputValue } = e.target;
    if (name === 'value') {
      setValue(Number(inputValue));
    } else if (name === 'notes') {
      setNotes(inputValue);
    } else if (name === 'date') {
      setDate(inputValue);
    }
  };
  
  const handleSelectChange = (event: SelectChangeEvent, field: string) => {
    const value = event.target.value;
    switch (field) {
      case 'apartmentId':
        setApartmentId(value);
        break;
      case 'bookingId':
        setBookingId(value);
        break;
      case 'type':
        setType(value as ReadingType);
        break;
      case 'utilityType':
        setUtilityType(value as UtilityType);
        break;
      default:
        break;
    }
  };
  
  const handleBack = () => {
    navigate('/utilities');
  };
  
  const handleEdit = () => {
    setIsEditing(true);
    setSuccessMessage('');
    setError('');
  };
  
  const handleCancel = () => {
    if (isNew) {
      navigate('/utilities');
    } else {
      setIsEditing(false);
      // Reset to original values
      if (reading) {
        setApartmentId(reading.apartmentId);
        setBookingId(reading.bookingId || '');
        setType(reading.type);
        setUtilityType(reading.utilityType);
        setValue(reading.value);
        setDate(reading.date);
        setNotes(reading.notes || '');
      }
      setError('');
    }
  };
  
  const validate = (): boolean => {
    let isValid = true;
    const errors: string[] = [];
    
    if (!apartmentId) {
      errors.push('Apartment is required');
      isValid = false;
    }
    
    if (!bookingId) {
      errors.push('Booking is required');
      isValid = false;
    }
    
    if (value <= 0) {
      errors.push('Reading value must be greater than 0');
      isValid = false;
    }
    
    if (!date) {
      errors.push('Date is required');
      isValid = false;
    }
    
    // Check if reading date is within booking dates
    if (date && selectedBooking) {
      const readingDate = new Date(date);
      const arrivalDate = new Date(selectedBooking.arrivalDate);
      const leavingDate = new Date(selectedBooking.leavingDate);
      
      if (readingDate < arrivalDate || readingDate > leavingDate) {
        errors.push('Reading date must be within the booking dates');
        isValid = false;
      }
    }
    
    // For end readings, check if there's a start reading
    if (type === 'end') {
      const startReading = mockUtilityReadings.find(r => 
        r.bookingId === bookingId && 
        r.utilityType === utilityType && 
        r.type === 'start'
      );
      
      if (!startReading && !isNew) {
        errors.push('No start reading found for this booking and utility type');
      } else if (startReading && value <= startReading.value) {
        errors.push('End reading value must be greater than start reading value');
        isValid = false;
      }
    }
    
    if (!isValid) {
      setError(errors.join(', '));
    } else {
      setError('');
    }
    
    return isValid;
  };
  
  const handleSave = () => {
    if (validate()) {
      // Calculate bill if it's an end reading
      if (type === 'end') {
        // Find the start reading for this booking and utility
        const startReading = mockUtilityReadings.find(r => 
          r.bookingId === bookingId && 
          r.utilityType === utilityType && 
          r.type === 'start'
        );
        
        if (startReading) {
          const consumption = value - startReading.value;
          let cost = 0;
          
          // Calculate cost based on utility type
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
          
          // Create a new payment for the utility bill
          const booking = mockBookings.find(b => b.id === bookingId);
          if (booking) {
            const newPayment: Partial<Payment> = {
              cost,
              currency: 'EGP',
              description: `${utilityType.charAt(0).toUpperCase() + utilityType.slice(1)} bill (${consumption} units)`,
              placeOfPayment: 'System Generated',
              userType: 'renter',
              userId: booking.userId,
              apartmentId: apartmentId,
              bookingId: bookingId,
              createdById: currentUser?.id || '',
              createdAt: new Date().toISOString()
            };
            
            console.log('Creating payment:', newPayment);
            setSuccessMessage(`Utility bill calculated and added: ${cost.toFixed(2)} EGP`);
          }
        }
      }
      
      // In a real app, this would send data to an API
      const updatedReading: UtilityReading = {
        id: reading?.id || `reading${Date.now()}`,
        apartmentId,
        bookingId,
        type,
        utilityType,
        value,
        date,
        notes: notes || undefined,
        createdById: currentUser?.id || ''
      };
      
      console.log('Saving reading:', updatedReading);
      
      // Update local state
      setReading(updatedReading);
      setIsEditing(false);
      
      if (!successMessage) {
        setSuccessMessage('Reading saved successfully');
      }
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
  
  if (error && !reading && !isNew) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Back to Utilities
          </Button>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              startIcon={<ArrowBackIcon />} 
              onClick={handleBack}
              sx={{ mr: 2 }}
            >
              Back
            </Button>
            <Typography variant="h5">
              {isNew ? 'Add New Utility Reading' : 'Utility Reading Details'}
            </Typography>
          </Box>
          
          {!isNew && !isEditing && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit
            </Button>
          )}
        </Box>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {successMessage && !isEditing && (
          <Alert severity="success" sx={{ mb: 3 }}>{successMessage}</Alert>
        )}
        
        <Paper sx={{ p: 3 }}>
          {!isEditing && reading ? (
            // View mode
            <Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
                <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                  <Typography variant="subtitle2" color="text.secondary">Apartment</Typography>
                  <Typography variant="body1">{apartment?.name || 'Unknown'}</Typography>
                </Box>
                
                <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                  <Typography variant="subtitle2" color="text.secondary">Booking</Typography>
                  <Typography variant="body1">
                    {selectedBooking ? (
                      <>
                        {new Date(selectedBooking.arrivalDate).toLocaleDateString()} - {new Date(selectedBooking.leavingDate).toLocaleDateString()}
                      </>
                    ) : 'No booking'}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
                <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                  <Typography variant="subtitle2" color="text.secondary">Reading Type</Typography>
                  <Chip 
                    label={type === 'start' ? 'Start Reading' : 'End Reading'} 
                    color={type === 'start' ? 'primary' : 'secondary'}
                    size="small"
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                  <Typography variant="subtitle2" color="text.secondary">Utility Type</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getUtilityIcon(utilityType)}
                    <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                      {utilityType}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
                <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                  <Typography variant="subtitle2" color="text.secondary">Reading Value</Typography>
                  <Typography variant="body1">{value}</Typography>
                </Box>
                
                <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                  <Typography variant="subtitle2" color="text.secondary">Reading Date</Typography>
                  <Typography variant="body1">{new Date(date).toLocaleDateString()}</Typography>
                </Box>
              </Box>
              
              {notes && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                  <Typography variant="body1">{notes}</Typography>
                </Box>
              )}
              
              {billDetails && billDetails.hasStartReading && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1, display: 'flex', alignItems: 'center' }}>
                  <ReceiptIcon color="primary" sx={{ mr: 1 }} />
                  <Typography>
                    <strong>Bill:</strong> {billDetails.cost} EGP ({billDetails.consumption} units of {utilityType})
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            // Edit mode
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3
            }}>
              <FormControl fullWidth error={error.includes('Apartment')}>
                <InputLabel>Apartment</InputLabel>
                <Select
                  value={apartmentId}
                  label="Apartment"
                  onChange={(e) => handleSelectChange(e, 'apartmentId')}
                  disabled={!isEditing}
                >
                  {mockApartments.map(apt => (
                    <MenuItem key={apt.id} value={apt.id}>{apt.name}</MenuItem>
                  ))}
                </Select>
                {error.includes('Apartment') && <FormHelperText>Apartment is required</FormHelperText>}
              </FormControl>
              
              <FormControl fullWidth error={error.includes('Booking')} disabled={!apartmentId || !isEditing}>
                <InputLabel>Booking</InputLabel>
                <Select
                  value={bookingId}
                  label="Booking"
                  onChange={(e) => handleSelectChange(e, 'bookingId')}
                  disabled={!apartmentId || !isEditing}
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
                {error.includes('Booking') && <FormHelperText>Booking is required</FormHelperText>}
              </FormControl>
              
              <FormControl fullWidth disabled={!isEditing || !isNew}>
                <InputLabel>Reading Type</InputLabel>
                <Select
                  value={type}
                  label="Reading Type"
                  onChange={(e) => handleSelectChange(e, 'type')}
                  disabled={!isEditing || !isNew}
                >
                  <MenuItem value="start">Start Reading</MenuItem>
                  <MenuItem value="end">End Reading</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth disabled={!isEditing}>
                <InputLabel>Utility Type</InputLabel>
                <Select
                  value={utilityType}
                  label="Utility Type"
                  onChange={(e) => handleSelectChange(e, 'utilityType')}
                  disabled={!isEditing}
                >
                  <MenuItem value="electricity">Electricity</MenuItem>
                  <MenuItem value="water">Water</MenuItem>
                  <MenuItem value="gas">Gas</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Reading Value"
                name="value"
                type="number"
                value={value}
                onChange={handleInputChange}
                disabled={!isEditing}
                error={error.includes('value')}
                helperText={error.includes('value') ? 'Valid reading value is required' : ''}
              />
              
              <TextField
                fullWidth
                label="Reading Date"
                name="date"
                type="date"
                value={date}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                disabled={!isEditing}
                error={error.includes('date')}
                helperText={error.includes('date') ? 'Valid date within booking period is required' : ''}
                inputProps={{
                  min: dateConstraints.min,
                  max: dateConstraints.max
                }}
              />
              
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                multiline
                rows={4}
                value={notes}
                onChange={handleInputChange}
                disabled={!isEditing}
                sx={{ gridColumn: { xs: '1', md: '1 / 3' } }}
              />
              
              {type === 'end' && isEditing && (
                <Box sx={{ gridColumn: { xs: '1', md: '1 / 3' } }}>
                  {billDetails ? (
                    billDetails.hasStartReading ? (
                      <Alert severity="info" icon={<ReceiptIcon />}>
                        <Typography variant="body1">
                          <strong>Estimated Bill:</strong> {billDetails.cost} EGP ({billDetails.consumption} units of {utilityType})
                        </Typography>
                        <Typography variant="caption">
                          This bill will be automatically added when you save the reading.
                        </Typography>
                      </Alert>
                    ) : (
                      <Alert severity="warning">
                        No start reading found for this booking and utility type. Bill cannot be calculated.
                      </Alert>
                    )
                  ) : null}
                </Box>
              )}
              
              {isEditing && (
                <Box sx={{ gridColumn: { xs: '1', md: '1 / 3' }, display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
} 
  );
} 