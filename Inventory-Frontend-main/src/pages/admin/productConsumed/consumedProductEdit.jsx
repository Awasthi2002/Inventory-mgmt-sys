import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Paper, 
  Box, 
  CircularProgress,
  Alert,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Snackbar
} from '@mui/material';
import { 
  Save as SaveIcon, 
  ArrowBack as BackIcon 
} from '@mui/icons-material';
import config from '@/config';

export function ProductConsumptionEdit (){
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [quantityExceeded, setQuantityExceeded] = useState({});
  const [quantityChanges, setQuantityChanges] = useState({});

  const [employees, setEmployees] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    date: '',
    productDetails: []
  });

  // Add function to get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // New: Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'date') {
      const selectedDate = value;
      const today = getCurrentDate();
      
      if (selectedDate > today) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Date',
          text: 'You can only select today\'s date or a previous date'
        });
        setFormData(prevState => ({
          ...prevState,
          [name]: today
        }));
        return;
      }
    }
    
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  useEffect(() => {
    const fetchConsumptionDetails = async () => {
      try {
        setIsLoading(true);
        const [consumptionResponse, employeesResponse] = await Promise.all([
          axios.get(`${config.apiurl}/consumed-products/get-all-consumed-productbyId/${id}`),
          axios.get(`${config.apiurl}/delivery-products/get-all-employees`)
        ]);
        
        const data = consumptionResponse.data.data.consumedProducts;
        const employeesData = employeesResponse.data;
        
        setEmployees(employeesData);
        
        // Populate form data based on the new response structure
        setFormData({
          employeeId: data.employeeId._id,
          employeeName: data.employeeId.fullName,
          date: new Date(data.date).toISOString().split('T')[0],
          productDetails: data.productDetails.map(product => ({
            productId: product.productDetails.productId,
            productName: product.productDetails.name,
            brandName: product.brandName,
            brandId:product.brandId,
            consumedQuantity: product.consumedQuantity,
            originalConsumedQuantity: product.consumedQuantity, // Store original quantity
            unit: 'pcs', // Default unit
            image: product.productDetails.image,
            maxAllowedQuantity: product.productDetails.maxAllowedQuantity,
            remainingQuantity: product.productDetails.remainingQuantity
          }))
        });
        
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchConsumptionDetails();
  }, [id]);

  const handleQuantityChange = (index, value) => {
        // Check if value is a decimal number
        if (value.includes('.')) {
          Swal.fire({
            icon: 'error',
            title: 'Invalid Quantity',
            text: 'Please enter only whole numbers'
          });
          return;
        }
    const product = formData.productDetails[index];
    const numericValue = Number(value);
    const originalQuantity = product.originalConsumedQuantity || product.consumedQuantity;

    // Create a copy of quantityExceeded state
    const newQuantityExceeded = {...quantityExceeded};

    // Create a copy of quantityChanges state
    const newQuantityChanges = {...quantityChanges};

    // Calculate quantity change
    const quantityChange = numericValue - originalQuantity;
    newQuantityChanges[product.productId] = quantityChange;

    // Check if quantity exceeds max allowed
    if (numericValue > product.maxAllowedQuantity) {
      // Set error message for this specific product
      newQuantityExceeded[product.productId] = `Cannot exceed maximum allowed quantity of ${product.maxAllowedQuantity} ${product.unit}`;
    } else {
      // Remove the error for this product if quantity is now valid
      delete newQuantityExceeded[product.productId];
    }

    // Update quantity regardless of max allowed limit
    const updatedProductDetails = [...formData.productDetails];
    updatedProductDetails[index] = {
      ...updatedProductDetails[index],
      consumedQuantity: numericValue
    };
    
    // Update state
    setFormData(prev => ({
      ...prev,
      productDetails: updatedProductDetails
    }));

    // Update quantity exceeded state
    setQuantityExceeded(newQuantityExceeded);

    // Update quantity changes state
    setQuantityChanges(newQuantityChanges);
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate inputs
      if (Object.keys(quantityExceeded).length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please check product quantities. Some exceed the maximum allowed limit.'
        });
        return;
      }
      // Check if any product has zero or negative quantity
      const zeroQuantityProducts = formData.productDetails.filter(
        product => !product.consumedQuantity || product.consumedQuantity <= 0
      );
  
      if (zeroQuantityProducts.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Consumed quantity must be greater than 0 for all products.'
        });
        return;
      }
  
      // Group products by brand with quantity changes
      const groupedByBrand = formData.productDetails.reduce((acc, product) => {
        // Use brandName as the key for grouping
        if (!acc[product.brandName]) {
          acc[product.brandName] = {
            brandId: product.brandId,
            products: []
          };
        }
  
        // Calculate quantity change
        const quantityChange = product.consumedQuantity - product.originalConsumedQuantity;
  
        // Add product to its brand group
        acc[product.brandName].products.push({
          productId: product.productId,
          consumedQuantity: Number(product.consumedQuantity),
          quantityChange: quantityChange // Include quantity change
        });
  
        return acc;
      }, {});
  
      // Prepare data for submission
      const submitData = {
        employeeId: formData.employeeId,
        date: formData.date,
        productDetails: Object.values(groupedByBrand).map(brandGroup => ({
          brandId: brandGroup.brandId,
          products: brandGroup.products
        }))
      };
  
      // Log the data being sent
      console.log('Submit Data:', JSON.stringify(submitData, null, 2));
  
      // Update endpoint
      const response = await axios.put(
        `${config.apiurl}/consumed-products/update-consumption/${id}`, 
        submitData
      );
      
      // Show success message with SweetAlert
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Consumption updated successfully!',
        timer: 1500,
        showConfirmButton: true
      }).then(() => {
        // Navigate to admin home after success
        navigate('/admin/consumed_products');
      });
    } catch (err) {
      // Log error details
      console.error('Full Error:', err);
      console.error('Error Response:', err.response);
      console.error('Error Message:', err.message);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || err.message
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage('');
    setError(null);
  };

  if (isLoading) return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      height="100vh"
      sx={{ 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}
    >
      <CircularProgress color="primary" size={80} />
    </Box>
  );

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/placeholder-image.jpg';
    const cleanPath = imagePath.startsWith('/uploads') ? imagePath.slice(8) : imagePath;
    const baseUrl = config.apiurl.replace('/api', '');
    return `${baseUrl}/uploads/${cleanPath}`;
  };

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        py: 4,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        minHeight: '100vh'
      }}
    >
      <Paper 
        elevation={6} 
        sx={{ 
          borderRadius: 3, 
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2, 
            bgcolor: 'primary.main', 
            color: 'white' 
          }}
        >
          <IconButton 
            color="inherit" 
            onClick={() => navigate(-1)}
            sx={{ mr: 2 }}
          >
            <BackIcon />
          </IconButton>
          <Typography variant="h5">
            Edit Product Consumption
          </Typography>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Employee Details */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Select Employee"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  variant="outlined"
                  required
                >
                  {employees.map((employee) => (
                    <MenuItem key={employee._id} value={employee._id}>
                      {employee.fullName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
              <TextField
        fullWidth
        label="Date"
        type="date"
        name="date"
        value={formData.date}
        onChange={handleInputChange}
        variant="outlined"
        InputLabelProps={{
          shrink: true,
        }}
        inputProps={{
          max: getCurrentDate(), // Prevent future dates
        }}
        helperText="Consumption date must be after delivery date"
        required
      />
              </Grid>

              {/* Product Details */}
              {formData.productDetails.map((product, index) => (
                <Grid item xs={12} key={product.productId}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      borderRadius: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'scale(1.02)'
                      }
                    }}
                  >
                    <CardContent>
                      <Grid container spacing={2} alignItems="center">
                        {/* Small Product Image */}
                        <Grid item xs={12} md={2}>
                          <img 
                            src={getImageUrl(product.image)} 
                            alt={product.productName}
                            style={{ 
                              maxWidth: '80px', 
                              maxHeight: '80px', 
                              objectFit: 'cover',
                              borderRadius: 8 
                            }} 
                          />
                        </Grid>

                        {/* Product Name and Brand */}
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {product.productName}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {product.brandName}
                          </Typography>
                        </Grid>

                        {/* Quantity Input */}
                        <Grid item xs={12} md={6}>
                        <TextField
        fullWidth
        label="Consumed Quantity"
        type="number"
        value={product.consumedQuantity || ''} 
        onChange={(e) => handleQuantityChange(index, e.target.value)}
        variant="outlined"
        error={!!quantityExceeded[product.productId]}
        helperText={
          quantityExceeded[product.productId] || 
          `Max Allowed: ${product.maxAllowedQuantity} (whole numbers only)`
        }
        InputProps={{
          endAdornment: (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>
                {product.unit}
              </Typography>
              {quantityChanges[product.productId] !== undefined && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: quantityChanges[product.productId] > 0 
                      ? 'success.main' 
                      : quantityChanges[product.productId] < 0 
                        ? 'error.main' 
                        : 'text.secondary'
                  }}
                >
                  {quantityChanges[product.productId] > 0 ? '+ ' : ''}
                  {quantityChanges[product.productId] !== 0 
                    ? quantityChanges[product.productId] 
                    : ''}
                </Typography>
              )}
            </Box>
          )
        }}
        inputProps={{
          step: 1, // Ensures only whole numbers
          min: 0
        }}
      />
                </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}

              <Grid item xs={12}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  fullWidth
                  startIcon={<SaveIcon />}
                  size="large"
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    fontWeight: 'bold',
                    textTransform: 'none'
                  }}
                >
                  Update Consumption
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Paper>

      {/* Snackbar for Success and Error Messages */}
      <Snackbar
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        open={!!successMessage || !!error}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar}
          severity={successMessage ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {successMessage || error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProductConsumptionEdit;