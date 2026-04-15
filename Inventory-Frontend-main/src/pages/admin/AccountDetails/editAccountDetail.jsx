import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  useMediaQuery,
  CircularProgress,
  InputAdornment,
  useTheme,
} from '@mui/material';
import { 
  Save,
  CreditCard, 
  AccountBalanceWallet, 
  Phone, 
  CalendarToday,
  CreditCardOff,
  LocalAtm
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import Swal from 'sweetalert2';
import config from "@/config";
import { useParams, useNavigate } from 'react-router-dom';

// Styled components for enhanced visual appeal
const StyledCardHeader = styled(Box)(({ theme }) => ({
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(2),
  borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`
}));

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)',
  overflow: 'visible',
  '&:hover': {
    boxShadow: '0 8px 25px 0 rgba(0,0,0,0.15)',
    transition: 'box-shadow 0.3s ease-in-out'
  }
}));

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`account-tabpanel-${index}`}
      aria-labelledby={`account-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

// Main component
export function AccountDetailsEdit() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { id } = useParams();
  
  // State management
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formIsValid, setFormIsValid] = useState(false);
  
  // Initial form values
  const initialCardForm = {
    name: '',
    cardNumber: '',
    cardType: 'HDFC',
    expirationDate: '',
    cvv: '',
    phoneNumber: ''
  };

  const initialUpiForm = {
    name: '',
    upiId: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    phoneNumber: ''
  };

  // Form states
  const [cardForm, setCardForm] = useState(initialCardForm);
  const [upiForm, setUpiForm] = useState(initialUpiForm);

  // Form errors
  const [cardErrors, setCardErrors] = useState({});
  const [upiErrors, setUpiErrors] = useState({});

  // Fetch account details by ID
  useEffect(() => {
    console.log("Fetching account details for ID:", id);
    const fetchAccountDetails = async () => {
      try {
        const response = await fetch(`${config.apiurl}/payment/get-account-detail/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch account details');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          const accountData = result.data;
          
          // Set tab value based on payment type
          if (accountData.paymentType === 'card') {
            setTabValue(0);
            setCardForm({
              name: accountData.name || '',
              cardNumber: accountData.cardDetails?.cardNumber || '',
              cardType: accountData.cardDetails?.cardType || 'HDFC',
              expirationDate: accountData.cardDetails?.expirationDate || '',
              cvv: accountData.cardDetails?.cvv || '',
              phoneNumber: accountData.phoneNumber || ''
            });
          } else if (accountData.paymentType === 'upi') {
            setTabValue(1);
            setUpiForm({
              name: accountData.name || '',
              upiId: accountData.upiDetails?.upiId || '',
              bankName: accountData.upiDetails?.bankName || '',
              accountNumber: accountData.upiDetails?.accountNumber || '',
              ifscCode: accountData.upiDetails?.ifscCode || '',
              phoneNumber: accountData.phoneNumber || ''
            });
          }
        }
      } catch (error) {
        console.error("Error fetching account details:", error);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to fetch account details',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#d33'
        });
      } finally {
        setFetchLoading(false);
      }
    };
    
    fetchAccountDetails();
  }, [id]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Reset form validation
    validateForm();
  };

  // Form validation
  useEffect(() => {
    validateForm();
  }, [cardForm, upiForm, tabValue]);

  const validateForm = () => {
    if (tabValue === 0) {
      // Card form validation
      const newErrors = {};
      
      if (!cardForm.name) newErrors.name = 'Name is required';
      
    if (!cardForm.cardNumber) {
      newErrors.cardNumber = 'Card number is required';
    } else {
      // Remove spaces for validation
      const digitsOnly = cardForm.cardNumber.replace(/\s/g, '');
      // Check if card number has valid length (13, 14, 15, 16, or 19 digits)
      if (!/^\d{13}$|^\d{14}$|^\d{15}$|^\d{16}$|^\d{19}$/.test(digitsOnly)) {
        newErrors.cardNumber = 'Card number must be 13, 14, 15, 16, or 19 digits';
      }
    }
      
      if (!cardForm.expirationDate) {
        newErrors.expirationDate = 'Expiration date is required';
      } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardForm.expirationDate)) {
        newErrors.expirationDate = 'Use MM/YY format';
      }
      
      if (!cardForm.cvv) {
        newErrors.cvv = 'CVV is required';
      } else if (!/^\d{3,4}$/.test(cardForm.cvv)) {
        newErrors.cvv = 'CVV must be 3-4 digits';
      }
      
      if (!cardForm.phoneNumber) {
        newErrors.phoneNumber = 'Phone number is required';
      } else if (!/^[\d\(\)\-\+\s]{10,15}$/.test(cardForm.phoneNumber)) {
        newErrors.phoneNumber = 'Invalid phone number';
      }
      
      setCardErrors(newErrors);
      setFormIsValid(Object.keys(newErrors).length === 0);
    } else {
      // UPI form validation
      const newErrors = {};
      
      if (!upiForm.name) newErrors.name = 'Name is required';
      
      if (!upiForm.upiId) {
        newErrors.upiId = 'UPI ID is required';
      } else if (!upiForm.upiId.includes('@')) {
        newErrors.upiId = 'UPI ID must include @ symbol';
      }
      
      if (!upiForm.phoneNumber) {
        newErrors.phoneNumber = 'Phone number is required';
      } else if (!/^[\d\(\)\-\+\s]{10,15}$/.test(upiForm.phoneNumber)) {
        newErrors.phoneNumber = 'Invalid phone number';
      }
      
      setUpiErrors(newErrors);
      setFormIsValid(Object.keys(newErrors).length === 0);
    }
  };

  // Format card number with spaces
const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, '');
  const groups = [];
  
  // Get only valid number of digits (max 19)
  const validDigits = digits.slice(0, 19);
  
  // Format based on card length
  for (let i = 0; i < validDigits.length; i += 4) {
    groups.push(validDigits.slice(i, i + 4));
  }
  
  return groups.join(' ');
};

  // Handle form input changes
  const handleCardFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cardNumber') {
      setCardForm(prev => ({ ...prev, [name]: formatCardNumber(value) }));
    } else {
      setCardForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUpiFormChange = (e) => {
    const { name, value } = e.target;
    setUpiForm(prev => ({ ...prev, [name]: value }));
  };

  // Update form submission
  const handleUpdateForm = async () => {
    if (!formIsValid) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare the data based on the active tab
      let paymentData;
      
      if (tabValue === 0) {
        // Card form data
        paymentData = {
          name: cardForm.name,
          paymentType: 'card',
          phoneNumber: cardForm.phoneNumber,
          cardDetails: {
            cardNumber: cardForm.cardNumber,
            cardType: cardForm.cardType,
            expirationDate: cardForm.expirationDate,
            cvv: cardForm.cvv
          }
        };
      } else {
        // UPI form data
        paymentData = {
          name: upiForm.name,
          paymentType: 'upi',
          phoneNumber: upiForm.phoneNumber,
          upiDetails: {
            upiId: upiForm.upiId,
            bankName: upiForm.bankName,
            accountNumber: upiForm.accountNumber,
            ifscCode: upiForm.ifscCode
          }
        };
      }
      
      // Make API call to backend
      const response = await fetch(`${config.apiurl}/payment/update-account-details/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json', 
        },
        body: JSON.stringify(paymentData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Something went wrong');
      }
      
      // Success handling
      console.log("Payment details updated successfully:", result);
      
      // Show success Sweet Alert with navigation after confirmation
      Swal.fire({
        title: 'Success!',
        text: 'Payment details updated successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6'
      }).then((result) => {
        if (result.isConfirmed || result.dismiss === Swal.DismissReason.backdrop || result.dismiss === Swal.DismissReason.timer) {
          // Navigate to manage page after user clicks OK or alert is dismissed
          navigate('/admin/account-details/manage-accounts');
        }
      });
    } catch (error) {
      console.error("Error updating payment details:", error);
      
      // Show error Sweet Alert
      Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to update payment details',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Container maxWidth="xl" sx={{ my: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ my: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography 
          variant="h4" 
          component="h1" 
          align="center" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            color: theme.palette.primary.main,
            mb: 1
          }}
        >
          Edit Payment Account
        </Typography>
      </Box>

      <StyledCard>
        <StyledCardHeader>
          <Typography variant="h6" component="div">
            {tabValue === 0 ? 'Edit Credit/Debit Card' : 'Edit UPI Account'}
          </Typography>
        </StyledCardHeader>
        
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="account tabs"
              variant={isMobile ? "fullWidth" : "standard"}
              centered={!isMobile}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab 
                label={isMobile ? "Card" : "Credit/Debit Card"} 
                icon={<CreditCard />}
                iconPosition="start"
              />
              <Tab 
                label={isMobile ? "UPI" : "UPI Account"} 
                icon={<AccountBalanceWallet />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Card Form */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={cardForm.name}
                  onChange={handleCardFormChange}
                  required
                  error={!!cardErrors.name}
                  helperText={cardErrors.name}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Card Number"
                  name="cardNumber"
                  value={cardForm.cardNumber}
                  onChange={handleCardFormChange}
                  placeholder="XXXX XXXX XXXX XXXX"
                  required
                  error={!!cardErrors.cardNumber}
                  helperText={cardErrors.cardNumber}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CreditCard color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel id="card-type-label">Card Type</InputLabel>
                  <Select
                    labelId="card-type-label"
                    name="cardType"
                    value={cardForm.cardType}
                    onChange={handleCardFormChange}
                    label="Card Type"
                  >
                    <MenuItem value="HDFC">HDFC</MenuItem>
                    <MenuItem value="ICICI Bank Mx">ICICI Bank Mx</MenuItem>
                    <MenuItem value="ICICI Bank">ICICI Bank</MenuItem>
                    <MenuItem value="Induslnd Bank">Induslnd Bank</MenuItem>
                    <MenuItem value="Axis">Axis</MenuItem>
                    <MenuItem value="Tide">Tide</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Expiration Date"
                  name="expirationDate"
                  value={cardForm.expirationDate}
                  onChange={handleCardFormChange}
                  placeholder="MM/YY"
                  required
                  error={!!cardErrors.expirationDate}
                  helperText={cardErrors.expirationDate}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="CVV"
                  name="cvv"
                  value={cardForm.cvv}
                  onChange={handleCardFormChange}
                  placeholder="XXX"
                  required
                  error={!!cardErrors.cvv}
                  helperText={cardErrors.cvv}
                  type="password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CreditCardOff color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phoneNumber"
                  value={cardForm.phoneNumber}
                  onChange={handleCardFormChange}
                  placeholder="(XXX) XXX-XXXX"
                  required
                  error={!!cardErrors.phoneNumber}
                  helperText={cardErrors.phoneNumber}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* UPI Form */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={upiForm.name}
                  onChange={handleUpiFormChange}
                  required
                  error={!!upiErrors.name}
                  helperText={upiErrors.name}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="UPI ID"
                  name="upiId"
                  value={upiForm.upiId}
                  onChange={handleUpiFormChange}
                  placeholder="username@provider"
                  required
                  error={!!upiErrors.upiId}
                  helperText={upiErrors.upiId}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocalAtm color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Bank Name"
                  name="bankName"
                  value={upiForm.bankName}
                  onChange={handleUpiFormChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountBalanceWallet color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Account Number"
                  name="accountNumber"
                  value={upiForm.accountNumber}
                  onChange={handleUpiFormChange}
                  type="password"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="IFSC Code"
                  name="ifscCode"
                  value={upiForm.ifscCode}
                  onChange={handleUpiFormChange}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phoneNumber"
                  value={upiForm.phoneNumber}
                  onChange={handleUpiFormChange}
                  required
                  error={!!upiErrors.phoneNumber}
                  helperText={upiErrors.phoneNumber}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Form Actions */}
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                variant="outlined"
                onClick={() => navigate('/admin/account-details/manage-accounts')}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleUpdateForm}
                disabled={isLoading || !formIsValid}
                startIcon={isLoading ? <CircularProgress size={20} /> : <Save />}
              >
                {isLoading ? 'Updating...' : 'Update Payment Details'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </StyledCard>
    </Container>
  );
}

export default AccountDetailsEdit;