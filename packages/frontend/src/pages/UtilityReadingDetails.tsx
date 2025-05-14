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
  Divider,
  InputAdornment,
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
  LocalFireDepartment as GasIcon
} from '@mui/icons-material';
import { mockUtilityReadings, mockApartments, mockBookings, mockSettings } from '../mockData';
import { useAuth } from '../context/AuthContext';
import type { UtilityReading, UtilityType, ReadingType } from '../types';

export default function UtilityReadingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const isNew = location.pathname === '/utilities/new';
  const [isEditing, setIsEditing] = useState(isNew);
  const [error, setError] = useState('');
  
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
          
          console.log(`Calculated bill: ${cost} EGP (${consumption} units of ${utilityType})`);
        }
      }
      
      // In a real app, this would send data to an API
      console.log('Saving reading:', {
        id: reading?.id,
        apartmentId,
        bookingId,
        type,
        utilityType,
        value,
        date,
        notes: notes || undefined,
        createdById: currentUser?.id || reading?.createdById
      });
      
      if (isNew) {
        // Redirect to utilities page after creating
        navigate('/utilities');
      } else {
        // Exit edit mode
        setIsEditing(false);
        setError('');
      }
    }
  };
  
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
              {isNew ? 'Add New Utility Reading' : `Utility Reading Details: ${reading?.id}`}
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
        
        <Paper sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3
          }}>
            {!isEditing && reading && (
              <>
                <Box sx={{ gridColumn: { xs: '1', md: '1 / 3' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getUtilityIcon(reading.utilityType)}
                    <Typography variant="h6" sx={{ ml: 1, textTransform: 'capitalize' }}>
                      {reading.utilityType} {reading.type === 'start' ? 'Start' : 'End'} Reading
                    </Typography>
                    <Chip 
                      label={reading.type === 'start' ? 'Start Reading' : 'End Reading'} 
                      color={reading.type === 'start' ? 'primary' : 'secondary'}
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Apartment</Typography>
                  <Typography variant="body1">{apartment?.name || 'Unknown'}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Booking Period</Typography>
                  <Typography variant="body1">
                    {selectedBooking ? (
                      <>
                        {new Date(selectedBooking.arrivalDate).toLocaleDateString()} - {new Date(selectedBooking.leavingDate).toLocaleDateString()}
                      </>
                    ) : 'No booking'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Reading Value</Typography>
                  <Typography variant="body1">{reading.value}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Reading Date</Typography>
                  <Typography variant="body1">{new Date(reading.date).toLocaleDateString()}</Typography>
                </Box>
                
                <Box sx={{ gridColumn: { xs: '1', md: '1 / 3' } }}>
                  <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                  <Typography variant="body1">{reading.notes || 'No notes'}</Typography>
                </Box>
              </>
            )}
            
            {isEditing && (
              <>
                <FormControl fullWidth error={error.includes('Apartment')}>
                  <InputLabel>Apartment</InputLabel>
                  <Select
                    value={apartmentId}
                    label="Apartment"
                    onChange={(e) => handleSelectChange(e, 'apartmentId')}
                    disabled={!isNew && !!reading}
                  >
                    {mockApartments.map(apt => (
                      <MenuItem key={apt.id} value={apt.id}>{apt.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth error={error.includes('Booking')} disabled={!apartmentId}>
                  <InputLabel>Booking</InputLabel>
                  <Select
                    value={bookingId}
                    label="Booking"
                    onChange={(e) => handleSelectChange(e, 'bookingId')}
                    disabled={!apartmentId || (!isNew && !!reading)}
                  >
                    {filteredBookings.map(booking => (
                      <MenuItem key={booking.id} value={booking.id}>
                        {new Date(booking.arrivalDate).toLocaleDateString()} - {new Date(booking.leavingDate).toLocaleDateString()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth disabled={!isNew && !!reading}>
                  <InputLabel>Reading Type</InputLabel>
                  <Select
                    value={type}
                    label="Reading Type"
                    onChange={(e) => handleSelectChange(e, 'type')}
                  >
                    <MenuItem value="start">Start Reading</MenuItem>
                    <MenuItem value="end">End Reading</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth disabled={!isNew && !!reading}>
                  <InputLabel>Utility Type</InputLabel>
                  <Select
                    value={utilityType}
                    label="Utility Type"
                    onChange={(e) => handleSelectChange(e, 'utilityType')}
                  >
                    <MenuItem value="electricity">Electricity</MenuItem>
                    <MenuItem value="water">Water</MenuItem>
                    <MenuItem value="gas">Gas</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  label="Reading Value"
                  type="number"
                  name="value"
                  value={value}
                  onChange={handleInputChange}
                  error={error.includes('value')}
                />
                
                <TextField
                  fullWidth
                  label="Reading Date"
                  type="date"
                  name="date"
                  value={date}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  error={error.includes('date')}
                  helperText="Date should be within booking dates"
                />
                
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  multiline
                  rows={4}
                  value={notes}
                  onChange={handleInputChange}
                  sx={{ gridColumn: { xs: '1', md: '1 / 3' } }}
                />
              </>
            )}
          </Box>
          
          {isEditing && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
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
        </Paper>
      </Box>
    </Container>
  );
} 