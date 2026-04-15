import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  IconButton,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { Add, Delete, Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import config from '@/config';

export function ProductConsumeForm() {
  // State for brands and products from API
  const [brandProducts, setBrandProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


    // Get current date in YYYY-MM-DD format
    const getCurrentDate = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
  // Existing state for the form
  const [cards, setCards] = useState([
    { brand: '', products: [{ name: '', quantity: '', available: '' }] },
  ]);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(getCurrentDate());

    // Navigation hook
    const navigate = useNavigate();

    // Add state for submission feedback
    const [submissionSuccess, setSubmissionSuccess] = useState(false);
    const [submissionError, setSubmissionError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch delivered products
        const productsResponse = await axios.get(`${config.apiurl}/consumed-products/delivered-prouducts`);
        setBrandProducts(productsResponse.data);

        // Fetch employees
        const employeesResponse = await axios.get(`${config.apiurl}/delivery-products/get-all-employees`);
        setEmployees(employeesResponse.data);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDateChange = (event) => {
    const selectedDate = event.target.value;
    const today = getCurrentDate();
    
    if (selectedDate > today) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Date',
        text: 'You can only select today\'s date or a previous date'
      });
      setDate(today);
    } else {
      setDate(selectedDate);
    }
  };

  // Modify handleBrandChange to work with fetched data
  const handleBrandChange = (index, brandId) => {
    const updatedCards = [...cards];
    updatedCards[index].brand = brandId;
    // Reset products when brand changes
    updatedCards[index].products = [{ name: '', quantity: '', available: '' }];
    setCards(updatedCards);
  };

  // const handleProductChange = (cardIndex, productIndex, field, value) => {
  //   const updatedCards = [...cards];
  //   updatedCards[cardIndex].products[productIndex][field] = value;
  //   setCards(updatedCards);
  // };

  const handleProductChange = (cardIndex, productIndex, field, value) => {
    const updatedCards = [...cards];
    const currentCard = updatedCards[cardIndex];
    const currentBrand = brandProducts.find(bp => bp.brandId === currentCard.brand);
    
    if (field === 'quantity') {
            // Check if value is a decimal number
            if (value.includes('.')) {
              Swal.fire({
                icon: 'error',
                title: 'Invalid Quantity',
                text: 'Please enter only whole numbers'
              });
              return;
            }
      
            // Convert to integer
            const quantityValue = parseInt(value);
      
      // Find the product's available quantity
      const product = currentBrand?.products.find(
        p => p.productId === currentCard.products[productIndex].name
      );
      
      const availableQuantity = product?.availableQuantity || 0;
      
      // Validate quantity against available quantity
      if (quantityValue > availableQuantity) {
        // Optionally set the value to the maximum available
        updatedCards[cardIndex].products[productIndex][field] = availableQuantity.toString();
        setSubmissionError(`Quantity cannot exceed available quantity (${availableQuantity})`);
      } else {
        updatedCards[cardIndex].products[productIndex][field] = value;
      }
    } else {
      updatedCards[cardIndex].products[productIndex][field] = value;
    }
    
    setCards(updatedCards);
  };

  const handleProductAdd = (cardIndex) => {
    const updatedCards = [...cards];
    updatedCards[cardIndex].products.push({ name: '', quantity: '', available: '' });
    setCards(updatedCards);
  };

  const handleProductRemove = (cardIndex, productIndex) => {
    const updatedCards = [...cards];
    if (updatedCards[cardIndex].products.length > 1) {
      updatedCards[cardIndex].products.splice(productIndex, 1);
      setCards(updatedCards);
    }
  };

  const handleCardRemove = (cardIndex) => {
    if (cards.length > 1) {
      const updatedCards = cards.filter((_, index) => index !== cardIndex);
      setCards(updatedCards);
    }
  };

  const handleCardAdd = () => {
    setCards([...cards, { brand: '', products: [{ name: '', quantity: '', available: '' }] }]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validate form
    if (!employeeId) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Please select an employee'
      });
      return;
    }

    if (!date) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Please select a date'
      });
      return;
    }
  // Enhanced validation to check available quantity for each product
  const validationErrors = [];

  const isValid = cards.every(card => {
    if (!card.brand) {
      validationErrors.push('Please select a brand for all cards');
      return false;
    }

    return card.products.every(product => {
      // Find the brand and product details
      const brandProduct = brandProducts.find(bp => bp.brandId === card.brand);
      const productDetails = brandProduct?.products.find(
        p => p.productId === product.name
      );

      // Check if product is selected
      if (!product.name) {
        validationErrors.push('Please select a product for all entries');
        return false;
      }

      // Check quantity
      const quantity = parseInt(product.quantity);
      const availableQuantity = productDetails?.availableQuantity || 0;

      if (!quantity || quantity <= 0) {
        validationErrors.push('Quantity must be a positive number');
        return false;
      }

      if (quantity > availableQuantity) {
        validationErrors.push(
          `Quantity for ${productDetails?.productDetails?.name || 'a product'} ` +
          `cannot exceed available quantity (${availableQuantity})`
        );
        return false;
      }

      return true;
    });
  });

    // If there are validation errors, display them using Swal
    if (!isValid) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: validationErrors.join('. ')
      });
      return;
    }


    // Prepare data for submission
    const submissionData = {
      employeeId: employeeId,
      date: new Date(date),
      productDetails: cards.map(card => ({
        brandId: card.brand,
        products: card.products.map(product => ({
          productId: product.name,
          consumedQuantity: parseInt(product.quantity)
        }))
      }))
    };

    try {
      // Send POST request to backend
      const response = await axios.post(
        `${config.apiurl}/consumed-products/create-consumed-product`, 
        submissionData
      );

      // Show success alert and navigate
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Product consumption recorded successfully.',
        confirmButtonText: 'Go to Admin Page'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/admin/consumed_products');
        }
      });

      // Reset form on successful submission
      setCards([{ brand: '', products: [{ name: '', quantity: '', available: '' }] }]);
      setEmployeeId('');
      setDate(getCurrentDate());
    } catch (error) {
      console.error('Submission error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Submission Error',
        text: error.response?.data?.message || 'Failed to submit consumed products'
      });
    }
  };

  // Close error/success message
  const handleCloseMessage = () => {
    setSubmissionError(null);
    setSubmissionSuccess(false);
  };

  // Function to get available brands for a specific card
  const getAvailableBrands = (currentCardIndex) => {
    // Get all brands already selected in other cards
    const selectedBrands = cards
      .filter((_, index) => index !== currentCardIndex)
      .map(card => card.brand);

    // Filter out already selected brands
    return brandProducts.filter(
      brandProduct => !selectedBrands.includes(brandProduct.brandId)
    );
  };

  // Function to get available products for a specific card and product selection
  const getAvailableProducts = (card, currentProductIndex) => {
    // If no brand is selected, return empty array
    if (!card.brand) return [];

    // Find the brand's products
    const brandProductsData = brandProducts.find(bp => bp.brandId === card.brand);
    if (!brandProductsData) return [];

    // Get products already selected in this card
    const selectedProducts = card.products
      .filter((_, index) => index !== currentProductIndex)
      .map(product => product.name);

    // Filter out already selected products
    return brandProductsData.products.filter(
      product => !selectedProducts.includes(product.productId)
    );
  };

  // Render loading state
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Render error state
  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
           {/* Snackbar for success message */}
           <Snackbar
        open={submissionSuccess}
        autoHideDuration={6000}
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseMessage} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          Product consumption recorded successfully!
        </Alert>
      </Snackbar>

      {/* Snackbar for error message */}
      <Snackbar
        open={!!submissionError}
        autoHideDuration={6000}
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseMessage} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          {submissionError}
        </Alert>
      </Snackbar>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mt: 4, 
          mb: 4,
          borderRadius: 2 
        }}
      >
        <form onSubmit={handleSubmit}>
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              textAlign: 'center', 
              mb: 3,
              fontWeight: 600,
              color: 'primary.main'
            }}
          >
            Product Consumption Form confirm
          </Typography>

          {/* Employee and Date Selection */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Select Employee</InputLabel>
                <Select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  label="Select Employee"
                >
                  {employees.map((employee) => (
                    <MenuItem 
                      key={employee._id} 
                      value={employee._id}
                    >
                      {employee.fullName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
            <TextField
        fullWidth
        label="Date"
        type="date"
        value={date}
        onChange={handleDateChange}
        variant="outlined"
        InputLabelProps={{
          shrink: true,
        }}
        inputProps={{
          max: getCurrentDate(), // Prevent future dates in the date picker
        }}
        helperText="Consumption date must be after delivery date"
      />
            </Grid>
          </Grid>

          {/* Brand and Product Selection Sections */}
          {cards.map((card, cardIndex) => (
            <Box 
              key={cardIndex} 
              sx={{ 
                border: '1px solid', 
                borderColor: 'grey.300', 
                borderRadius: 2, 
                p: 2, 
                mb: 2,
                position: 'relative'
              }}
            >
              {/* Card Remove Button */}
              {cards.length > 1 && (
                <IconButton
                  color="error"
                  onClick={() => handleCardRemove(cardIndex)}
                  sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8, 
                    zIndex: 10 
                  }}
                >
                  <Close />
                </IconButton>
              )}

              {/* Brand Selection */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Select Brand</InputLabel>
                    <Select
                      value={card.brand}
                      onChange={(e) => handleBrandChange(cardIndex, e.target.value)}
                      label="Select Brand"
                    >
                      {getAvailableBrands(cardIndex).map((brandProduct) => (
                        <MenuItem 
                          key={brandProduct.brandId} 
                          value={brandProduct.brandId}
                        >
                          {brandProduct.brandName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Product Details */}
              {card.products.map((product, productIndex) => (
                <Grid 
                  container 
                  spacing={2} 
                  key={productIndex} 
                  sx={{ 
                    mb: 2, 
                    alignItems: 'center' 
                  }}
                >
                  {/* Product Selection */}
                  <Grid item xs={12} sm={5}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Select Product</InputLabel>
                      <Select
                        value={product.name}
                        onChange={(e) =>
                          handleProductChange(cardIndex, productIndex, 'name', e.target.value)
                        }
                        label="Select Product"
                      >
                        {getAvailableProducts(card, productIndex).map((p) => (
                          <MenuItem key={p.productId} value={p.productId}>
                            {p.productDetails.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Quantity Input */}
<Grid item xs={12} sm={5}>
  <TextField
    fullWidth
    label="Quantity"
    type="number"
    value={product.quantity}
    onChange={(e) =>
      handleProductChange(cardIndex, productIndex, 'quantity', e.target.value)
    }
    variant="outlined"
    inputProps={{ 
      min: 0,
      step: 1, 
      max: (() => {
        const currentBrand = brandProducts.find(bp => bp.brandId === card.brand);
        const productDetails = currentBrand?.products.find(
          p => p.productId === product.name
        );
        return productDetails?.availableQuantity || 0;
      })()
    }}
    helperText={(() => {
      const currentBrand = brandProducts.find(bp => bp.brandId === card.brand);
      const productDetails = currentBrand?.products.find(
        p => p.productId === product.name
      );
      return productDetails 
            ? `Available: ${productDetails.availableQuantity} (whole numbers only)` 
            : 'Enter whole numbers only'
    })()}
  />
</Grid>

                  {/* Product Remove Button */}
                  {card.products.length > 1 && (
                    <Grid item xs={12} sm={1}>
                      <IconButton
                        color="error"
                        onClick={() => handleProductRemove(cardIndex, productIndex)}
                      >
                        <Delete />
                      </IconButton>
                    </Grid>
                  )}
                </Grid>
              ))}

              {/* Add Product Button */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Add />}
                  onClick={() => handleProductAdd(cardIndex)}
                >
                  Add Product
                </Button>
              </Box>
            </Box>
          ))}

          {/* Form-level Action Buttons */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={handleCardAdd}
              >
                Add Card
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                type="submit"
              >
                Submit Consumption
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

export default ProductConsumeForm;