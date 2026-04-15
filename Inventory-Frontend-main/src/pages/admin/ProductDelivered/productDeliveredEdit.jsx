import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  Chip,
  Divider,
  useMediaQuery,
  useTheme,
  CircularProgress
} from '@mui/material';
import {
  styled
} from '@mui/material/styles';
import {
  EditOutlined as EditIcon,
  SaveOutlined as SaveIcon,
  ErrorOutline as ErrorIcon,
  ArrowUpward as IncreaseIcon,
  ArrowDownward as DecreaseIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import config from '@/config';

// Custom Styled Components
const ModernPaper = styled(Paper)(({ theme }) => ({
  borderRadius: 16,
  padding: theme.spacing(4),
  boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 16px 32px rgba(0,0,0,0.15)',
    transform: 'translateY(-4px)',
  }
}));

const ProductImage = styled('img')({
  width: 80,
  height: 80,
  borderRadius: 12,
  objectFit: 'cover',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'scale(1.1)',
  }
});

const HeaderBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
  paddingBottom: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export function ProductDeliveredEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [deliveryDetails, setDeliveryDetails] = useState(null);
  const [originalDeliveryDetails, setOriginalDeliveryDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brandEmployees, setBrandEmployees] = useState([]);
  const [quantityErrors, setQuantityErrors] = useState({});
  const [quantityChanges, setQuantityChanges] = useState({});
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [reviewLink, setReviewLink] = useState(''); 
  const [reviewDate, setReviewDate] = useState('');
const [accountNo, setAccountNo] = useState('');
const [password, setPassword] = useState('');
const [platforms, setPlatforms] = useState([]);

  // Fetch platforms
useEffect(() => {
  const fetchPlatforms = async () => {
    try {
      const response = await axios.get(`${config.apiurl}/platform/get-all-platforms`);
      if (response.data.message === "Platforms retrieved successfully") {
        setPlatforms(response.data.platforms);
      }
    } catch (err) {
      setError('Error fetching platforms');
    }
  };
  fetchPlatforms();
}, []);

// Handle platform change
const handlePlatformChange = (event) => {
  const selectedPlatformName = event.target.value;
  const selectedPlatform = platforms.find(platform => platform.name === selectedPlatformName);
  
  if (selectedPlatform) {
    console.log('Selected platform:', selectedPlatform);
    // Make sure we're using the correct ID property
    setDeliveryDetails(prev => ({
      ...prev,
      platform: {
        _id: selectedPlatform.id, // Use the 'id' from API response
        name: selectedPlatform.name,
        reviewEnabled: selectedPlatform.reviewEnabled || false
      }
    }));
  }
};

const fetchDeliveryDetails = useCallback(async () => {
  try {
    const response = await axios.get(`${config.apiurl}/brands/by-order/${id}`);
    const deliveryData = response.data.data.deliveryDetails || {};

    // Ensure all required fields with null or default values
    const normalizedDeliveryData = {
      orderId: deliveryData.orderId || null,
      employee: deliveryData.employee || { _id: null, name: null, email: null },
      deliveryDate: deliveryData.deliveryDate || null,
      platform: deliveryData.platform || { _id: null, name: null, reviewEnabled: false },
      reviewLink: deliveryData.reviewLink || '',
      reviewScreenshot: deliveryData.reviewScreenshot || null,
      reviewDate: deliveryData.reviewDate || null,
      accountNo: deliveryData.accountNo || '',
      password: deliveryData.password || '',
      products: Array.isArray(deliveryData.products)
        ? deliveryData.products.map((product) => ({
            productInfo: {
              productId: product?.productInfo?.productId || null,
              name: product?.productInfo?.name || null,
              image: product?.productInfo?.image || null,
              expiry_date: product?.productInfo?.expiry_date || null,
              noExpiry: product?.productInfo?.noExpiry || false,
            },
            deliveryDetails: {
              quantity: product?.deliveryDetails?.quantity || 0,
              availableQuantity: product?.deliveryDetails?.availableQuantity || 0,
              consumptionStatus: product?.deliveryDetails?.consumptionStatus || '0_consumed',
              deliveryStatus: product?.deliveryDetails?.deliveryStatus || 'delivered',
            },
          }))
        : [],
      brand: deliveryData.brand || { employees: [] },
    };

    const employees = Array.isArray(deliveryData.brand?.employees)
      ? deliveryData.brand.employees.map((emp) => ({
          _id: emp?._id || null,
          fullName: emp?.fullName || null,
          email: emp?.email || null,
        }))
      : [];

    setDeliveryDetails(normalizedDeliveryData);
    setReviewLink(normalizedDeliveryData.reviewLink || '');
    setReviewDate(normalizedDeliveryData.reviewDate ? formatDateForInput(normalizedDeliveryData.reviewDate) : '');
    setAccountNo(normalizedDeliveryData.accountNo || '');
    setPassword(normalizedDeliveryData.password || '');
    setOriginalDeliveryDetails(JSON.parse(JSON.stringify(normalizedDeliveryData)));
    setBrandEmployees(employees);
    setLoading(false);
  } catch (err) {
    setError(err);
    setLoading(false);
    Swal.fire({
      title: 'Error!',
      text: 'Failed to load delivery details',
      icon: 'error',
      confirmButtonText: 'OK',
    });
  }
}, [id]);

// Add handlers for new fields
const handleReviewDateChange = (e) => {
  setReviewDate(e.target.value);
};

const handleAccountNoChange = (e) => {
  setAccountNo(e.target.value);
};

const handlePasswordChange = (e) => {
  setPassword(e.target.value);
};

  useEffect(() => {
    fetchDeliveryDetails();
  }, [fetchDeliveryDetails]);

  // Add handleReviewLinkChange
  const handleReviewLinkChange = (e) => {
    setReviewLink(e.target.value);
  };

  // Handlers (similar to previous implementation)
  const handleEmployeeChange = (event) => {
    const selectedEmployeeId = event.target.value;
    const selectedEmployee = brandEmployees.find(emp => emp._id === selectedEmployeeId);

    setDeliveryDetails(prev => ({
      ...prev,
      employee: {
        _id: selectedEmployee._id,
        name: selectedEmployee.fullName,
        email: selectedEmployee.email
      }
    }));
  };


  const getExpiryDisplay = (product) => {
    if (product.productInfo.noExpiry) {
      return "No Expiry";
    }
    return product.productInfo.expiry_date
      ? new Date(product.productInfo.expiry_date).toLocaleDateString()
      : "No Expiry";
  };

  const handleProductQuantityChange = (index, value) => {
    // Check for decimal/float values
    if (value.includes('.')) {
      setQuantityErrors(prev => ({
        ...prev,
        [index]: 'Decimal values are not allowed. Please enter whole numbers only.'
      }));
      return;
    }
    // Convert to integer and handle invalid inputs
    const intValue = parseInt(value, 10);
    if (isNaN(intValue)) return; // Don't update if value is not a valid integer

    const product = deliveryDetails.products[index];
    const originalProduct = originalDeliveryDetails.products[index];
    const consumedQuantity = extractConsumedQuantity(product.deliveryDetails.consumptionStatus);
    const numericValue = Number(value);
    const availableQuantity = product.deliveryDetails.availableQuantity || 0;
    const originalQuantity = originalProduct.deliveryDetails.quantity;

    let errorMessage = '';
    if (numericValue < consumedQuantity) {
      errorMessage = `Quantity cannot be less than ${consumedQuantity} (already consumed)`;
    } else if (numericValue > availableQuantity) {
      errorMessage = `Quantity cannot exceed available quantity of ${availableQuantity}`;
    }

    // Calculate quantity change
    const quantityChange = numericValue - originalQuantity;

    setQuantityErrors(prev => ({
      ...prev,
      [index]: errorMessage
    }));

    setQuantityChanges(prev => ({
      ...prev,
      [index]: {
        original: originalQuantity,
        current: numericValue,
        change: quantityChange
      }
    }));

    const updatedProducts = [...deliveryDetails.products];
    updatedProducts[index].deliveryDetails.quantity = value;

    setDeliveryDetails(prev => ({
      ...prev,
      products: updatedProducts
    }));
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const handleDeliveryDateChange = (value) => {
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part for accurate date comparison

    if (selectedDate < today) {
      Swal.fire({
        title: 'Invalid Date',
        text: 'Please select today or a future date',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return; // Don't update if date is in past
    }

    setDeliveryDetails(prev => ({
      ...prev,
      deliveryDate: value
    }));
  };


const handleSaveChanges = async () => {
  try {
    if (!deliveryDetails.employee._id) {
      throw new Error('Please select an employee');
    }

    // Validate quantities
    const quantityValidationErrors = deliveryDetails.products
      .map((product, index) => {
        const quantity = product.deliveryDetails.quantity;

        if (String(quantity).includes('.')) {
          return `${product.productInfo.name}: Decimal values are not allowed. Please enter whole numbers only.`;
        }

        const numericQuantity = Number(product.deliveryDetails.quantity);
        const availableQuantity = product.deliveryDetails.availableQuantity || 0;
        const consumedQuantity = extractConsumedQuantity(product.deliveryDetails.consumptionStatus);

        if (numericQuantity < consumedQuantity) {
          return `${product.productInfo.name}: Quantity cannot be less than ${consumedQuantity} (already consumed)`;
        }

        if (numericQuantity > availableQuantity) {
          return `${product.productInfo.name}: Quantity cannot exceed available quantity of ${availableQuantity}`;
        }

        return null;
      })
      .filter((error) => error !== null);

    if (quantityValidationErrors.length > 0) {
      throw new Error(quantityValidationErrors.join('\n'));
    }

    // Prepare FormData for file upload
    const formData = new FormData();
    formData.append('orderId', deliveryDetails.orderId);
    formData.append('employeeId', deliveryDetails.employee._id);
    formData.append('deliveryDate', new Date(deliveryDetails.deliveryDate).toISOString());
    formData.append('reviewLink', reviewLink); 
    formData.append('reviewDate', reviewDate ? new Date(reviewDate).toISOString() : '');
    formData.append('accountNo', accountNo);
    formData.append('password', password);
    
    // Include platform ID along with name and reviewEnabled status
    formData.append('platform', JSON.stringify({
      _id: deliveryDetails.platform._id, // Include the platform ID
      name: deliveryDetails.platform.name,
      reviewEnabled: deliveryDetails.platform.reviewEnabled,
    }));
    
    formData.append(
      'products',
      JSON.stringify(
        deliveryDetails.products.map((product) => {
          const originalProduct = originalDeliveryDetails.products.find(
            (orig) => orig.productInfo.productId === product.productInfo.productId
          );

          const originalQuantity = Number(originalProduct.deliveryDetails.quantity);
          const currentQuantity = Number(product.deliveryDetails.quantity);
          const quantityChange = currentQuantity - originalQuantity;

          return {
            productId: product.productInfo.productId,
            quantity: currentQuantity,
            quantityChange: quantityChange,
            quantityChangeReason:
              quantityChange > 0
                ? `increased_by_${Math.abs(quantityChange)}`
                : `decreased_by_${Math.abs(quantityChange)}`,
            consumptionStatus: product.deliveryDetails.consumptionStatus,
            deliveryStatus: product.deliveryDetails.deliveryStatus || 'delivered',
          };
        })
      )
    );

    // Append review screenshot file if it exists
    if (screenshotFile) {
      formData.append('reviewScreenshot', screenshotFile);
    }
    
    // Log FormData entries for debugging
    console.log('Submitting Form Data:', {
      orderId: deliveryDetails.orderId,
      employeeId: deliveryDetails.employee._id,
      deliveryDate: new Date(deliveryDetails.deliveryDate).toISOString(),
      platform: {
        _id: deliveryDetails.platform._id, // Include the platform ID in logging
        name: deliveryDetails.platform.name,
        reviewEnabled: deliveryDetails.platform.reviewEnabled,
      },
      reviewLink: reviewLink,
      reviewDate: reviewDate ? new Date(reviewDate).toISOString() : '',
      accountNo,
      password,
      products: deliveryDetails.products.map((product) => {
        const originalProduct = originalDeliveryDetails.products.find(
          (orig) => orig.productInfo.productId === product.productInfo.productId
        );

        const originalQuantity = Number(originalProduct.deliveryDetails.quantity);
        const currentQuantity = Number(product.deliveryDetails.quantity);
        const quantityChange = currentQuantity - originalQuantity;

        return {
          productId: product.productInfo.productId,
          quantity: currentQuantity,
          quantityChange: quantityChange,
          quantityChangeReason:
            quantityChange > 0
              ? `increased_by_${Math.abs(quantityChange)}`
              : `decreased_by_${Math.abs(quantityChange)}`,
          consumptionStatus: product.deliveryDetails.consumptionStatus,
          deliveryStatus: product.deliveryDetails.deliveryStatus || 'delivered',
        };
      }),
      reviewScreenshot: screenshotFile ? screenshotFile.name : 'No file',
    });

    // Log FormData entries for debugging
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    // Send request with FormData
    const response = await axios.put(
      `${config.apiurl}/delivery-products/update-delivery/${id}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    console.log('Response:', response.data);

    Swal.fire({
      title: 'Success!',
      text: 'Delivery details updated successfully',
      icon: 'success',
      confirmButtonText: 'OK',
    }).then(() => {
      navigate('/admin/product_delivered');
    });
  } catch (err) {
    console.error('Full Error Object:', err);
    console.error('Error Details:', err.response ? err.response.data : err.message);

    Swal.fire({
      title: 'Error!',
      text: err.message || 'Failed to update delivery',
      icon: 'error',
      confirmButtonText: 'OK',
    });

    console.error('Error saving changes:', err);
  }
};

  const extractConsumedQuantity = (consumptionStatus) => {
    const matches = consumptionStatus?.match(/^(\d+)_consumed$/);
    return matches ? Number(matches[1]) : 0;
  };

  const formatDateForInput = (dateString) => {
    return dateString ? new Date(dateString).toISOString().split('T')[0] : '';
  };

  if (loading) return (
    <Container maxWidth="sm">
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh'
      }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Loading Delivery Details
        </Typography>
        <CircularProgress />
      </Box>
    </Container>
  );

  if (error) return (
    <Container maxWidth="sm">
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center'
      }}>
        <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" color="error">
          Failed to Load Delivery Details
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Please try again or contact support
        </Typography>
      </Box>
    </Container>
  );

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/placeholder-image.jpg';
    const cleanPath = imagePath.startsWith('/uploads') ? imagePath.slice(8) : imagePath;
    const baseUrl = config.apiurl.replace('/api', '');
    return `${baseUrl}/uploads/${cleanPath}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <ModernPaper elevation={3}>
        <HeaderBox>
          <EditIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Edit Delivery Details
          </Typography>
        </HeaderBox>

        <Grid container spacing={3}>
          {/* Employee Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Assigned Employee</InputLabel>
              <Select
                value={deliveryDetails.employee._id}
                onChange={handleEmployeeChange}
                label="Assigned Employee"
                startAdornment={
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      mr: 2,
                      bgcolor: 'primary.light'
                    }}
                  >
                    {deliveryDetails.employee.name[0]}
                  </Avatar>
                }
              >
                {brandEmployees.map((employee) => (
                <MenuItem key={employee._id || 'unknown'} value={employee._id || ''}>
      {employee.fullName || 'Unknown Employee'}
    </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Delivery Date */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Delivery Date"
              type="date"
              value={formatDateForInput(deliveryDetails.deliveryDate)}
              onChange={(e) => handleDeliveryDateChange(e.target.value)}
              helperText={`Delivery date must be greater than order date and less than consumption date`}
              InputLabelProps={{
                shrink: true,
              }}
              variant="outlined"
              InputProps={{
                inputProps: {
                  min: getTodayDate() // Set minimum date to today
                }
              }}
            />

          </Grid>

          {/* Platform Name */}
        <Grid item xs={12} md={6}>
  <FormControl fullWidth variant="outlined">
    <InputLabel>Platform Name</InputLabel>
    <Select
      value={deliveryDetails.platform.name || ''}
      onChange={handlePlatformChange}
      label="Platform Name"
    >
      {platforms.map((platform) => (
        <MenuItem key={platform.id} value={platform.name}>
          {platform.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</Grid>

          <Grid item xs={12} md={6}>
  <TextField
    fullWidth
    label="Review Date"
    type="date"
    value={reviewDate}
    onChange={handleReviewDateChange}
    InputLabelProps={{ shrink: true }}
    variant="outlined"
  />
</Grid>
<Grid item xs={12} md={6}>
  <TextField
    fullWidth
    label="Account Number"
    value={accountNo}
    onChange={handleAccountNoChange}
    variant="outlined"
  />
</Grid>
<Grid item xs={12} md={6}>
  <TextField
    fullWidth
    label="Password"
    type="text"
    value={password}
    onChange={handlePasswordChange}
    variant="outlined"
  />
</Grid>

           <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Review Link"
                value={reviewLink}
                onChange={handleReviewLinkChange}
                variant="outlined"
              />
            </Grid>

          {/* Review Screenshot */}
          {/* Replace reviewEnabled condition */}
          <Grid item xs={12} md={6}>
            {deliveryDetails.platform.reviewEnabled ? (
              <Box>
                <TextField
                  fullWidth
                  label="Review Screenshot"
                  type="file"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ accept: 'image/*' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setScreenshotFile(file); // Store the actual file
                      setDeliveryDetails((prev) => ({
                        ...prev,
                        reviewScreenshot: URL.createObjectURL(file), // Temporary preview
                      }));
                      console.log('File Selected:', {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                      });
                    }
                  }}
                  variant="outlined"
                />
                {deliveryDetails.reviewScreenshot && (
                  <Box mt={2}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Preview:
                    </Typography>
                    <img
                      src={deliveryDetails.reviewScreenshot}
                      alt="Review Screenshot"
                      style={{ maxWidth: '100%', maxHeight: 100, borderRadius: 8 }}
                    />
                  </Box>
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="error">
                Review screenshot not required (Review disabled)
              </Typography>
            )}
          </Grid>
          {/* Product Details */}
          {deliveryDetails.products.map((product, index) => {
            const quantityChange = quantityChanges[index];

            return (
              <Grid item xs={12} key={product.productInfo.productId}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <ProductImage
                    src={getImageUrl(product.productInfo.image)}
                    alt={product.productInfo.name}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">
                      {product.productInfo.name}
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} md={4}>
                        <Chip
                          label={`Expiry: ${getExpiryDisplay(product)}`}
                          color="secondary"
                          variant="outlined"
                        />
                        {quantityChange && (
                          <Chip
                            icon={quantityChange.change > 0 ? <IncreaseIcon /> : <DecreaseIcon />}
                            label={`${quantityChange.change > 0 ? '+' : ''}${quantityChange.change}`}
                            color={quantityChange.change > 0 ? 'success' : 'error'}
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Grid>
                      <Grid item xs={12} md={8}>
                        <TextField
                          fullWidth
                          type="number"
                          label={`Quantity (Available: ${product.deliveryDetails.availableQuantity || 0})`}
                          value={product.deliveryDetails.quantity}
                          onChange={(e) => handleProductQuantityChange(index, e.target.value)}
                          error={!!quantityErrors[index]}
                          helperText={quantityErrors[index]}
                          variant="outlined"
                          inputProps={{
                            max: product.deliveryDetails.availableQuantity || 0
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Grid>
            );
          })}

        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveChanges}
            size="large"
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Save Changes
          </Button>
        </Box>
      </ModernPaper>
    </Container>
  );
}

export default ProductDeliveredEdit