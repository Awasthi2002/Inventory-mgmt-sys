import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Tooltip,
  FormControlLabel,
  Radio,
  RadioGroup
} from '@mui/material';
import {
  Save,
  ArrowBack,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import { Close as CloseIcon } from '@mui/icons-material';
import axios from 'axios';
import config from "@/config";

export function EmpProductOrderEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [previousQuantities, setPreviousQuantities] = useState({});
  const [initialRemainingQuantities, setInitialRemainingQuantities] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  // State for account details
  const [accountDetails, setAccountDetails] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [screenshotPreview, setScreenshotPreview] = useState(null);

  const [formData, setFormData] = useState({
    orderId: '',
    orderAmount: '',
    products: [],
    deliveryDetails: {
      fullAddress: '',
      phoneNo: '',
      deliveryPhoneNo: '',
    },
    customerDetails: {
      username: '',
      accountDetails: '',
    },
    note: '',
    // New fields for account and financial details
    accountNo: '',
    password: '',
    discountAmount: '0',
    finalAmount: '0',
    selectedAccount: '',
    paymentMethod: 'online',
    platformName: '',
    screenshot: null
  });

  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        const response = await axios.get(`${config.apiurl}/payment/get-allaccount-details`);
        if (response.data.success) {
          setAccountDetails(response.data.data);
        }
      } catch (err) {
        setError('Error fetching account details');
      }
    };

    fetchAccountDetails();
  }, []);

  // Fetch platforms
  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const response = await fetch(`${config.apiurl}/platform/get-all-platforms`);
        const data = await response.json();
        if (data.message === "Platforms retrieved successfully") {
          setPlatforms(data.platforms);
        }
      } catch (err) {
        setError('Error fetching platforms');
      }
    };
    fetchPlatforms();
  }, []);

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        screenshot: file
      }));
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

  // Cleanup screenshot preview URL
  useEffect(() => {
    return () => {
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [screenshotPreview]);

  // Fetch brands and their products
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await axios.get(`${config.apiurl}/brands/brand_details`);
        setBrands(response.data.data);
      } catch (err) {
        setError('Error fetching brands');
      }
    };
    fetchBrands();
  }, []);

  // Update the useEffect that fetches initial order details
useEffect(() => {
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config.apiurl}/brands/products-order/${id}`);
      const { productOrder } = response.data;

      setSelectedBrand(productOrder.brandDetails._id);

      const brandData = brands.find((brand) => brand._id === productOrder.brandDetails._id);
      if (brandData) {
        setAvailableEmployees(brandData.employees || []);
      }

      setEmployeeName(productOrder.employeeDetails.fullName);
      setEmployeeId(productOrder.employeeDetails._id);

      const initialQuantities = {};
      const initialRemaining = {};
      productOrder.products.forEach((item) => {
        initialQuantities[item.product.brandProductDetails.productId] = parseInt(item.quantity);
        initialRemaining[item.product.brandProductDetails.productId] = parseInt(item.remaining_quantity);
      });
      setPreviousQuantities(initialQuantities);
      setInitialRemainingQuantities(initialRemaining);

      setFormData({
        paymentMethod: productOrder.paymentMethod || 'online',
        orderId: productOrder.orderId,
        orderAmount: productOrder.orderAmount,
        products: productOrder.products.map((item) => ({
          product: item.product.brandProductDetails.productId,
          productName: item.product.brandProductDetails.name,
          quantity: item.quantity,
          remaining_quantity: item.remaining_quantity,
          deliveryStatus: item.deliveryStatus,
          expiry_date: item.product.brandProductDetails.expiry_date,
          noExpiry: item.product.brandProductDetails.noExpiry,
        })),
        accountNo: productOrder.accountNo || '',
        password: productOrder.password || '',
        discountAmount: productOrder.discountAmount?.toString() || '0',
        finalAmount: productOrder.finalAmount?.toString() || '0',
        selectedAccount: productOrder.selectedAccount || '',
        deliveryDetails: productOrder.deliveryDetails,
        customerDetails: productOrder.customerDetails,
        note: productOrder.note || '',
        platformName: productOrder.platformDetails._id || '', // Ensure this is set correctly
        screenshot: productOrder.screenshot || null,
      });

      if (productOrder.screenshot) {
        setScreenshotPreview(productOrder.screenshot);
      }

      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching order details');
    } finally {
      setLoading(false);
    }
  };

  if (id) {
    fetchOrderDetails();
  }
}, [id, brands]);


  const handleAccountSelection = (accountId) => {
    const selectedAccount = accountDetails.find(account => account._id === accountId);

    if (selectedAccount) {
      // Prepare account details text
      let accountDetailsText = "";
      if (selectedAccount.paymentType === "card") {
        accountDetailsText = `Card: ${selectedAccount.cardDetails.cardNumber}
        Type: ${selectedAccount.cardDetails.cardType}
        Exp: ${selectedAccount.cardDetails.expirationDate}`;
      } else if (selectedAccount.paymentType === "upi") {
        accountDetailsText = `UPI: ${selectedAccount.upiDetails.upiId}
        Bank: ${selectedAccount.upiDetails.bankName || "N/A"}
        Acc: ${selectedAccount.upiDetails.accountNumber || "N/A"}`;
      }

      setFormData(prev => ({
        ...prev,
        selectedAccount: accountId,
        accountDetails: accountDetailsText
      }));
    }
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
  };

  const handleQuantityChange = (index, newQuantity) => {
    setFormData(prev => {
      const updatedProducts = [...prev.products];
      const product = updatedProducts[index];

      // Convert to numbers and handle potential NaN
      newQuantity = parseInt(newQuantity) || 0;
      const oldQuantity = parseInt(product.quantity) || 0;
      const initialRemainingQty = parseInt(product.remaining_quantity) || 0;

      // Calculate delivered quantity
      const deliveredQuantity = oldQuantity - initialRemainingQty;

      // Validation: Prevent quantity from being less than delivered quantity
      if (newQuantity < deliveredQuantity) {
        setError(`Quantity cannot be less than delivered quantity (${deliveredQuantity})`);
        return prev; // Return previous state without changes
      }

      // Clear any previous error
      setError(null);

      // Calculate new remaining quantity
      let newRemainingQuantity;

      // If new quantity exactly matches delivered quantity, set remaining to 0
      if (newQuantity === deliveredQuantity) {
        newRemainingQuantity = 0;
      }
      // If new quantity is greater than delivered quantity, calculate remaining
      else {
        newRemainingQuantity = newQuantity - deliveredQuantity;
      }

      // Update the product with new quantities
      updatedProducts[index] = {
        ...product,
        quantity: newQuantity,
        remaining_quantity: newRemainingQuantity
      };

      return {
        ...prev,
        products: updatedProducts
      };
    });
  };


  // Update available products when brand is selected
  useEffect(() => {
    if (selectedBrand) {
      const selectedBrandData = brands.find(brand => brand._id === selectedBrand);
      if (selectedBrandData) {
        setAvailableProducts(selectedBrandData.products);

        // Update products based on the selected brand's products
        const brandProducts = selectedBrandData.products;
        if (brandProducts.length > 0) {
          // Keep existing products that belong to the selected brand
          const updatedProducts = formData.products.filter(product =>
            brandProducts.some(bp => bp.productId === product.product)
          );

          // If no existing products match, add the first product
          if (updatedProducts.length === 0) {
            updatedProducts.push({
              product: brandProducts[0].productId,
              productName: brandProducts[0].name,
              quantity: 0,
              remaining_quantity: 0,
              deliveryStatus: 'Ordered',
              expiry_date: brandProducts[0].expiry_date,
              noExpiry: brandProducts[0].noExpiry
            });
          }

          setFormData(prev => ({
            ...prev,
            products: updatedProducts
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            products: []
          }));
        }
      }
    }
  }, [selectedBrand, brands]);

  // // Handle brand selection
  // const handleBrandChange = (event) => {
  //   setSelectedBrand(event.target.value);
  // };

  // Update brand selection handler to also set available employees
  const handleBrandChange = (event) => {
    const selectedBrandId = event.target.value;
    setSelectedBrand(selectedBrandId);

    // Find the selected brand and its employees
    const selectedBrandData = brands.find(brand => brand._id === selectedBrandId);
    if (selectedBrandData) {
      setAvailableEmployees(selectedBrandData.employees || []);
      // Reset employee selection when brand changes
      setEmployeeId('');
      setEmployeeName('');
    }
  };


  // Add employee selection handler
  const handleEmployeeChange = (event) => {
    const selectedEmployeeId = event.target.value;
    const selectedEmployee = availableEmployees.find(emp => emp._id === selectedEmployeeId);
    if (selectedEmployee) {
      setEmployeeId(selectedEmployee._id);
      setEmployeeName(selectedEmployee.fullName);
    }
  };

  // Handle adding a new product
  const handleAddProduct = () => {
    // Check if we've reached the maximum number of products for the brand
    if (formData.products.length >= availableProducts.length) {
      setError('Maximum number of products reached for this brand');
      return;
    }

    // Find a product that hasn't been added yet
    const unusedProduct = availableProducts.find(ap =>
      !formData.products.some(p => p.product === ap.productId)
    );

    if (unusedProduct) {
      setFormData(prev => ({
        ...prev,
        products: [...prev.products, {
          product: unusedProduct.productId,
          productName: unusedProduct.name,
          quantity: 0,
          remaining_quantity: 0,
          deliveryStatus: 'Pending',
          expiry_date: unusedProduct.expiry_date,
          noExpiry: unusedProduct.noExpiry
        }]
      }));
    }
  };

  // Handle deleting a product
  const handleDeleteProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  // Handle product selection
  const handleProductSelect = (index, productId) => {
    // Check if product is already selected in another row
    const isProductSelected = formData.products.some(
      (p, i) => i !== index && p.product === productId
    );

    if (isProductSelected) {
      setError('This product is already selected in another row');
      return;
    }

    const selectedProduct = availableProducts.find(p => p.productId === productId);
    if (selectedProduct) {
      setFormData(prev => ({
        ...prev,
        products: prev.products.map((product, i) =>
          i === index ? {
            ...product,
            product: selectedProduct.productId,
            productName: selectedProduct.name,
            expiry_date: selectedProduct.expiry_date,
            noExpiry: selectedProduct.noExpiry
          } : product
        )
      }));
    }
  };

  // Handle input changes
const handleInputChange = (e, section = null) => {
  const { name, value } = e.target;

  if (section) {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: value
      }
    }));
  } else {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }
};

  // Handle product changes
  const handleProductChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map((product, i) =>
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };


  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    setSaving(true);
    
    // Validate required fields
    if (!selectedBrand || !employeeId || !formData.products.length) {
      setError('Please fill in all required fields');
      setSaving(false);
      return;
    }
    
    // Validate screenshot
    if (!formData.screenshot) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Payment screenshot is required!',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
      setSaving(false);
      return;
    }
    
    // Create FormData object to handle file uploads
    const formDataToSend = new FormData();
    
    // Append all the regular fields
    formDataToSend.append('brandName', selectedBrand);
    formDataToSend.append('employeeName', employeeId);
    formDataToSend.append('platformName', formData.platformName);
    formDataToSend.append('paymentMethod', formData.paymentMethod);
    formDataToSend.append('orderAmount', Number(formData.orderAmount));
    
    // Append product data as JSON string
    const productsData = formData.products.map(product => {
      // Calculate delivered quantity
      const deliveredQuantity = parseInt(product.quantity) - parseInt(product.remaining_quantity);
      
      // Ensure remaining quantity is 0 if it's effectively zero
      const finalRemainingQuantity =
        (parseInt(product.quantity) === deliveredQuantity)
          ? 0
          : parseInt(product.remaining_quantity);
      
      return {
        productId: product.product,
        quantity: parseInt(product.quantity),
        remaining_quantity: finalRemainingQuantity,
        deliveryStatus: product.deliveryStatus
      };
    });
    formDataToSend.append('products', JSON.stringify(productsData));
    
    // Append delivery details
    formDataToSend.append('fullAddress', formData.deliveryDetails.fullAddress);
    formDataToSend.append('phoneNo', formData.deliveryDetails.phoneNo);
    formDataToSend.append('deliveryPhoneNo', formData.deliveryDetails.deliveryPhoneNo);
    
    // Append customer details
    formDataToSend.append('username', formData.customerDetails.username);
    
    // Append additional fields
    formDataToSend.append('accountNo', formData.accountNo);
    formDataToSend.append('password', formData.password);
    formDataToSend.append('discountAmount', Number(formData.discountAmount));
    formDataToSend.append('finalAmount', Number(formData.finalAmount));
    
    // Handle payment method specific fields
    if (formData.paymentMethod === 'online' && formData.selectedAccount) {
      formDataToSend.append('selectedAccount', formData.selectedAccount);
      
      // Fix the accountDetails handling
      if (formData.accountDetails) {
        // If accountDetails is an array, take the first non-undefined value
        if (Array.isArray(formData.accountDetails)) {
          const validDetails = formData.accountDetails.find(detail => detail !== undefined && detail !== 'undefined');
          if (validDetails) {
            formDataToSend.append('accountDetails', validDetails);
          }
        } 
        // If it's a string, use it directly
        else if (typeof formData.accountDetails === 'string' && formData.accountDetails !== 'undefined') {
          formDataToSend.append('accountDetails', formData.accountDetails);
        }
      }
    }
    
    // Append optional note
    if (formData.note) {
      formDataToSend.append('note', formData.note);
    }
    
    // Handle the screenshot file upload
    if (formData.screenshot) {
      // If formData.screenshot is a File object, append it directly
      if (formData.screenshot instanceof File) {
        formDataToSend.append('screenshot', formData.screenshot);
        console.log('Appending screenshot as File object');
      } 
      // If it's a string that represents a new file (e.g., from file input), convert to File object
      else if (typeof formData.screenshot === 'string' && formData.screenshot.startsWith('data:')) {
        try {
          // Convert base64 to blob
          const response = await fetch(formData.screenshot);
          const blob = await response.blob();
          const file = new File([blob], "screenshot.jpg", { type: blob.type });
          formDataToSend.append('screenshot', file);
          console.log('Appending screenshot converted from base64');
        } catch (error) {
          console.error('Error converting screenshot:', error);
          setError('Error processing screenshot. Please try uploading again.');
          setSaving(false);
          return;
        }
      }
      // If it's a URL from previously uploaded screenshot, send it as existingScreenshot
      else if (typeof formData.screenshot === 'string' && (formData.screenshot.startsWith('http') || formData.screenshot.startsWith('/'))) {
        console.log('Using existing screenshot URL:', formData.screenshot);
        formDataToSend.append('existingScreenshot', formData.screenshot);
      } else {
        console.warn('Screenshot format not recognized:', typeof formData.screenshot);
        setError('Screenshot format not recognized. Please upload again.');
        setSaving(false);
        return;
      }
    } else {
      console.log('No screenshot provided');
    }
    
    console.log('Submitting order update...');
    
    // Make API call with multipart/form-data
    const response = await axios.put(
      `${config.apiurl}/brands/products-order-update/${id}`,
      formDataToSend,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    if (response.data.success) {
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Order updated successfully!',
        confirmButtonText: 'OK',
        confirmButtonColor: '#28a745',
      }).then(() => {
        navigate(-1);
      });
    } else {
      setError(response.data.message || 'Error updating order');
      setSaving(false);
    }
  } catch (err) {
    console.error('Error submitting form:', err);
    const errorMessage = err.response?.data?.message || 'Error updating order';
    setError(errorMessage);
    setSaving(false);
    
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage,
      confirmButtonText: 'OK',
      confirmButtonColor: '#d33',
    });
  }
};


// const handleSubmit = async (e) => {
//   e.preventDefault();
//   try {
//     setSaving(true);
    
//     // Validate required fields
//     if (!selectedBrand || !employeeId || !formData.products.length) {
//       setError('Please fill in all required fields');
//       setSaving(false);
//       return;
//     }
    
//     // Validate screenshot
//     if (!formData.screenshot) {
//       Swal.fire({
//         icon: 'error',
//         title: 'Error',
//         text: 'Payment screenshot is required!',
//         confirmButtonText: 'OK',
//         confirmButtonColor: '#d33',
//       });
//       setSaving(false);
//       return;
//     }
    
//     // Create FormData object to handle file uploads
//     const formDataToSend = new FormData();
    
//     // Append all the regular fields
//     formDataToSend.append('brandName', selectedBrand);
//     formDataToSend.append('employeeName', employeeId);
//     formDataToSend.append('platformName', formData.platformName);
//     formDataToSend.append('paymentMethod', formData.paymentMethod);
//     formDataToSend.append('orderAmount', Number(formData.orderAmount));
    
//     // Append product data as JSON string
//     const productsData = formData.products.map(product => {
//       // Calculate delivered quantity
//       const deliveredQuantity = parseInt(product.quantity) - parseInt(product.remaining_quantity);
      
//       // Ensure remaining quantity is 0 if it's effectively zero
//       const finalRemainingQuantity =
//         (parseInt(product.quantity) === deliveredQuantity)
//           ? 0
//           : parseInt(product.remaining_quantity);
      
//       return {
//         productId: product.product,
//         quantity: parseInt(product.quantity),
//         remaining_quantity: finalRemainingQuantity,
//         deliveryStatus: product.deliveryStatus
//       };
//     });
//     formDataToSend.append('products', JSON.stringify(productsData));
    
//     // Append delivery details
//     formDataToSend.append('fullAddress', formData.deliveryDetails.fullAddress);
//     formDataToSend.append('phoneNo', formData.deliveryDetails.phoneNo);
//     formDataToSend.append('deliveryPhoneNo', formData.deliveryDetails.deliveryPhoneNo);
    
//     // Append customer details
//     formDataToSend.append('username', formData.customerDetails.username);
//     if (formData.customerDetails.accountDetails) {
//       formDataToSend.append('accountDetails', formData.customerDetails.accountDetails);
//     }
    
//     // Append additional fields
//     formDataToSend.append('accountNo', formData.accountNo);
//     formDataToSend.append('password', formData.password);
//     formDataToSend.append('discountAmount', Number(formData.discountAmount));
//     formDataToSend.append('finalAmount', Number(formData.finalAmount));
    
//     // Handle payment method specific fields
//     if (formData.paymentMethod === 'online' && formData.selectedAccount) {
//       formDataToSend.append('selectedAccount', formData.selectedAccount);
//       formDataToSend.append('accountDetails', formData.accountDetails);
//     }
    
//     // Append optional note
//     if (formData.note) {
//       formDataToSend.append('note', formData.note);
//     }
    
//     // Handle the screenshot file upload
//     // If formData.screenshot is a File object, append it directly
//     if (formData.screenshot instanceof File) {
//       formDataToSend.append('screenshot', formData.screenshot);
//     } 
//     // If it's a string that represents a new file (e.g., from file input), convert to File object
//     else if (typeof formData.screenshot === 'string' && formData.screenshot.startsWith('data:')) {
//       // Convert base64 to blob
//       const response = await fetch(formData.screenshot);
//       const blob = await response.blob();
//       const file = new File([blob], "screenshot.jpg", { type: blob.type });
//       formDataToSend.append('screenshot', file);
//     }
    
//     console.log('Submitting order update...');
    
//     // Make API call with multipart/form-data
//     const response = await axios.put(
//       `${config.apiurl}/brands/products-order-update/${id}`,
//       formDataToSend,
//       {
//         headers: {
//           'Content-Type': 'multipart/form-data'
//         }
//       }
//     );
    
//     if (response.data.success) {
//       navigate(-1);
//     } else {
//       setError(response.data.message || 'Error updating order');
//       setSaving(false);
//     }
//   } catch (err) {
//     console.error('Error submitting form:', err);
//     const errorMessage = err.response?.data?.message || 'Error updating order';
//     setError(errorMessage);
//     setSaving(false);
//   }
// };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   try {
  //     setSaving(true);

  //     // Validate required fields
  //     if (!selectedBrand || !employeeId || !formData.products.length) {
  //       setError('Please fill in all required fields');
  //       setSaving(false);
  //       return;
  //     }
  //     // Validate screenshot
  //   if (!formData.screenshot) {
  //     Swal.fire({
  //       icon: 'error',
  //       title: 'Error',
  //       text: 'Payment screenshot is required!',
  //         confirmButtonText: 'OK',
  //       confirmButtonColor: '#d33',
  //     });
  //     setSaving(false);
  //     return;
  //   }

  //     // Prepare the data according to backend requirements
  //     const updatedData = {
  //       // Brand and Employee IDs
  //       brandName: selectedBrand,
  //       employeeName: employeeId,
  //       platformName: formData.platformName,
  //       screenshot: formData.screenshot ,

  //       paymentMethod: formData.paymentMethod,
  //       // Order details
  //       orderAmount: Number(formData.orderAmount),

  //       // Products array with required structure
  //       products: formData.products.map(product => {
  //         // Calculate delivered quantity
  //         const deliveredQuantity = parseInt(product.quantity) - parseInt(product.remaining_quantity);

  //         // Ensure remaining quantity is 0 if it's effectively zero
  //         const finalRemainingQuantity =
  //           (parseInt(product.quantity) === deliveredQuantity)
  //             ? 0
  //             : parseInt(product.remaining_quantity);

  //         return {
  //           productId: product.product,
  //           quantity: parseInt(product.quantity),
  //           remaining_quantity: finalRemainingQuantity,
  //           deliveryStatus: product.deliveryStatus
  //         };
  //       }),

  //       // Delivery details
  //       fullAddress: formData.deliveryDetails.fullAddress,
  //       phoneNo: formData.deliveryDetails.phoneNo,
  //       deliveryPhoneNo: formData.deliveryDetails.deliveryPhoneNo,

  //       // Customer details
  //       username: formData.customerDetails.username,
  //       accountDetails: formData.customerDetails.accountDetails,

  //       accountNo: formData.accountNo,
  //       password: formData.password,
  //       discountAmount: Number(formData.discountAmount),
  //       finalAmount: Number(formData.finalAmount),
  //       ...(formData.paymentMethod === 'online' ? {
  //         selectedAccount: formData.selectedAccount,
  //         accountDetails: formData.accountDetails,
  //       } : {
  //         selectedAccount: null,
  //         accountDetails: null,
  //       }),
  //       // Optional note
  //       note: formData.note || ''
  //     };
  //     console.log('Updated Data:', updatedData);

  //     // Make API call to update the order
  //     const response = await axios.put(
  //       `${config.apiurl}/brands/products-order-update/${id}`,
  //       updatedData
  //     );

  //     if (response.data.success) {
  //       navigate(-1);
  //     } else {
  //       setError(response.data.message || 'Error updating order');
  //       setSaving(false);
  //     }
  //   } catch (err) {
  //     const errorMessage = err.response?.data?.message || 'Error updating order';
  //     setError(errorMessage);
  //     setSaving(false);
  //   }
  // };



  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <IconButton onClick={() => navigate(-1)} color="primary">
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">Edit Order</Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      <Grid container spacing={3}>
        {/* Order Information Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Order ID"
                    name="orderId"
                    value={formData.orderId}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Brand Name</InputLabel>
                    <Select
                      value={selectedBrand}
                      onChange={handleBrandChange}
                      label="Brand Name"
                    >
                      {brands.map((brand) => (
                        <MenuItem key={brand._id} value={brand._id}>
                          {brand.brandName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Employee</InputLabel>
                    <Select
                      value={employeeId}
                      onChange={handleEmployeeChange}
                      label="Employee"
                      disabled={!selectedBrand} // Disable if no brand is selected
                    >
                      {availableEmployees.map((employee) => (
                        <MenuItem key={employee._id} value={employee._id}>
                          {employee.fullName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>


                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Account and Financial Details
                      </Typography>
                      <Grid container spacing={2}>
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
                              <FormControl fullWidth>
                                <InputLabel>Select Payment Account</InputLabel>
                                <Select
                                  value={formData.selectedAccount}
                                  onChange={(e) => handleAccountSelection(e.target.value)}
                                  label="Select Payment Account"
                                >
                                  {accountDetails.map((account) => (
                                    <MenuItem key={account._id} value={account._id}>
                                      {account.name} - {account.paymentType} - {account.phoneNumber}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>

                            {/* Show Selected Account Details */}
                            {formData.selectedAccount && (
                              <Grid item xs={12}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Typography variant="subtitle1">Account Details</Typography>
                                    <Typography variant="body2" whiteSpace="pre-line">
                                      {formData.accountDetails}
                                    </Typography>
                                  </CardContent>
                                </Card>
                              </Grid>
                            )}


                          </>
                        )}
                        {/* Account No and Password Fields */}
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Account Number"
                            name="accountNo"
                            value={formData.accountNo}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              accountNo: e.target.value
                            }))}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              password: e.target.value
                            }))}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShowPassword(!showPassword)}
                                    edge="end"
                                  >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              )
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="Order Amount"
                            name="orderAmount"
                            type="number"
                            value={formData.orderAmount}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              orderAmount: e.target.value
                            }))}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="Discount Amount"
                            name="discountAmount"
                            type="number"
                            value={formData.discountAmount}
                            onChange={(e) => {
                              const discountAmount = e.target.value;
                              setFormData(prev => {
                                const orderAmount = parseFloat(prev.orderAmount) || 0;
                                const discount = parseFloat(discountAmount) || 0;
                                const finalAmount = Math.max(0, orderAmount - discount);

                                return {
                                  ...prev,
                                  discountAmount: discountAmount,
                                  finalAmount: finalAmount.toString()
                                };
                              });
                            }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="Final Amount"
                            name="finalAmount"
                            type="number"
                            value={formData.finalAmount}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }}
                            disabled // Calculated field
                          />
                        </Grid>
                        <Grid container item xs={12} spacing={2}>
                          <Grid item xs={12} md={4}>
  <FormControl fullWidth>
    <InputLabel>Platform Name</InputLabel>
    <Select
      name="platformName"
      label="Platform Name"
      value={formData.platformName || ''}
      onChange={(e) => handleInputChange(e)}
    >
      {/* <MenuItem value="">Select a platform</MenuItem> */}
      {platforms.map((platform) => (
        <MenuItem key={platform.id} value={platform.id}>
          {platform.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</Grid>

                        </Grid>

                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Products Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Products</Typography>
                <Tooltip title={
                  formData.products.length >= availableProducts.length
                    ? "Maximum products reached for this brand"
                    : "Add product"
                }>
                  <span>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={handleAddProduct}
                      disabled={!selectedBrand || formData.products.length >= availableProducts.length}
                    >
                      Add Product
                    </Button>
                  </span>
                </Tooltip>
              </Stack>

              {formData.products.length > 0 ? (
                formData.products.map((product, index) => (
                  <Paper key={index} elevation={2} sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Select Product</InputLabel>
                          <Select
                            value={product.product}
                            onChange={(e) => handleProductSelect(index, e.target.value)}
                            label="Select Product"
                          >
                            {availableProducts.map((p) => (
                              <MenuItem
                                key={p.productId}
                                value={p.productId}
                                disabled={formData.products.some(
                                  (existingProduct, i) =>
                                    i !== index && existingProduct.product === p.productId
                                )}
                              >
                                {p.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Quantity"
                          type="number"
                          value={product.quantity}
                          onChange={(e) => handleQuantityChange(index, e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Remaining Quantity"
                          type="number"
                          value={product.remaining_quantity}
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Delivery Status"
                          select
                          SelectProps={{ native: true }}
                          value={product.deliveryStatus}
                          onChange={(e) => handleProductChange(index, 'deliveryStatus', e.target.value)}
                        >
                          {['Pending', 'Ordered', 'Processing', 'Shipped', 'Cancelled'].map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteProduct(index)}
                          disabled={formData.products.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))
              ) : (
                <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                  No products available for selected brand
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Delivery Details Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Delivery Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Full Address"
                    name="fullAddress"
                    multiline
                    rows={3}
                    value={formData.deliveryDetails.fullAddress}
                    onChange={(e) => handleInputChange(e, 'deliveryDetails')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phoneNo"
                    value={formData.deliveryDetails.phoneNo}
                    onChange={(e) => handleInputChange(e, 'deliveryDetails')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Delivery Phone"
                    name="deliveryPhoneNo"
                    value={formData.deliveryDetails.deliveryPhoneNo}
                    onChange={(e) => handleInputChange(e, 'deliveryDetails')}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Details Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Username"
                    name="username"
                    value={formData.customerDetails.username}
                    onChange={(e) => handleInputChange(e, 'customerDetails')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Account Details"
                    name="accountDetails"
                    multiline
                    rows={3}
                    value={formData.customerDetails.accountDetails}
                    onChange={(e) => handleInputChange(e, 'customerDetails')}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Notes Card */}
        <Grid container spacing={2} xs={12} md={12} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Grid container spacing={2}>
                  {/* Notes Section */}
                  <Grid item xs={12} md={8}>
                    <Typography variant="h6" gutterBottom>
                      Notes
                    </Typography>
                    <TextField
                      fullWidth
                      name="note"
                      multiline
                      rows={4}
                      value={formData.note}
                      onChange={handleInputChange}
                    />
                  </Grid>
                  {/* Upload Payment Screenshot Section */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" gutterBottom>
                      Upload Payment Screenshot
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
                        backgroundColor: '#f5f5f5',
                        minHeight: '10px',
                        height: '130px',
                        width: '100%',
                        maxWidth: '300px',
                        cursor: 'pointer',
                        transition: 'background-color 0.3s',
                        '&:hover': {
                          backgroundColor: '#e3f2fd',
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
                          <AddIcon sx={{ fontSize: 40, color: '#1976d2' }} />
                          <Typography variant="body1" color="textSecondary">
                            Add Screenshot
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
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
          startIcon={<ArrowBack />}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
        >
          Save Changes
        </Button>
      </Box>
    </Box>
  );
}

export default EmpProductOrderEdit;