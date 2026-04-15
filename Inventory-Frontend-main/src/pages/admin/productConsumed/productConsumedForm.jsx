import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  TextField,
  Button,
  IconButton,
  Grid,
  Typography,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import config from '@/config';
// Custom debounce function remains the same
function useDebounce(callback, delay) {
    const [timeoutId, setTimeoutId] = useState(null);
  
    useEffect(() => {
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [timeoutId]);
  
    const debouncedCallback = useCallback((...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
  
      const newTimeoutId = setTimeout(() => {
        callback(...args);
      }, delay);
  
      setTimeoutId(newTimeoutId);
    }, [callback, delay, timeoutId]);
  
    return debouncedCallback;
  }
  

export function ConsumedProductForm() {
    const [formData, setFormData] = useState({
        orderId: '',
        brandId: '',
        brandName: '',
        employeeId: '',
        employeeName: '',
        deliveryDate: '',
        products: []
      });
    
      const [availableProducts, setAvailableProducts] = useState([]);
      const [selectedProducts, setSelectedProducts] = useState([{ productId: '', quantity: '' }]);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState(null);
    
      const resetForm = () => {
        setFormData({
          orderId: '',
          brandId: '',
          brandName: '',
          employeeId: '',
          employeeName: '',
          deliveryDate: '',
        });
        setAvailableProducts([]);
        setSelectedProducts([{ productId: '', quantity: '' }]);
      };
    
      const fetchOrderDetails = async (orderId) => {
        if (!orderId.trim()) {
          resetForm();
          return;
        }
    
        setLoading(true);
        setError(null);
    
        try {
          const response = await fetch(`${config.apiurl}/brands/orders/${orderId}/details`);
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch order details');
          }
    
          const orderData = data.data;
    
          // Transform products data
          const products = orderData.products.map(product => ({
            productId: product.productId,
            name: product.productDetails.name,
            availableQuantity: product.availableQuantity
          }));
    
          setAvailableProducts(products);
          setFormData({
            orderId: orderData.orderId,
            brandId: orderData.brandDetails.brandId, // Add brandId
            brandName: orderData.brandDetails.brandName,
            employeeId: orderData.employeeDetails.employeeId, // Add employeeId
            employeeName: orderData.employeeDetails.employeeName,
            deliveryDate: orderData.createdAt.split('T')[0],
          });
          
          setSelectedProducts([{ productId: '', quantity: '' }]);
        } catch (err) {
          setError(err.message || 'Error fetching order details');
          resetForm();
        } finally {
          setLoading(false);
        }
      };
    
      const debouncedFetch = useDebounce(fetchOrderDetails, 500);
    
      const handleOrderIdChange = (e) => {
        const newOrderId = e.target.value;
        setFormData(prev => ({ ...prev, orderId: newOrderId }));
        debouncedFetch(newOrderId);
      };
    
      // Rest of the handlers remain the same
      const handleAddProduct = () => {
        setSelectedProducts([...selectedProducts, { productId: '', quantity: '' }]);
      };
    
      const handleRemoveProduct = (index) => {
        const updatedProducts = selectedProducts.filter((_, i) => i !== index);
        setSelectedProducts(updatedProducts.length ? updatedProducts : [{ productId: '', quantity: '' }]);
      };
    
      const handleProductChange = (index, field, value) => {
        const updatedProducts = selectedProducts.map((product, i) => {
          if (i === index) {
            const newProduct = { ...product, [field]: value };
            
            if (field === 'productId') {
              const selectedProduct = availableProducts.find(p => p.productId === value);
              newProduct.maxQuantity = selectedProduct ? selectedProduct.availableQuantity : 0;
              newProduct.quantity = '';
            }
            
            if (field === 'quantity') {
              // Convert input to number and ensure it's not negative
              let numValue = Math.max(0, parseInt(value) || 0);
              const maxQuantity = product.maxQuantity || 0;
              
              // Ensure the quantity doesn't exceed maxQuantity
              if (numValue > maxQuantity) {
                numValue = maxQuantity;
              }
              
              // Update the quantity with the validated value
              newProduct.quantity = numValue.toString();
            }
            
            return newProduct;
          }
          return product;
        });
        
        setSelectedProducts(updatedProducts);
      };
    
      const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.orderId || !formData.brandId) {
          setError('Order ID and Brand ID are required');
          return;
        }
    
        if (!selectedProducts.some(p => p.productId && p.quantity)) {
          setError('At least one product with quantity is required');
          return;
        }
    
        setLoading(true);
        setError(null);
    
        try {
          const submissionData = {
            orderId: formData.orderId,
            brandId: formData.brandId,
            brandName: formData.brandName,
            employeeId: formData.employeeId,
            employeeName: formData.employeeName,
            deliveryDate: formData.deliveryDate,
            products: selectedProducts
              .filter(p => p.productId && p.quantity)
              .map(product => ({
                productId: product.productId,
                quantity: parseInt(product.quantity)
              }))
          };
    
          const response = await fetch(`${config.apiurl}/brands/post_consumed_product`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(submissionData)
          });
    
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Failed to submit order');
          }
    
          resetForm();
          alert('Order updated successfully');
        } catch (err) {
          setError(err.message || 'Error submitting order');
        } finally {
          setLoading(false);
        }
      };
    
      const getAvailableProductOptions = (currentProductId) => {
        return availableProducts.filter(product => 
          product.productId === currentProductId || 
          !selectedProducts.some(selected => selected.productId === product.productId)
        );
      };
  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 4 }}>
      <form onSubmit={handleSubmit}>
        <Typography variant="h5" gutterBottom>
          Order Details
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Order ID"
              name="orderId"
              value={formData.orderId}
              onChange={handleOrderIdChange}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Brand"
              value={formData.brandName}
              disabled
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Employee"
              value={formData.employeeName}
              disabled
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label="Delivery Date"
              value={formData.deliveryDate}
              disabled
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Products asdfghgfdsasdfghj
          </Typography>
          
          {selectedProducts.map((product, index) => (
            <Grid container spacing={2} key={index} sx={{ mb: 2 }} alignItems="center">
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Select Product</InputLabel>
                  <Select
                    value={product.productId}
                    onChange={(e) => handleProductChange(index, 'productId', e.target.value)}
                    label="Select Product"
                  >
                    <MenuItem value="">
                      <em>Select a product</em>
                    </MenuItem>
                    {getAvailableProductOptions(product.productId).map((option) => (
                      <MenuItem key={option.productId} value={option.productId}>
                        {option.name} (Available: {option.availableQuantity})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
              <TextField
  fullWidth
  type="number"
  label="Quantity"
  value={product.quantity}
  onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
  inputProps={{
    min: 0,
    max: product.maxQuantity || 0,
    step: 1
  }}
  disabled={!product.productId}
  helperText={product.productId ? `Available: ${product.maxQuantity || 0}` : ''}
  error={parseInt(product.quantity) > product.maxQuantity}
/>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <IconButton
                  color="error"
                  onClick={() => handleRemoveProduct(index)}
                  disabled={selectedProducts.length === 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}

          <Button
            startIcon={<AddIcon />}
            onClick={handleAddProduct}
            variant="outlined"
            sx={{ mt: 1 }}
          >
            Add Product
          </Button>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading || !formData.orderId || !selectedProducts.some(p => p.productId && p.quantity)}
          >
            {loading ? 'Updating...' : 'Update Order'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}

export default ConsumedProductForm;