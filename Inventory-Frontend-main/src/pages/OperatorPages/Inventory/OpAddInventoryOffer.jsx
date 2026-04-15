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
  createTheme,
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
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import config from "@/config";

// Updated theme with blue and white colors
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

export function OpAddInventoryOffer() {
  const navigate = useNavigate();
  // Updated state to include unit and product URL
  const [brandData, setBrandData] = useState({
    brandName: '',
    employees: [],
    clientId: '', // Added clientId field
    products: [{
      name: '',
      productUrl: '', // Added product URL field
      unit: '',
      image: null,
      noExpiry: false,
      expiryDate: ''
    }]
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]); // Added clients state

  const today = new Date().toISOString().split('T')[0];

  // All your existing functions remain the same
  const getSelectedVendors = () => {
    return brandData.employees.map(id =>
      vendors.find(vendor => vendor._id === id)
    ).filter(Boolean);
  };

  const handleRemoveVendor = (vendorId) => {
    setBrandData({
      ...brandData,
      employees: brandData.employees.filter(id => id !== vendorId)
    });
  };

  // Get selected client information
  const getSelectedClient = () => {
    return clients.find(client => client._id === brandData.clientId);
  };

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await fetch(`${config.apiurl}/delivery-products/get-all-employees`);
        const data = await response.json();
        setVendors(data);
      } catch (error) {
        setMessage('Error fetching vendors');
      }
    };

    const fetchClients = async () => {
      try {
        const response = await fetch(`${config.apiurl}/clients`);
        const data = await response.json();
        setClients(data);
      } catch (error) {
        setMessage('Error fetching clients');
      }
    };

    fetchVendors();
    fetchClients();
  }, []);

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
      products: [...brandData.products, { name: '', productUrl: '', unit: '', image: null, noExpiry: false, expiryDate: '' }]
    });
  };

  const removeProduct = (index) => {
    const updatedProducts = brandData.products.filter((_, i) => i !== index);
    setBrandData({ ...brandData, products: updatedProducts });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    // Show loading alert
    Swal.fire({
      title: 'Creating Brand...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const formData = new FormData();
      formData.append('brandName', brandData.brandName);
      formData.append('clientId', brandData.clientId); // Added clientId

      brandData.employees.forEach(employeeId => {
        formData.append('employees', employeeId);
      });

      brandData.products.forEach((product, index) => {
        formData.append(`products[${index}][name]`, product.name);
        formData.append(`products[${index}][productUrl]`, product.productUrl); // Added product URL
        formData.append(`products[${index}][unit]`, product.unit);
        formData.append(`products[${index}][noExpiry]`, product.noExpiry);
        if (product.expiryDate) {
          formData.append(`products[${index}][expiry_date]`, product.expiryDate);
        }
        if (product.image) {
          formData.append(`products[${index}][image]`, product.image);
        }
      });


      // Console log all data being sent to backend
      console.log("Brand Data being sent to backend:");
      console.log("brandName:", brandData.brandName);
      console.log("clientId:", brandData.clientId);
      console.log("employees:", brandData.employees);
      console.log("products:", brandData.products);

      // Log FormData contents (this is tricky because FormData isn't directly loggable)
      console.log("FormData contents:");
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }


      const response = await fetch(`${config.apiurl}/brands/create`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to create brand');

      // Success alert
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Brand created successfully!',
        confirmButtonText: 'OK'
      });

      // Reset form data
      setBrandData({
        brandName: '',
        employees: [],
        clientId: '',
        products: [{ name: '', productUrl: '', unit: '', image: null, noExpiry: false, expiryDate: '' }]
      });

      // Navigate to dashboard
      navigate('/admin/inventory_list/manage');

    } catch (error) {
      console.error('Error:', error);

      // Error alert
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: error.message || 'Error creating brand'
      });
    }
  }


  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, bgcolor: 'background.paper' }}>
          <Typography variant="h4" sx={{ mb: 4, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Create New Offer
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

                  {/* Client Selection - NEW */}
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
                        onChange={(e) => setBrandData({ ...brandData, employees: e.target.value })}
                        sx={{
                          borderRadius: '8px',
                          height: '56px' // Match height with TextField
                        }}
                      >
                        {vendors.map(vendor => (
                          <MenuItem key={vendor._id} value={vendor._id}>
                            {vendor.fullName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Selected Client Display - NEW */}
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
                  Add Products
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
                            ) : 'Upload Image'}
                            <input
                              type="file"
                              hidden
                              onChange={(e) => handleProductChange(index, 'image', e.target.files[0])}
                              accept="image/*"
                              required
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
                ) : 'Create Offer'}
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

export default OpAddInventoryOffer;