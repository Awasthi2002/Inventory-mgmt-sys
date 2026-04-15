import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  FormControlLabel,
  ThemeProvider,
  Chip,
  Grid,
  Container,
  Avatar
} from '@mui/material';

import {
  Add as AddIcon,
  Remove as RemoveIcon,
  CloudUpload as CloudUploadIcon,
  Person as PersonIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import { useParams } from 'react-router-dom';
import { createTheme } from '@mui/material';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import config from "@/config";

const theme = createTheme({
  palette: {
    primary: {
      main: '#4F46E5', // Indigo
      light: '#818CF8',
      dark: '#3730A3',
    },
    secondary: {
      main: '#ffffff',
      light: '#F4F4F5', // Light Indigo
      dark: '#E5E7EB', // Light Gray
    },
    background: {
      default: '#F4F4F5',
      paper: '#ffffff',
    },
    text: {
      primary: '#1F2937',
      secondary: '#4B5563',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
      color: '#1F2937',
    },
    h6: {
      fontWeight: 600,
      color: '#4B5563',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      },
    },
  },
});

export function EditInventoryOffer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [brandData, setBrandData] = useState({
    brandName: '',
    employees: [],
    clientId: '', // Added clientId field
    products: [{
      name: '',
      productUrl: '', // Added product URL field
      unit: '',
      image: null,
      imageUrl: '',
      noExpiry: false,
      expiryDate: ''
    }]
  });
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [message, setMessage] = useState('');
  const [allEmployees, setAllEmployees] = useState([]);
  const [clients, setClients] = useState([]); // Added clients state

  const today = new Date().toISOString().split('T')[0];

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/placeholder-image.jpg';
    const cleanPath = imagePath.startsWith('/uploads') ? imagePath.slice(8) : imagePath;
    const baseUrl = config.apiurl.replace('/api', '');
    return `${baseUrl}/uploads/${cleanPath}`;
  };

  // Fetch all employees separately
  const fetchAllEmployees = async () => {
    try {
      const response = await fetch(`${config.apiurl}/delivery-products/get-all-employees`);
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setAllEmployees(data);
      } else if (data.success && Array.isArray(data.data)) {
        setAllEmployees(data.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setMessage('Error fetching employees');
    }
  };

  // Fetch all clients
  const fetchClients = async () => {
    try {
      const response = await fetch(`${config.apiurl}/clients`);
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setMessage('Error fetching clients');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setFetchingData(true);
      try {
        await Promise.all([
          fetchBrandDetails(), 
          fetchAllEmployees(),
          fetchClients() // Added client fetch
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
        setMessage('Error loading data');
      } finally {
        setFetchingData(false);
      }
    };
    
    loadData();
  }, [id]);

  const fetchBrandDetails = async () => {
    try {
      const response = await fetch(`${config.apiurl}/brands/inventory_list/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch brand details');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        // Transform the data
        const transformedData = {
          brandName: data.data.brandName,
          employees: data.data.employees.map(emp => emp._id),
          clientId: data.data.clientId || '', // Added clientId
          products: data.data.products.map(product => ({
            name: product.name,
            productUrl: product.productUrl || '', // Added product URL
            unit: product.unit || '',
            image: null,
            imageUrl: getImageUrl(product.image),
            noExpiry: product.noExpiry || false,
            expiryDate: product.expiry_date ? new Date(product.expiry_date).toISOString().split('T')[0] : ''
          }))
        };
        setBrandData(transformedData);
      }
    } catch (error) {
      console.error('Error fetching brand details:', error);
      setMessage('Error fetching brand details');
    }
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...brandData.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value
    };
    
    // If noExpiry is checked, clear the expiry date
    if (field === 'noExpiry' && value === true) {
      updatedProducts[index].expiryDate = '';
    }
    
    setBrandData({ ...brandData, products: updatedProducts });
  };

  const addProduct = () => {
    setBrandData({
      ...brandData,
      products: [...brandData.products, {
        name: '',
        productUrl: '', // Added product URL
        unit: '',
        image: null,
        imageUrl: '',
        noExpiry: false,
        expiryDate: ''
      }]
    });
  };

  const removeProduct = (index) => {
    const updatedProducts = brandData.products.filter((_, i) => i !== index);
    setBrandData({ ...brandData, products: updatedProducts });
  };
  
  const getSelectedVendors = () => {
    return allEmployees.filter(vendor => brandData.employees.includes(vendor._id));
  };

  // Get selected client information
  const getSelectedClient = () => {
    return clients.find(client => client._id === brandData.clientId);
  };

  const handleRemoveVendor = (vendorId) => {
    setBrandData({
      ...brandData,
      employees: brandData.employees.filter(id => id !== vendorId)
    });
  };

  const handleEmployeeChange = (event) => {
    const selectedEmployeeIds = event.target.value;
    setBrandData({
      ...brandData,
      employees: selectedEmployeeIds
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    Swal.fire({
      title: 'Updating Brand...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  
    try {
      const formData = new FormData();
      
      formData.append('brandName', brandData.brandName);
      formData.append('clientId', brandData.clientId); // Added clientId
  
      if (Array.isArray(brandData.employees)) {
        brandData.employees.forEach(employeeId => {
          formData.append('employees', employeeId);
        });
      }
  
      // Console log all data being sent to backend (for debugging)
      console.log("Brand Data being sent to backend:");
      console.log("brandName:", brandData.brandName);
      console.log("clientId:", brandData.clientId);
      console.log("employees:", brandData.employees);
      console.log("products:", brandData.products);
      
      brandData.products.forEach((product, index) => {
        formData.append(`products[${index}][name]`, product.name);
        formData.append(`products[${index}][productUrl]`, product.productUrl); // Added product URL
        formData.append(`products[${index}][unit]`, product.unit);
        formData.append(`products[${index}][noExpiry]`, product.noExpiry);
        if (product.expiryDate) {
          formData.append(`products[${index}][expiry_date]`, product.expiryDate);
        }
        if (product.image instanceof File) {
          formData.append(`products[${index}][image]`, product.image);
        }
      });
      
      // Log FormData contents (this is tricky because FormData isn't directly loggable)
      console.log("FormData contents:");
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }
  
      const response = await fetch(`${config.apiurl}/brands/update/${id}`, {
        method: 'PUT',
        body: formData,
      });
  
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update brand');
      }
  
      const result = await response.json();
  
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Brand updated successfully!',
        confirmButtonText: 'Go to Dashboard',
        confirmButtonColor: '#3085d6',
        allowOutsideClick: false
      });
  
      navigate('/admin/inventory_list/manage');
  
    } catch (error) {
      console.error('Error:', error);
  
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message || 'Error updating brand',
        confirmButtonText: 'Try Again',
        confirmButtonColor: '#3085d6',
        showCancelButton: true,
        cancelButtonText: 'Go to Dashboard'
      }).then((result) => {
        if (!result.isConfirmed) {
          navigate('/admin/inventory_list');
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, bgcolor: 'background.paper' }}>
          <Typography variant="h4" sx={{ mb: 4, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Edit Offer
          </Typography>
          
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              {/* Brand Name, Client Selection, and Employee Selection */}
              <Box sx={{ mb: 4 }}>
                <Grid container spacing={3} alignItems="flex-start">
                  {/* Brand Name */}
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Brand Name"
                      variant="outlined"
                      fullWidth
                      value={brandData.brandName}
                      onChange={(e) => setBrandData({ ...brandData, brandName: e.target.value })}
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: '8px',
                          height: '56px' // Match height with Select
                        }
                      }}
                    />
                  </Grid>

                  {/* Client Selection */}
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth required>
                      <InputLabel sx={{ bgcolor: 'background.paper', px: 1 }}>Select Client</InputLabel>
                      <Select
                        value={brandData.clientId}
                        onChange={(e) => setBrandData({ ...brandData, clientId: e.target.value })}
                        sx={{ 
                          borderRadius: '8px',
                          height: '56px'
                        }}
                      >
                        {clients.map(client => (
                          <MenuItem key={client._id} value={client._id}>
                            {client.fullName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Vendor Selection */}
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth required>
                      <InputLabel sx={{ bgcolor: 'background.paper', px: 1 }}>Select Employees</InputLabel>
                      <Select
                        multiple
                        value={brandData.employees}
                        onChange={handleEmployeeChange}
                        sx={{ 
                          borderRadius: '8px',
                          height: '56px' // Match height with TextField
                        }}
                      >
                        {allEmployees.map(vendor => (
                          <MenuItem key={vendor._id} value={vendor._id}>
                            {vendor.fullName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Selected Client Display */}
                {brandData.clientId && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <BusinessIcon sx={{ color: 'primary.main', mr: 1 }} />
                      <Typography variant="subtitle2" color="primary">
                        Selected Client
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 1,
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: '8px'
                    }}>
                      {getSelectedClient() && (
                        <Chip
                          avatar={<Avatar><BusinessIcon /></Avatar>}
                          label={getSelectedClient().fullName}
                          sx={{
                            bgcolor: 'white',
                            '&:hover': { bgcolor: 'grey.100' }
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                )}

                {/* Selected Vendors Display */}
                {brandData.employees.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PersonIcon sx={{ color: 'primary.main', mr: 1 }} />
                      <Typography variant="subtitle2" color="primary">
                        Selected employees ({brandData.employees.length})
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 1,
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: '8px'
                    }}>
                      {getSelectedVendors().map((vendor) => (
                        <Chip
                          key={vendor._id}
                          avatar={<Avatar><PersonIcon /></Avatar>}
                          label={vendor.fullName}
                          onDelete={() => handleRemoveVendor(vendor._id)}
                          sx={{
                            bgcolor: 'white',
                            '&:hover': { bgcolor: 'grey.100' }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Products Section */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Products
                </Typography>

                {/* Product Rows - Improved Layout */}
                <Stack spacing={2}>
                  {brandData.products.map((product, index) => (
                    <Box
                      key={index}
                      sx={{
                        bgcolor: 'grey.50',
                        p: 3,
                        borderRadius: '8px',
                      }}
                    >
                      {/* Top Row: Product Name and URL */}
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                            Product Name*
                          </Typography>
                          <TextField
                            placeholder="Enter product name"
                            size="small"
                            fullWidth
                            value={product.name}
                            onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                            required
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                            Product URL
                          </Typography>
                          <TextField
                            placeholder="Enter product URL"
                            size="small"
                            fullWidth
                            value={product.productUrl}
                            onChange={(e) => handleProductChange(index, 'productUrl', e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                          />
                        </Grid>
                      </Grid>

                      {/* Middle Row: Unit, Image and Expiry */}
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={2}>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                            Unit*
                          </Typography>
                          <TextField
                            placeholder="e.g. kg, pcs"
                            size="small"
                            fullWidth
                            value={product.unit}
                            onChange={(e) => handleProductChange(index, 'unit', e.target.value)}
                            required
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                            Product Image*
                          </Typography>
                          <Button
                            variant="outlined"
                            component="label"
                            size="small"
                            startIcon={<CloudUploadIcon />}
                            fullWidth
                            sx={{ 
                              borderRadius: '8px',
                              height: '40px', // Match height with other inputs
                              textTransform: 'none'
                            }}
                          >
                            {product.image ? (
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  bgcolor: 'grey.200',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  overflow: 'hidden',
                                  mr: 1
                                }}
                              >
                                <img
                                  src={URL.createObjectURL(product.image)}
                                  alt="Product"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              </Box>
                            ) : product.imageUrl ? (
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  bgcolor: 'grey.200',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  overflow: 'hidden',
                                  mr: 1
                                }}
                              >
                                <img
                                  src={product.imageUrl}
                                  alt="Product"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              </Box>
                            ) : 'Upload Image'}
                            <input
                              type="file"
                              hidden
                              onChange={(e) => handleProductChange(index, 'image', e.target.files[0])}
                              accept="image/*"
                            />
                          </Button>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                            Expiry Date{!product.noExpiry && '*'}
                          </Typography>
                          <TextField
                            type="date"
                            size="small"
                            fullWidth
                            value={product.expiryDate}
                            onChange={(e) => handleProductChange(index, 'expiryDate', e.target.value)}
                            disabled={product.noExpiry}
                            required={!product.noExpiry}
                            inputProps={{
                              min: today
                            }}
                            sx={{ 
                              '& .MuiOutlinedInput-root': { borderRadius: '8px' }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                            &nbsp;
                          </Typography>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={product.noExpiry}
                                onChange={(e) => handleProductChange(index, 'noExpiry', e.target.checked)}
                                size="small"
                              />
                            }
                            label="No Expiry"
                          />
                        </Grid>
                      </Grid>

                      {/* Actions Row */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end',
                        mt: 1
                      }}>
                        <Tooltip title="Add Product" placement="top">
                          <IconButton
                            size="small"
                            onClick={addProduct}
                            color="primary"
                            sx={{
                              mx: 0.5,
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'primary.dark' }
                            }}
                          >
                            <AddIcon />
                          </IconButton>
                        </Tooltip>
                        
                        {index > 0 && (
                          <Tooltip title="Remove Product" placement="top">
                            <IconButton
                              size="small"
                              onClick={() => removeProduct(index)}
                              color="error"
                              sx={{
                                ml: 1,
                                bgcolor: 'error.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'error.dark' }
                              }}
                            >
                              <RemoveIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 4,
                  py: 1.5,
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: 'white', mr: 1 }} />
                ) : 'Update Offer'}
              </Button>
            </Stack>
          </form>

          {message && (
            <Alert 
              severity={message.includes('Error') ? 'error' : 'success'}
              sx={{ mt: 3, borderRadius: '8px' }}
            >
              {message}
            </Alert>
          )}
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default EditInventoryOffer;