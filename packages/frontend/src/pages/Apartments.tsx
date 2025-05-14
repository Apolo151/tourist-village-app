import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  CardMedia, 
  CardActionArea,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Container,
  Divider
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, LocationCity as LocationIcon } from '@mui/icons-material';
import { mockApartments } from '../mockData';
import { useAuth } from '../context/AuthContext';

export default function Apartments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Get unique cities for the filter
  const cities = Array.from(new Set(mockApartments.map(apt => apt.city))).sort();
  
  // Filter apartments based on search and city filter
  const filteredApartments = mockApartments.filter(apartment => {
    const matchesSearch = 
      apartment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = cityFilter ? apartment.city === cityFilter : true;
    
    return matchesSearch && matchesCity;
  });
  
  const handleCityFilterChange = (event: SelectChangeEvent) => {
    setCityFilter(event.target.value);
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleApartmentClick = (id: string) => {
    navigate(`/apartments/${id}`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">Apartments</Typography>
          {currentUser?.role === 'admin' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/apartments/new')}
            >
              Add Apartment
            </Button>
          )}
        </Box>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <TextField
                label="Search Apartments"
                variant="outlined"
                fullWidth
                size="small"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by name, address, or city"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            
            <Box sx={{ minWidth: { xs: '100%', md: '200px' } }}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by City</InputLabel>
                <Select
                  value={cityFilter}
                  label="Filter by City"
                  onChange={handleCityFilterChange}
                  startAdornment={
                    <InputAdornment position="start">
                      <LocationIcon />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="">
                    <em>All Cities</em>
                  </MenuItem>
                  {cities.map(city => (
                    <MenuItem key={city} value={city}>{city}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          
          {cityFilter && (
            <Box sx={{ mt: 2 }}>
              <Chip 
                label={`City: ${cityFilter}`} 
                onDelete={() => setCityFilter('')} 
                color="primary" 
                variant="outlined"
              />
            </Box>
          )}
        </Paper>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" color="text.secondary">
            {filteredApartments.length} {filteredApartments.length === 1 ? 'apartment' : 'apartments'} found
          </Typography>
          <Divider />
        </Box>
        
        <Box sx={{ 
          display: 'grid', 
          gap: 3, 
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)'
          }
        }}>
          {filteredApartments.length > 0 ? (
            filteredApartments.map(apartment => (
              <Card key={apartment.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} elevation={3}>
                <CardActionArea onClick={() => handleApartmentClick(apartment.id)}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={apartment.images?.[0] || 'https://via.placeholder.com/300x180?text=No+Image'}
                    alt={apartment.name}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {apartment.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {apartment.address}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip 
                        label={apartment.city} 
                        size="small" 
                        color="primary"
                        sx={{ mr: 1 }} 
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      {apartment.amenities?.slice(0, 3).map(amenity => (
                        <Chip key={amenity} label={amenity} size="small" variant="outlined" />
                      ))}
                      {apartment.amenities && apartment.amenities.length > 3 && (
                        <Chip label={`+${apartment.amenities.length - 3} more`} size="small" variant="outlined" />
                      )}
                    </Box>
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        {apartment.bedrooms} {apartment.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
                      </Typography>
                      <Typography variant="body2">
                        {apartment.bathrooms} {apartment.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}
                      </Typography>
                      <Typography variant="body2">
                        {apartment.size} m²
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', gridColumn: '1 / -1' }}>
              <Typography variant="h6" gutterBottom>
                No apartments found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search or filters
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Container>
  );
} 