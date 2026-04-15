import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Tooltip,
  InputAdornment,
  FormControlLabel,
  Radio,
  RadioGroup
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Help as HelpIcon,
  ShoppingCart as ShoppingCartIcon,
  Person as PersonIcon,
  LocalShipping as LocalShippingIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';

import config from "@/config";
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Close as CloseIcon } from '@mui/icons-material'; // Import CloseIcon
import { useAuth } from '../auth/AuthContext';

export function EmpOrderForm({ onSubmit, initialData = null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [brandsData, setBrandsData] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [accountDetails, setAccountDetails] = useState([]);
  const [platformsData, setPlatformsData] = useState([]);
  const [screenshotPreview, setScreenshotPreview] = useState(null);

  const [formData, setFormData] = useState({
    orderId: "", // New Order ID Field
    accountNo: "",
    password: "",
    brandName: "",
    products: [{
      productId: "",
      quantity: 1,
      deliveryStatus: "Ordered"
    }],
    employeeName: "",
    orderAmount: "",
    fullAddress: "",
    phoneNo: "",
    deliveryPhoneNo: "",
    username: "",
    accountDetails: "",
    note: "",
    discountAmount: "0",
    finalAmount: "0",
    selectedAccount: "",
    paymentMethod: "online",
    screenshot: null
  });


  const steps = [
    'Basic Information',
    'Product Selection',
    'Shipping Details',
    'Payment Information'
  ];

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        screenshot: file
      }));
      // Generate preview URL
      const previewUrl = URL.createObjectURL(file);
      setScreenshotPreview(previewUrl);
    } else {
      setFormData(prev => ({
        ...prev,
        screenshot: null
      }));
      setScreenshotPreview(null);
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
    fetchBrands();
    fetchAccountDetails();
    fetchPlatforms(); // Fetch platforms on mount
  }, [initialData]);

  // Fetch platforms from API
  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiurl}/platform/get-all-platforms`);
      const data = await response.json();
      if (data.message === "Platforms retrieved successfully") {
        setPlatformsData(data.platforms);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      Swal.fire({
        title: 'Error!',
        text: err.message || 'Failed to fetch platforms',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
    }
  };

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiurl}/brands/get_inventory_list_by_employee/${user._id}`);
      const data = await response.json();
      setBrandsData(data.data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      Swal.fire({
        title: 'Error!',
        text: err.message || 'Failed to fetch brands',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
    }
  };

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiurl}/payment/get-allaccount-details`);
      const data = await response.json();
      if (data.success) {
        setAccountDetails(data.data);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      Swal.fire({
        title: 'Error!',
        text: err.message || 'Failed to fetch account details',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
    }
  };

  useEffect(() => {
    if (formData.brandName) {
      const selectedBrand = brandsData.find(brand => brand._id === formData.brandName);
      if (selectedBrand) {
        setAvailableProducts(selectedBrand.products);
        // Filter employees to only show the current user if they are an employee of this brand
        const currentUserAsEmployee = selectedBrand.employees.find(
          employee => employee._id === user._id
        );

        // Auto-select the current user as employee if they are part of the brand
        if (currentUserAsEmployee) {
          setAvailableEmployees([currentUserAsEmployee]);
          setFormData(prev => ({
            ...prev,
            employeeName: currentUserAsEmployee._id
          }));
        } else {
          setAvailableEmployees([]);
          setFormData(prev => ({
            ...prev,
            employeeName: ""
          }));
        }
      }
    } else {
      setAvailableProducts([]);
      setAvailableEmployees([]);
      setFormData(prev => ({
        ...prev,
        employeeName: ""
      }));
    }
  }, [formData.brandName, brandsData, user._id]);

  // Calculate final amount when orderAmount or discountAmount changes
  useEffect(() => {
    const orderAmount = parseFloat(formData.orderAmount) || 0;
    const discountAmount = parseFloat(formData.discountAmount) || 0;
    const finalAmount = Math.max(0, orderAmount - discountAmount);

    setFormData(prev => ({
      ...prev,
      finalAmount: finalAmount.toString()
    }));
  }, [formData.orderAmount, formData.discountAmount]);

  const validatePhoneNumber = (phoneNumber) => {
    // Remove any non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    // Check if it contains only digits and is exactly 10 characters long
    return /^\d{10}$/.test(digitsOnly);
  };

  const handlePhoneChange = (e) => {
    const { name, value } = e.target;

    // Remove any non-digit characters
    const digitsOnly = value.replace(/\D/g, '');

    // Limit to 10 digits
    const formattedValue = digitsOnly.slice(0, 10);

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));

    // Clear validation error for this field when it's changed
    if (validationErrors[name]) {
      const newErrors = { ...validationErrors };
      delete newErrors[name];
      setValidationErrors(newErrors);
    }
  };

  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 0:
        if (!formData.brandName) errors.brandName = 'Brand is required';
        if (!formData.platformName) errors.platformName = 'Platform is required';
        if (!formData.employeeName) errors.employeeName = 'Employee is required';
        if (!formData.accountNo) errors.accountNo = 'Account No is required';
        if (!formData.password) errors.password = 'Password is required';
        break;

      case 1:
        formData.products.forEach((product, index) => {
          if (!product.productId) {
            if (!errors.products) errors.products = [];
            errors.products[index] = 'Product is required';
          }
          if (!product.quantity || product.quantity < 1) {
            if (!errors.products) errors.products = [];
            errors.products[index] = errors.products[index] || 'Quantity must be at least 1';
          }
        });
        break;

      case 2:
        if (!formData.username) errors.username = 'Full Name is required';

        // Validate phone number
        if (!formData.phoneNo) {
          errors.phoneNo = 'Phone Number is required';
        } else if (!validatePhoneNumber(formData.phoneNo)) {
          errors.phoneNo = 'Phone Number must be 10 digits';
        }

        // Validate delivery phone number
        if (!formData.deliveryPhoneNo) {
          errors.deliveryPhoneNo = 'Delivery Phone Number is required';
        } else if (!validatePhoneNumber(formData.deliveryPhoneNo)) {
          errors.deliveryPhoneNo = 'Delivery Phone Number must be 10 digits';
        }

        if (!formData.fullAddress) errors.fullAddress = 'Full Address is required';
        break;

      case 3:
        if (!formData.orderAmount) errors.orderAmount = 'Order Amount is required';
        if (!formData.screenshot) errors.screenshot = 'Payment Screenshot is required';
        if (!formData.orderId) errors.orderId = 'Order ID is required';
        // Validate payment method
        if (formData.paymentMethod === "online" && !formData.selectedAccount) {
          errors.selectedAccount = 'Account Selection is required for online payment';
        }
        break;


      default:
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear validation error for this field when it's changed
    if (validationErrors[name]) {
      const newErrors = { ...validationErrors };
      delete newErrors[name];
      setValidationErrors(newErrors);
    }
  };

  const handleAccountSelection = (e) => {
    const selectedAccountId = e.target.value;
    const selectedAccount = accountDetails.find(account => account._id === selectedAccountId);

    let accountDetailsText = "";
    if (selectedAccount) {
      if (selectedAccount.paymentType === "card") {
        accountDetailsText = `Card: ${selectedAccount.cardDetails.cardNumber}
        Type: ${selectedAccount.cardDetails.cardType}
        Exp: ${selectedAccount.cardDetails.expirationDate}`;
      } else if (selectedAccount.paymentType === "upi") {
        accountDetailsText = `UPI: ${selectedAccount.upiDetails.upiId}
        Bank: ${selectedAccount.upiDetails.bankName || "N/A"}
        Acc: ${selectedAccount.upiDetails.accountNumber || "N/A"}`;
      }
    }

    setFormData(prev => ({
      ...prev,
      selectedAccount: selectedAccountId,
      accountDetails: accountDetailsText
    }));

    // Clear validation error for account selection
    if (validationErrors.selectedAccount) {
      const newErrors = { ...validationErrors };
      delete newErrors.selectedAccount;
      setValidationErrors(newErrors);
    }
  };


  const handleProductChange = (index, field, value) => {
    const newProducts = [...formData.products];
    newProducts[index] = {
      ...newProducts[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      products: newProducts
    }));

    // Clear validation error for this product when changed
    if (validationErrors.products && validationErrors.products[index]) {
      const newErrors = { ...validationErrors };
      newErrors.products[index] = null;
      setValidationErrors(newErrors);
    }
  };

  const addProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [
        ...prev.products,
        { productId: '', quantity: 1, deliveryStatus: 'Ordered' }
      ]
    }));
  };

  const removeProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      if (activeStep === 0) {
        console.log("Basic Information Form Data:", {
          brandName: formData.brandName,
          employeeName: formData.employeeName,
          accountNo: formData.accountNo,
          password: formData.password,
          platformName: formData.platformName,

        });
      }
      setActiveStep((prevStep) => prevStep + 1);
      // Clear any previous validation errors
      setValidationErrors({});
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handlePaymentMethodChange = (e) => {
    const paymentMethod = e.target.value;

    // Reset selected account when switching payment methods
    setFormData(prev => ({
      ...prev,
      paymentMethod,
      selectedAccount: paymentMethod === "online" ? "" : null,
      accountDetails: paymentMethod === "online" ? "" : null
    }));

    // Clear validation errors
    if (validationErrors.selectedAccount) {
      const newErrors = { ...validationErrors };
      delete newErrors.selectedAccount;
      setValidationErrors(newErrors);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    const isValid = validateStep(3);

    if (!isValid) {
      Swal.fire({
        title: 'Error!',
        text: validationErrors.screenshot
          ? 'Payment screenshot is required'
          : 'Please fill all required fields',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log('Form Data:', formData);

      const orderData = {
        orderId: formData.orderId,
        accountNo: formData.accountNo,
        platformName: formData.platformName,
        password: formData.password,
        brandId: formData.brandName,
        products: formData.products,
        employeeId: formData.employeeName,
        orderAmount: parseFloat(formData.orderAmount),
        discountAmount: parseFloat(formData.discountAmount),
        finalAmount: parseFloat(formData.finalAmount),
        fullAddress: formData.fullAddress,
        phoneNo: formData.phoneNo,
        deliveryPhoneNo: formData.deliveryPhoneNo,
        username: formData.username,
        paymentMethod: formData.paymentMethod,
        selectedAccount: formData.paymentMethod === "online" ? formData.selectedAccount : null,
        accountDetails: formData.paymentMethod === "online" ? formData.accountDetails : null,
        note: formData.note,
      };

      const formDataToSend = new FormData();
      for (const key in orderData) {
        if (key === 'products') {
          formDataToSend.append(key, JSON.stringify(orderData[key]));
        } else if (key !== 'screenshot') {
          formDataToSend.append(key, orderData[key]);
        }
      }

      if (formData.screenshot) {
        console.log('Screenshot details:', {
          name: formData.screenshot.name,
          size: formData.screenshot.size,
          type: formData.screenshot.type,
        });
        formDataToSend.append('screenshot', formData.screenshot);
      } else {
        console.log('No screenshot provided');
      }

      console.log('FormData contents:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`${key}:`, value instanceof File ? value.name : value);
      }

      const response = await fetch(`${config.apiurl}/brands/stock_order`, {
        method: 'POST',
        body: formDataToSend,
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Response error:', responseData);
        throw new Error(responseData.message || 'Failed to submit order');
      }

      console.log('Order submission successful:', responseData);

      Swal.fire({
        title: 'Success!',
        text: 'Order has been successfully submitted',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/admin/order_table');
        }
      });

      setActiveStep(4);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'Something went wrong');

      Swal.fire({
        title: 'Error!',
        text: err.message || 'Something went wrong',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableProductsForIndex = (currentIndex) => {
    // Get all selected product IDs except the current index
    const selectedProductIds = formData.products
      .filter((_, index) => index !== currentIndex)
      .map(p => p.productId);

    // Ensure availableProducts is an array before filtering
    const products = Array.isArray(availableProducts) ? availableProducts : [];

    // Filter out products that are already selected
    return products.filter(product =>
      !selectedProductIds.includes(product.productId)
    );
  };

  useEffect(() => {
    return () => {
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [screenshotPreview]);

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Card elevation={3}>
            <CardContent>
              <Grid container spacing={3}>

                <Grid item xs={12} md={6}>
                  <FormControl
                    fullWidth
                    error={!!validationErrors.brandName}
                  >
                    <InputLabel>Brand Name</InputLabel>
                    <Select
                      name="brandName"
                      label="Brand Name"
                      value={formData.brandName}
                      onChange={handleChange}
                      required
                      startAdornment={
                        <InputAdornment position="start">
                          <ShoppingCartIcon />
                        </InputAdornment>
                      }
                    >
                      {brandsData.map((brand) => (
                        <MenuItem key={brand._id} value={brand._id}>
                          {brand.brandName}
                        </MenuItem>
                      ))}
                    </Select>
                    {validationErrors.brandName && (
                      <Typography color="error" variant="caption">
                        {validationErrors.brandName}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl
                    fullWidth
                    error={!!validationErrors.employeeName}
                    disabled={!formData.brandName}
                  >
                    <InputLabel>Employee Name</InputLabel>
                    <Select
                      name="employeeName"
                      label="Employee Name"

                      value={formData.employeeName}
                      onChange={handleChange}
                      required
                      startAdornment={
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      }
                    >
                      {availableEmployees.map((employee) => (
                        <MenuItem key={employee._id} value={employee._id}>
                          {employee.fullName}
                        </MenuItem>
                      ))}
                    </Select>
                    {validationErrors.employeeName && (
                      <Typography color="error" variant="caption">
                        {validationErrors.employeeName}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl
                    fullWidth
                    error={!!validationErrors.platformName}
                  >
                    <InputLabel>Platform Name</InputLabel>
                    <Select
                      name="platformName"
                      label="Platform Name"
                      value={formData.platformName || ''}
                      onChange={handleChange}
                      required
                    >
                      <MenuItem value="">Select a platform</MenuItem>
                      {platformsData.map((platform) => (
                        <MenuItem key={platform.id} value={platform.id}>
                          {platform.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {validationErrors.platformName && (
                      <Typography color="error" variant="caption">
                        {validationErrors.platformName}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Account No"
                    name="accountNo"
                    value={formData.accountNo}
                    onChange={handleChange}
                    required
                    variant="outlined"
                    error={!!validationErrors.accountNo}
                    helperText={validationErrors.accountNo}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    variant="outlined"
                    error={!!validationErrors.password}
                    helperText={validationErrors.password}
                  />
                </Grid>

              </Grid>
            </CardContent>
          </Card>
        );
      case 1:
        return (
          <Card elevation={3}>
            <CardContent>
              {formData.products.map((product, index) => {
                // Get available products for this specific index
                const availableProductsForThis = getAvailableProductsForIndex(index);

                return (
                  <Box key={index} sx={{ mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={5}>
                        <FormControl
                          fullWidth
                          error={validationErrors.products && !!validationErrors.products[index]}
                        >
                          <InputLabel>Product</InputLabel>
                          <Select
                            value={product.productId}
                            onChange={(e) => handleProductChange(index, 'productId', e.target.value)}
                            required
                            disabled={!formData.brandName || availableProductsForThis.length === 0}
                          >
                            <MenuItem value="">Select a product</MenuItem>
                            {availableProductsForThis.map((p) => (
                              <MenuItem key={p.productId} value={p.productId}>
                                {p.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {validationErrors.products && validationErrors.products[index] && (
                            <Typography color="error" variant="caption">
                              {validationErrors.products[index]}
                            </Typography>
                          )}
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Quantity"
                          type="number"
                          value={product.quantity}
                          onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                          required
                          InputProps={{
                            inputProps: { min: 1 },
                            startAdornment: <InputAdornment position="start">#</InputAdornment>
                          }}
                          error={validationErrors.products && !!validationErrors.products[index]}
                          helperText={validationErrors.products && validationErrors.products[index]}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={product.deliveryStatus}
                            onChange={(e) => handleProductChange(index, 'deliveryStatus', e.target.value)}
                            required
                          >
                            {['Ordered', 'Pending', 'Processing', 'Shipped'].map((status) => (
                              <MenuItem key={status} value={status}>
                                {status}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <Tooltip title="Remove Product">
                          <IconButton
                            color="error"
                            onClick={() => removeProduct(index)}
                            disabled={formData.products.length === 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })}
              <Button
                startIcon={<AddIcon />}
                onClick={addProduct}
                variant="outlined"
                disabled={!formData.brandName ||
                  formData.products.length >= (Array.isArray(availableProducts) ? availableProducts.length : 0) ||
                  formData.products.some(p => p.productId === '')}
                sx={{ mt: 2 }}
              >
                Add Product
              </Button>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card elevation={3}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    variant="outlined"
                    error={!!validationErrors.username}
                    helperText={validationErrors.username}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phoneNo"
                    value={formData.phoneNo}
                    onChange={handlePhoneChange}
                    required
                    variant="outlined"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">+1</InputAdornment>,
                      inputProps: {
                        maxLength: 10,
                        pattern: "\\d*"
                      }
                    }}
                    error={!!validationErrors.phoneNo}
                    helperText={validationErrors.phoneNo}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Delivery Phone Number"
                    name="deliveryPhoneNo"
                    value={formData.deliveryPhoneNo}
                    onChange={handlePhoneChange}
                    required
                    variant="outlined"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">+1</InputAdornment>,
                      inputProps: {
                        maxLength: 10,
                        pattern: "\\d*"
                      }
                    }}
                    error={!!validationErrors.deliveryPhoneNo}
                    helperText={validationErrors.deliveryPhoneNo}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Full Address"
                    name="fullAddress"
                    value={formData.fullAddress}
                    onChange={handleChange}
                    required
                    multiline
                    rows={3}
                    variant="outlined"
                    error={!!validationErrors.fullAddress}
                    helperText={validationErrors.fullAddress}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card elevation={3}>
            <CardContent>
              {/* Add error display at the top of Step 3 */}
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              <Grid container spacing={3}>
                {/* Order ID Field */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Order ID"
                    name="orderId"
                    value={formData.orderId}
                    onChange={handleChange}
                    variant="outlined"
                    error={!!validationErrors.orderId}
                    helperText={validationErrors.orderId}
                    required
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Order Amount"
                    name="orderAmount"
                    type="number"
                    value={formData.orderAmount}
                    onChange={handleChange}
                    required
                    variant="outlined"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      inputProps: { min: 0, step: "0.01" }
                    }}
                    error={!!validationErrors.orderAmount}
                    helperText={validationErrors.orderAmount}
                  />
                </Grid>

                {/* Payment Method Selection */}
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <Typography variant="subtitle1">Select Payment Method</Typography>
                    <RadioGroup
                      row
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handlePaymentMethodChange}
                    >
                      <FormControlLabel
                        value="online"
                        control={<Radio />}
                        label="Online Payment"
                      />
                      <FormControlLabel
                        value="cod"
                        control={<Radio />}
                        label="Cash on Delivery (COD)"
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {/* Conditional Account Selection for Online Payment */}
                {formData.paymentMethod === "online" && (
                  <>
                    <Grid item xs={12}>
                      <FormControl fullWidth error={!!validationErrors.selectedAccount}>
                        <InputLabel>Select Payment Account</InputLabel>
                        <Select
                          name="selectedAccount"
                          value={formData.selectedAccount}
                          onChange={handleAccountSelection}
                          required
                        >
                          <MenuItem value="">Select an account</MenuItem>
                          {accountDetails.map((account) => (
                            <MenuItem key={account._id} value={account._id}>
                              {account.name} - {account.paymentType} - {
                                account.paymentType === "card"
                                  ? account.cardDetails.cardNumber
                                  : account.upiDetails.upiId
                              } - Mobile No. {account.phoneNumber}
                            </MenuItem>
                          ))}
                        </Select>
                        {validationErrors.selectedAccount && (
                          <Typography color="error" variant="caption">
                            {validationErrors.selectedAccount}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>

                    {/* Conditionally Show Account Details */}
                    {formData.selectedAccount && (
                      <Grid item xs={12}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6">Account Details</Typography>
                            {accountDetails.find(acc => acc._id === formData.selectedAccount)?.paymentType === "card" ? (
                              <>
                                <Typography><strong>Card Number:</strong> {accountDetails.find(acc => acc._id === formData.selectedAccount)?.cardDetails.cardNumber}</Typography>
                                <Typography><strong>Card Type:</strong> {accountDetails.find(acc => acc._id === formData.selectedAccount)?.cardDetails.cardType}</Typography>
                                <Typography><strong>Expiry:</strong> {accountDetails.find(acc => acc._id === formData.selectedAccount)?.cardDetails.expirationDate}</Typography>
                                <Typography><strong>CVV:</strong> {accountDetails.find(acc => acc._id === formData.selectedAccount)?.cardDetails.cvv}</Typography>

                              </>
                            ) : (
                              <>
                                <Typography><strong>UPI ID:</strong> {accountDetails.find(acc => acc._id === formData.selectedAccount)?.upiDetails.upiId}</Typography>
                                <Typography><strong>Bank:</strong> {accountDetails.find(acc => acc._id === formData.selectedAccount)?.upiDetails.bankName || "N/A"}</Typography>
                                <Typography><strong>Account Number:</strong> {accountDetails.find(acc => acc._id === formData.selectedAccount)?.upiDetails.accountNumber || "N/A"}</Typography>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </>
                )}

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Discount Amount"
                    name="discountAmount"
                    type="number"
                    value={formData.discountAmount}
                    onChange={handleChange}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      inputProps: { min: 0, step: "0.01" }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Final Amount"
                    name="finalAmount"
                    type="number"
                    value={formData.finalAmount}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      inputProps: { step: "0.01" }
                    }}
                    variant="outlined"
                  />
                </Grid>

                <Grid container item xs={12} spacing={2}>
                  {/* Screenshot Upload Section */}
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle1" gutterBottom>
                      Upload Payment Screenshot
                    </Typography>
                    <Box
                      sx={{
                        border: validationErrors.screenshot ? '3px dotted #d32f2f' : '3px dotted #1976d2',
                        borderRadius: '8px',
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: validationErrors.screenshot ? '#ffebee' : '#f5f5f5',
                        minHeight: '125px',
                        height: '125px',
                        width: '100%',
                        maxWidth: '300px',
                        cursor: 'pointer',
                        transition: 'background-color 0.3s',
                        '&:hover': {
                          backgroundColor: validationErrors.screenshot ? '#ffcdd2' : '#e3f2fd',
                        },
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
                      />
                      {!screenshotPreview ? (
                        <Box sx={{ textAlign: 'center' }}>
                          <AddIcon sx={{ fontSize: 40, color: validationErrors.screenshot ? '#d32f2f' : '#1976d2' }} />
                          <Typography variant="body1" color={validationErrors.screenshot ? 'error' : 'textSecondary'}>
                            Add Screenshot
                          </Typography>
                          <Typography variant="caption" color={validationErrors.screenshot ? 'error' : 'textSecondary'}>
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
                            src={screenshotPreview}
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
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              },
                              padding: '4px',
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              setFormData((prev) => ({
                                ...prev,
                                screenshot: null,
                              }));
                              setScreenshotPreview(null);
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                    {validationErrors.screenshot && (
                      <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                        {validationErrors.screenshot}
                      </Typography>
                    )}
                  </Grid>

                  {/* Additional Notes Section */}
                  <Grid item xs={12} md={9}>
                    <Typography variant="subtitle1" gutterBottom>
                      Additional Notes
                    </Typography>
                    <TextField
                      fullWidth
                      label="Additional Notes"
                      name="note"
                      value={formData.note}
                      onChange={handleChange}
                      multiline
                      rows={4}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );


      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }


  return (
    <Paper sx={{ p: 6, maxWidth: 1200, margin: 'auto', ml: -4 }}>
      <Typography variant="h4" gutterBottom align="center" color="primary" sx={{ mb: 4 }}>
        New Order Form
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <form onSubmit={handleSubmit}>
        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Submit Order
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              color="primary"
            >
              Next
            </Button>
          )}
        </Box>
      </form>
    </Paper>
  );
}

export default EmpOrderForm;