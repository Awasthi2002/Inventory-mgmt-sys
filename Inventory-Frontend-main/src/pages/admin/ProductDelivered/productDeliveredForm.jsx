import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  Box,
  Paper,
  IconButton,
  MenuItem,
  CircularProgress,
  FormHelperText,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; 
import SendIcon from '@mui/icons-material/Send';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import config from '@/config';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { Close as CloseIcon } from '@mui/icons-material';

// Custom styled components for enhanced UI
const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: "100%",
  margin: `${theme.spacing(4)} auto`,
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[6],
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1.5),
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[3],
  }
}));

const AnimatedIconButton = styled(IconButton)(({ theme }) => ({
  transition: 'transform 0.2s ease',
  '&:hover': {
    transform: 'scale(1.1)',
  }
}));

export function ProductDeliveryForm() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    orderId: '',
    brandId: '',
    brandName: '',
    platformName: '', 
    platformId: '', // Added to store the platform ID separately
    employeeId: '',
    employeeName: '',
    deliveryDate: today,
    products: [{ productId: '', name: '', quantity: '', remaining_quantity: 0 }],
    reviewEnabled: false, 
    screenshot: null, 
    reviewLink: '',
    accountNo: '', 
    password: '', 
    reviewDate: ''
  });

  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [quantityErrors, setQuantityErrors] = useState({});
  const [dateError, setDateError] = useState('');

  // Handle date change with validation
  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    
    if (selectedDate < today) {
      setDateError('Cannot select a past date');
      return;
    }

    setDateError('');
    setFormData(prev => ({ ...prev, deliveryDate: selectedDate }));
  };

  // Handle input changes for new fields
  const handleAccountNoChange = (e) => {
    setFormData(prev => ({ ...prev, accountNo: e.target.value }));
  };

  const handlePasswordChange = (e) => {
    setFormData(prev => ({ ...prev, password: e.target.value }));
  };

  const handleReviewDateChange = (e) => {
    setFormData(prev => ({ ...prev, reviewDate: e.target.value }));
  };

  // Handle screenshot upload
  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, screenshot: file }));
    }
  };

  // Handle review link change
  const handleReviewLinkChange = (e) => {
    setFormData(prev => ({ ...prev, reviewLink: e.target.value }));
  };

  const handleOrderIdChange = async (event) => {
    const orderId = event.target.value;
    setFormData(prev => ({ ...prev, orderId }));
    setQuantityErrors({});

    if (!orderId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${config.apiurl}/brands/product-order/${orderId}`);
      const responseData = await response.json();
      console.log('Response Data:', responseData);

      if (responseData.success) {
        const { data } = responseData;

        setAvailableProducts(data.products.map(product => ({
          productId: product.productId,
          name: product.name,
          expiry_date: product.expiry_date,
          noExpiry: product.noExpiry,
          remaining_quantity: product.remaining_quantity
        })));

        // Get platform data directly from the response
        const platformId = data.platform?._id || '';
        
        setFormData(prev => ({
          ...prev,
          orderId: data.orderId,
          brandId: data.brand._id,
          brandName: data.brand.name,
          platformId: platformId, // Store platform ID separately
          platformName: data.platform || {}, // Store the entire platform object as received
          employeeId: data.employee._id,
          employeeName: data.employee.name,
          reviewEnabled: data.platform?.reviewEnabled || false,
          screenshot: null,
          reviewLink: '', 
          accountNo: data.accountNo || '', 
          password: data.password || '', 
          reviewDate: data.reviewDate || '',
          products: [
            {
              productId: data.products[0].productId,
              name: data.products[0].name,
              quantity: '',
              remaining_quantity: data.products[0].remaining_quantity
            }
          ]
        }));
      }
    } catch (err) {
      setError('Failed to fetch order details');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableProductsForRow = (currentIndex) => {
    return availableProducts.filter(product => 
      !formData.products.some((p, idx) => 
        idx !== currentIndex && p.name === product.name
      )
    );
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = formData.products.map((product, i) => {
      if (i === index) {
        if (field === 'name') {
          const selectedProduct = availableProducts.find(p => p.name === value);
          return {
            ...product,
            productId: selectedProduct?.productId || '',
            name: value,
            remaining_quantity: selectedProduct?.remaining_quantity || 0,
            quantity: ''
          };
        }
        if (field === 'quantity') {
          // Check if the value contains a decimal point
          if (value.includes('.')) {
            setQuantityErrors(prev => ({
              ...prev,
              [index]: 'Please enter whole numbers only'
            }));
          } else {
            const newQuantity = parseInt(value) || 0;
            const remaining = product.remaining_quantity;
            
            if (newQuantity > remaining) {
              setQuantityErrors(prev => ({
                ...prev,
                [index]: `Exceeds remaining quantity (${remaining})`
              }));
            } else {
              setQuantityErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[index];
                return newErrors;
              });
            }
          }
          
          return { ...product, quantity: value };
        }
        return { ...product, [field]: value };
      }
      return product;
    });

    setFormData(prev => ({
      ...prev,
      products: updatedProducts
    }));
  };

  const addProductRow = () => {
    if (formData.products.length < 5) {
      setFormData(prev => ({
        ...prev,
        products: [...prev.products, { productId: '', name: '', quantity: '', remaining_quantity: 0 }]
      }));
    }
  };

  const removeProductRow = (index) => {
    if (formData.products.length === 1) return;
    
    // Remove quantity error for the removed row
    setQuantityErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
    
    const updatedProducts = formData.products.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      products: updatedProducts
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (Object.keys(quantityErrors).length > 0) {
      setError('Please correct the quantity errors before submitting');
      Swal.fire({
        title: 'Error!',
        text: 'Please correct the quantity errors before submitting',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
      return;
    }
   
    // Add screenshot validation check
    if (formData.reviewEnabled && !formData.screenshot) {
      setError('Screenshot is required for this order');
      Swal.fire({
        title: 'Error!',
        text: 'Screenshot is required for this order',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    // Extract the platform ID directly from the platformName object
    const platformId = formData.platformName?._id || '';
    
    // Log the data being submitted
    console.log('Submitting Form Data:', {
      orderId: formData.orderId,
      brandId: formData.brandId,
      employeeId: formData.employeeId,
      deliveryDate: formData.deliveryDate,
      platformName: platformId, // Send just the platform ID
      products: formData.products.map(product => ({
        productId: product.productId,
        quantity: parseInt(product.quantity, 10)
      })),
      screenshot: formData.screenshot ? formData.screenshot : "No file",
      reviewLink: formData.reviewLink,
      accountNo: formData.accountNo,
      password: formData.password,
      reviewDate: formData.reviewDate
    });

    const requestBody = new FormData();
    requestBody.append('orderId', formData.orderId);
    requestBody.append('brandId', formData.brandId);
    requestBody.append('employeeId', formData.employeeId);
    requestBody.append('deliveryDate', formData.deliveryDate);
    requestBody.append('platformName', platformId); // Send just the platform ID
    requestBody.append('reviewLink', formData.reviewLink);
    requestBody.append('accountNo', formData.accountNo); 
    requestBody.append('password', formData.password); 
    requestBody.append('reviewDate', formData.reviewDate);

    requestBody.append('products', JSON.stringify(formData.products.map(product => ({
      productId: product.productId,
      quantity: parseInt(product.quantity, 10)
    }))));
    
    if (formData.screenshot) {
      requestBody.append('screenshot', formData.screenshot);
    }

    try {
      const response = await fetch(`${config.apiurl}/brands/deliveries`, {
        method: 'POST',
        body: requestBody,
      });
      
      const data = await response.json();
      console.log('Response Data:', data);
      
      if (response.ok) {
        Swal.fire({
          title: 'Success!',
          text: 'Delivery record created successfully.',
          icon: 'success',
          confirmButtonText: 'OK'
        }).then(() => {
          navigate('/admin/product_delivered');
        });
        
        setFormData({
          orderId: '',
          brandId: '',
          brandName: '',
          platformName: '',
          platformId: '',
          employeeId: '',
          employeeName: '',
          deliveryDate: new Date().toISOString().split('T')[0],
          products: [{ productId: '', name: '', quantity: '', remaining_quantity: 0 }],
          reviewEnabled: false,
          screenshot: null,
          reviewLink: '',
          accountNo: '', 
          password: '', 
          reviewDate: ''
        });
        setAvailableProducts([]);
        setQuantityErrors({});
      } else {
        Swal.fire({
          title: 'Error!',
          text: data.message || 'Failed to create delivery record',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    } catch (err) {
      console.error('Submission Error:', err);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to submit delivery record',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledCard>
      <CardContent>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          sx={{ 
            fontWeight: 600, 
            color: 'primary.main', 
            textAlign: 'center',
            mb: 3 
          }}
        >
          Create Delivery Record
        </Typography>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              '& .MuiAlert-icon': { color: 'error.main' }
            }}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              '& .MuiAlert-icon': { color: 'success.main' }
            }}
          >
            Delivery record created successfully!
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
<Grid container spacing={3}>
  <Grid item xs={12} sm={6}>
    <TextField
      fullWidth
      label="Order ID"
      value={formData.orderId}
      onChange={handleOrderIdChange}
      required
      variant="outlined"
      sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
    />
  </Grid>
  <Grid item xs={12} sm={6}>
    <TextField
      fullWidth
      label="Brand Name"
      value={formData.brandName}
      disabled
      variant="outlined"
      sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
    />
  </Grid>
  <Grid item xs={12} sm={6}>
    <TextField
      fullWidth
      label="Account Number"
      value={formData.accountNo}
      onChange={handleAccountNoChange}
      variant="outlined"
      sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
    />
  </Grid>
  <Grid item xs={12} sm={6}>
    <TextField
      fullWidth
      label="Password"
      type="password"
      value={formData.password}
      onChange={handlePasswordChange}
      variant="outlined"
      sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
    />
  </Grid>
  <Grid item xs={12} sm={6}>
    <TextField
      fullWidth
      label="Platform Name"
      value={formData.platformName.name || ''}
      disabled
      variant="outlined"
      sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
    />
  </Grid>
  <Grid item xs={12} sm={6}>
    <TextField
      fullWidth
      label="Review Date"
      type="date"
      value={formData.reviewDate}
      onChange={handleReviewDateChange}
      variant="outlined"
      InputLabelProps={{ shrink: true }}
      sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
    />
  </Grid>
  <Grid item xs={12}>
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Review Link"
          value={formData.reviewLink}
          onChange={handleReviewLinkChange}
          variant="outlined"
          sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        {formData.reviewEnabled ? (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Screenshot <span style={{ color: 'red' }}>*</span>
            </Typography>
            <Box
              sx={{
                border: '3px dotted #1976d2',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: formData.screenshot ? '#f5f5f5' : '#ffe6e6',
                minHeight: '125px',
                height: '125px',
                width: '100%',
                maxWidth: '500px',
                cursor: 'pointer',
                transition: 'background-color 0.3s',
                '&:hover': { backgroundColor: '#e3f2fd' },
                overflow: 'hidden',
                position: 'relative',
              }}
              component="label"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                style={{ display: 'none' }}
                required={formData.reviewEnabled}
              />
              {!formData.screenshot ? (
                <Box sx={{ textAlign: 'center' }}>
                  <AddIcon sx={{ fontSize: 40, color: '#1976d2' }} />
                  <Typography variant="body1" color="error">
                    Screenshot Required
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Click to upload an image
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <img
                    src={URL.createObjectURL(formData.screenshot)}
                    alt="Screenshot Upload Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      height: 'auto',
                      width: 'auto',
                      objectFit: 'contain',
                      borderRadius: '4px',
                    }}
                  />
                  <IconButton
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      color: '#fff',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
                      padding: '4px',
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      setFormData((prev) => ({ ...prev, screenshot: null }));
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
            {formData.reviewEnabled && !formData.screenshot && (
              <FormHelperText error>Screenshot is required for this order</FormHelperText>
            )}
          </Box>
        ) : (
          <Typography variant="body1" color="red">
            Review is disabled for this order.
          </Typography>
        )}
      </Grid>
    </Grid>
  </Grid>
</Grid>

          <Box sx={{ mt: 4 }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 2 
              }}
            >
              <Typography 
                variant="h5" 
                component="h2"
                sx={{ 
                  fontWeight: 500, 
                  color: 'primary.dark' 
                }}
              >
                Products
              </Typography>
              <Tooltip title="Add Product" placement="top">
                <AnimatedIconButton 
                  color="primary" 
                  onClick={addProductRow}
                  disabled={formData.products.length >= 5}
                >
                  <AddCircleOutlineIcon fontSize="large" />
                </AnimatedIconButton>
              </Tooltip>
            </Box>

            {formData.products.map((product, index) => (
              <StyledPaper key={index} elevation={0}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      select
                      label="Product Name"
                      value={product.name}
                      onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                      required
                      variant="outlined"
                      sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                    >
                      {getAvailableProductsForRow(index).map((option) => (
                        <MenuItem key={option.productId} value={option.name}>
                          {option.name} (Remaining: {option.remaining_quantity})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="text"
                      value={product.quantity}
                      onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                      required
                      variant="outlined"
                      InputProps={{ inputProps: { min: 1 } }}
                      error={!!quantityErrors[index]}
                      helperText={quantityErrors[index]}
                      sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                    />
                    {product.remaining_quantity > 0 && (
                      <FormHelperText>
                        Available quantity: {product.remaining_quantity}
                      </FormHelperText>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Tooltip 
                      title={formData.products.length === 1 ? "Minimum one product required" : "Remove Product"} 
                      placement="top"
                    >
                      <span>
                        <AnimatedIconButton 
                          color="error" 
                          onClick={() => removeProductRow(index)}
                          disabled={formData.products.length === 1}
                        >
                          <DeleteOutlineIcon />
                        </AnimatedIconButton>
                      </span>
                    </Tooltip>
                  </Grid>
                </Grid>
              </StyledPaper>
            ))}
          </Box>

          <Grid container spacing={3} sx={{ mt: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Employee Name"
                value={formData.employeeName}
                disabled
                variant="outlined"
                sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
              />
            </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Delivery Date"
              type="date"
              value={formData.deliveryDate}
              onChange={handleDateChange}
              error={!!dateError}
              helperText={`Delivery date must be greater than order date and less than consumption date`}
              required
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: today,
                onKeyDown: (e) => e.preventDefault() // Prevent manual typing
              }}
              sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
            />
          </Grid>
        </Grid>

          <Button
            type="submit"
            variant="contained"
            disabled={loading || Object.keys(quantityErrors).length > 0}
            fullWidth
            sx={{ 
              mt: 4, 
              py: 1.5, 
              borderRadius: 2,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: 3,
              '&:hover': { boxShadow: 6 }
            }}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            Create Delivery Record
          </Button>
        </Box>
      </CardContent>
    </StyledCard>
  );
}

export default ProductDeliveryForm;