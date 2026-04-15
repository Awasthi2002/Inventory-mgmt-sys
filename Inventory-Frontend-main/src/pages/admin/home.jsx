import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Paper, Chip, Divider, TextField,
  Select, MenuItem, FormControl, InputLabel, Avatar, Button, InputAdornment,
  IconButton, CircularProgress, Alert, Tabs, Tab, useTheme, alpha
} from '@mui/material';
import Swal from 'sweetalert2';
import {
  FilterList, Search, Inventory, ShoppingCart, LocalShipping, CheckCircle,
   Clear, Store, Category, BarChart, Timeline
} from '@mui/icons-material';
import config from '@/config';
import { format, subMonths } from 'date-fns';

export function Home() {
  const theme = useTheme();

  // State for data
  const [brandsData, setBrandsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noDataMessage, setNoDataMessage] = useState('');

  // States for selection and filters
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [activeTab, setActiveTab] = useState(0);
const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Reference for intersection observer
  const observerRef = useRef(null);
  const loadingRef = useRef(null);

  // Fetch initial brand list (only brandId and brandName)
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.apiurl}/brands/get_all_inventory_list`);
        // console.log('Fetching brands from:', `${config.apiurl}/brands/get_all_inventory_list`);
        // console.log('Response status:', response.status);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        // Map to only include _id and brandName
        const formattedBrands = data.data.map(brand => ({
          _id: brand._id,
          brandName: brand.brandName,
          products: [], // Initialize empty products array
          stats: {} // Initialize empty stats object
        }));
        setBrandsData(formattedBrands);

        if (formattedBrands.length > 0) {
          setSelectedBrandId(formattedBrands[0]._id);
        }

        setHasMore(data.hasNextPage || false);
        setCurrentPage(1);
        setError(null);
      } catch (err) {
        console.error('Error fetching brands:', err);
        setError('Failed to load brand data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  // Fetch brand data with filters
useEffect(() => {
  if (!selectedBrandId) return;
  console.log('Fetching brand data for:', selectedBrandId);
  console.log('Date range:', startDate, endDate);

  const fetchBrandData = async () => {
    try {
      setLoading(true);
      const params = {
        brandId: selectedBrandId,
        startDate: startDate,
        endDate: endDate
      };

      if (new Date(endDate) < new Date(startDate)) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Date Range',
          text: 'End date cannot be before start date.',
          confirmButtonColor: '#3085d6',
        });
        setBrandsData(prev =>
          prev.map(brand =>
            brand._id === selectedBrandId
              ? { ...brand, products: [], stats: {} }
              : brand
          )
        );
        setNoDataMessage(''); // Reset message on invalid date range
        setLoading(false);
        return;
      }

      const response = await fetch(`${config.apiurl}/brands/get-stauts-product?${new URLSearchParams(params)}`);
      console.log('API URL:', `${config.apiurl}/brands/get-stauts-product?${new URLSearchParams(params)}`);
      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        Swal.fire({
          icon: 'info',
          title: 'No Data',
          text: data.message || 'No product orders found for this brand within the specified date range',
          confirmButtonColor: '#3085d6',
        });
        setBrandsData(prev =>
          prev.map(brand =>
            brand._id === selectedBrandId
              ? { ...brand, products: [], stats: {} }
              : brand
          )
        );
        setNoDataMessage(data.message || 'No product orders found for this brand within the specified date range'); // Set API message
        setHasMore(false);
        setLoading(false);
        return;
      }

      console.log('Fetched brand data:', data);
      setBrandsData(prev =>
        prev.map(brand =>
          brand._id === selectedBrandId
            ? { ...brand, products: data.products || [], stats: data.stats || {} }
            : brand
        )
      );
      setNoDataMessage(''); // Clear message when data is found
      setHasMore(data.hasNextPage || false);
      setError(null);
    } catch (err) {
      console.error('Error fetching brand data:', err);
      setBrandsData(prev =>
        prev.map(brand =>
          brand._id === selectedBrandId
            ? { ...brand, products: [], stats: {} }
            : brand
        )
      );
        setNoDataMessage(data.message || 'No product orders found for this brand within the specified date range'); // Set API message
        console.log
    } finally {
      setLoading(false);
    }
  };

  fetchBrandData();
}, [selectedBrandId, startDate, endDate]);

 

  // Setup Intersection Observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !isLoadingMore) {
          fetchMoreData();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current = observer;

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, isLoadingMore, currentPage, selectedBrandId, startDate, endDate]);

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Get selected brand data
  const selectedBrand = brandsData.find(brand => brand._id === selectedBrandId) || null;

  // Get all products for the selected brand
  const allProducts = selectedBrand?.products || [];

  // Get selected product details
  const selectedProduct = selectedProductId
    ? allProducts.find(product => product.productId === selectedProductId)
    : null;

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return allProducts
      .filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'name') {
          return sortOrder === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name); // Fixed typo: b.name.localeCompare(b.name) to b.name.localeCompare(a.name)
        } else if (sortBy === 'ordered') {
          return sortOrder === 'asc'
            ? a.ordered - b.ordered
            : b.ordered - a.ordered;
        } else if (sortBy === 'date') {
          return sortOrder === 'asc'
            ? new Date(a.lastOrderDate) - new Date(b.lastOrderDate)
            : new Date(b.lastOrderDate) - new Date(a.lastOrderDate);
        }
        return 0;
      });
  }, [allProducts, searchTerm, sortBy, sortOrder]);

  const clearFilters = () => {
    setSearchTerm('');
    setSortBy('name');
    setSortOrder('asc');
    setSelectedProductId('');
setStartDate(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  setEndDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleBrandChange = (event) => {
    setSelectedBrandId(event.target.value);
    setSelectedProductId('');
    clearFilters();
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        bgcolor: alpha(theme.palette.primary.main, 0.03)
      }}>
        <CircularProgress color="primary" />
        <Typography sx={{ ml: 2, fontWeight: 'medium' }}>Loading brand data...</Typography>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" variant="filled">{error}</Alert>
      </Box>
    );
  }

  // If no data
  if (!brandsData || brandsData.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info" variant="filled">No brand data available.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{
      p: 2,
      bgcolor: alpha(theme.palette.primary.main, 0.03),
      minHeight: '100vh'
    }}>
      {/* Compact Header with Brand Selection and Date Filters */}
      <Card
        elevation={3}
        sx={{
          mb: 2,
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Store sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h5" component="h1" fontWeight="bold">
                  Brand Dashboard
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" variant="outlined" sx={{ minWidth: 300, background: alpha('#fff', 0.1), borderRadius: 1 }}>
                  <InputLabel id="brand-select-label" sx={{ color: 'white' }}>Select Brand</InputLabel>
                  <Select
                    labelId="brand-select-label"
                    id="brand-select"
                    value={selectedBrandId}
                    onChange={handleBrandChange}
                    label="Select Brand"
                    sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.3) } }}
                  >
                    {brandsData.map((brand) => (
                      <MenuItem key={brand._id} value={brand._id}>{brand.brandName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true, style: { color: 'white' } }}
                  InputProps={{
                    style: { color: 'white' },
                    sx: { background: alpha('#fff', 0.1), '.MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.3) } }
                  }}
                  size="small"
                />
                <TextField
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true, style: { color: 'white' } }}
                  InputProps={{
                    style: { color: 'white' },
                    sx: { background: alpha('#fff', 0.1), '.MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.3) } }
                  }}
                  size="small"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Loading indicator and observer reference */}
      <div ref={loadingRef} className="loading-indicator" style={{ height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {isLoadingMore && <CircularProgress size={24} />}
        {!hasMore && brandsData.length > 0 && <Typography variant="body2">No more data to load</Typography>}
      </div>

      {selectedBrand && (
        <>
        {/* Add the no-data message here */}
     {selectedBrand && selectedBrand.products.length === 0 && !selectedProduct && (
  <Box sx={{ p: 3, textAlign: 'center', bgcolor: alpha(theme.palette.warning.main, 0.2), borderRadius: '38px',mb:2 }}>
    <Typography variant="body1" >
      {noDataMessage || 'No product orders found for this brand within the specified date range.'}
    </Typography>
  </Box>
)}
          {/* Brand Stats Cards with Gradient Design */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  height: '100%',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 100%)`,
                  color: 'white',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', opacity: 0.9 }}>
                  <Inventory fontSize="small" sx={{ mr: 0.5 }} />
                  Total Products
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold', letterSpacing: 0.5 }}>
                  {selectedBrand.stats?.totalProducts || 0}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  height: '100%',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 30%, ${theme.palette.success.dark} 100%)`,
                  color: 'white',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', opacity: 0.9 }}>
                  <ShoppingCart fontSize="small" sx={{ mr: 0.5 }} />
                  Total Ordered
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold', letterSpacing: 0.5 }}>
                  {selectedBrand.stats?.totalOrdered || 0}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  height: '100%',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${theme.palette.info.light} 0%, ${theme.palette.info.main} 30%, ${theme.palette.info.dark} 100%)`,
                  color: 'white',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', opacity: 0.9 }}>
                  <LocalShipping fontSize="small" sx={{ mr: 0.5 }} />
                  Total Delivered
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold', letterSpacing: 0.5 }}>
                  {selectedBrand.stats?.totalDelivered || 0}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  height: '100%',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${theme.palette.warning.light} 0%, ${theme.palette.warning.main} 30%, ${theme.palette.warning.dark} 100%)`,
                  color: 'white',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', opacity: 0.9 }}>
                  <CheckCircle fontSize="small" sx={{ mr: 0.5 }} />
                  Total Consumed
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold', letterSpacing: 0.5 }}>
                  {selectedBrand.stats?.totalConsumed || 0}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Timeline Card with Gradient Header */}
          <Paper
            elevation={3}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: '12px',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden'
            }}
          >
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2,
              p: 1.5,
              background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
              borderRadius: '12px 12px 0 0',
              color: 'white'
            }}>
              <Timeline sx={{ mr: 1, fontSize: 24 }} />
              <Typography variant="h6" fontWeight="bold">Timeline</Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'scale(1.02)' }
                }}>
                  <Typography variant="body2" color="text.secondary">First Order</Typography>
                  <Typography variant="body1" fontWeight="medium">{formatDate(selectedBrand.stats?.oldestOrder)}</Typography>
                </Box>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'scale(1.02)' }
                }}>
                  <Typography variant="body2" color="text.secondary">Latest Order</Typography>
                  <Typography variant="body1" fontWeight="medium">{formatDate(selectedBrand.stats?.newestOrder)}</Typography>
                </Box>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'scale(1.02)' }
                }}>
                  <Typography variant="body2" color="text.secondary">First Delivery</Typography>
                  <Typography variant="body1" fontWeight="medium">{formatDate(selectedBrand.stats?.oldestDelivery)}</Typography>
                </Box>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'scale(1.02)' }
                }}>
                  <Typography variant="body2" color="text.secondary">Latest Delivery</Typography>
                  <Typography variant="body1" fontWeight="medium">{formatDate(selectedBrand.stats?.newestDelivery)}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Combined Product Selection, Search and Filter */}
          <Paper elevation={3} sx={{ borderRadius: '12px', overflow: 'hidden', mb: 2, boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)' }}>
            <Box sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              borderBottom: `1px solid ${theme.palette.divider}`,
              background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
              color: 'white'
            }}>
              <Category sx={{ mr: 1, fontSize: 24 }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Products
              </Typography>

              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Search products..."
                  variant="outlined"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ mr: 1, width: { xs: '130px', sm: '200px' }, background: alpha('#fff', 0.1), '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.3) } }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'white' }} /></InputAdornment>,
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setSearchTerm('')} size="small">
                          <Clear fontSize="small" sx={{ color: 'white' }} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  inputProps={{ style: { color: 'white' } }}
                />

                <FormControl size="small" variant="outlined" sx={{ mr: 1, minWidth: '120px', background: alpha('#fff', 0.1) }}>
                  <Select
                    displayEmpty
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.3) } }}
                  >
                    <MenuItem value="">All Products</MenuItem>
                    {allProducts.map((product) => (
                      <MenuItem key={product.productId} value={product.productId}>
                        {product.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" variant="outlined" sx={{ minWidth: '120px', background: alpha('#fff', 0.1) }}>
                  <Select
                    displayEmpty
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    startAdornment={<FilterList fontSize="small" sx={{ mr: 0.5, color: 'white' }} />}
                    sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.3) } }}
                  >
                    <MenuItem value="name">Sort by Name</MenuItem>
                    <MenuItem value="ordered">Sort by Ordered</MenuItem>
                    <MenuItem value="date">Sort by Date</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Product Cards Grid View */}
            <Box sx={{ p: 2 }}>
              {selectedProduct ? (
                // Selected Product Detail View
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar
                      src={`${config.baseUrl}${selectedProduct.image}`}
                      alt={selectedProduct.name}
                      variant="rounded"
                      sx={{ width: 64, height: 64, mr: 2, borderRadius: '8px' }}
                    />
                    <Box>
                      <Typography variant="h6" fontWeight="bold">{selectedProduct.name}</Typography>
                      <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                          size="small"
                          label={`Unit: ${selectedProduct.unit}`}
                          color="primary"
                          sx={{ fontWeight: 'medium' }}
                        />
                        {selectedProduct.noExpiry ? (
                          <Chip
                            size="small"
                            label="No Expiry"
                            color="success"
                            sx={{ fontWeight: 'medium' }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label={`Expires: ${formatDate(selectedProduct.expiry_date)}`}
                            color="warning"
                            sx={{ fontWeight: 'medium' }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Clear />}
                      onClick={() => setSelectedProductId('')}
                      sx={{ ml: 'auto', borderColor: alpha(theme.palette.primary.main, 0.5), color: theme.palette.primary.main }}
                    >
                      Back to List
                    </Button>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Tabs
                    value={activeTab}
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    variant="fullWidth"
                    sx={{ mb: 2 }}
                    textColor="primary"
                    indicatorColor="primary"
                  >
                    <Tab label="Overview" icon={<BarChart fontSize="small" />} iconPosition="start" />
                    <Tab label="Activity" icon={<Timeline fontSize="small" />} iconPosition="start" />
                    <Tab label="Analytics" icon={<BarChart fontSize="small" />} iconPosition="start" />
                  </Tabs>

                  {activeTab === 0 ? (
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Paper
                          elevation={3}
                          sx={{
                            p: 2,
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                            transition: 'transform 0.3s ease',
                            '&:hover': { transform: 'scale(1.02)' }
                          }}
                        >
                          <Typography variant="subtitle1" color="primary" fontWeight="bold" gutterBottom>
                            Product Statistics
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">Ordered</Typography>
                              <Typography variant="h6" fontWeight="bold">{selectedProduct.ordered}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">Delivered</Typography>
                              <Typography variant="h6" fontWeight="bold">{selectedProduct.delivered}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">Consumed</Typography>
                              <Typography variant="h6" fontWeight="bold">{selectedProduct.consumed}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">Remaining</Typography>
                              <Typography variant="h6" fontWeight="bold">{selectedProduct.remaining}</Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Paper
                          elevation={3}
                          sx={{
                            p: 2,
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                            transition: 'transform 0.3s ease',
                            '&:hover': { transform: 'scale(1.02)' }
                          }}
                        >
                          <Typography variant="subtitle1" color="primary" fontWeight="bold" gutterBottom>
                            Order Status
                          </Typography>
                          <Grid container spacing={2}>
                            {Object.entries(selectedProduct.orderStatus || {}).map(([key, value]) => (
                              <Grid item xs={4} key={key}>
                                <Typography variant="body2" color="text.secondary">
                                  {key.charAt(0).toUpperCase() + key.slice(1)}
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">{value}</Typography>
                              </Grid>
                            ))}
                          </Grid>

                          <Typography variant="subtitle1" color="primary" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>
                            Delivery Status
                          </Typography>
                          <Grid container spacing={2}>
                            {Object.entries(selectedProduct.deliveryStatus || {}).map(([key, value]) => (
                              <Grid item xs={4} key={key}>
                                <Typography variant="body2" color="text.secondary">
                                  {key.charAt(0).toUpperCase() + key.slice(1)}
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">{value}</Typography>
                              </Grid>
                            ))}
                          </Grid>
                        </Paper>
                      </Grid>
                    </Grid>
                  ) : activeTab === 1 ? (
                    <Paper
                      elevation={3}
                      sx={{
                        p: 2,
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                        transition: 'transform 0.3s ease',
                        '&:hover': { transform: 'scale(1.02)' }
                      }}
                    >
                      <Typography variant="subtitle1" color="primary" fontWeight="bold" gutterBottom>
                        Latest Activity
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{
                            p: 1.5,
                            borderRadius: '8px',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.success.light, 0.2)} 0%, ${alpha(theme.palette.success.main, 0.1)} 100%)`,
                            transition: 'transform 0.3s ease',
                            '&:hover': { transform: 'scale(1.02)' }
                          }}>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <ShoppingCart fontSize="small" sx={{ mr: 0.5 }} /> Last Order
                            </Typography>
                            <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.5 }}>
                              {formatDate(selectedProduct.lastOrderDate)}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.secondary }}>
                              By: {selectedProduct.lastOrderEmployee?.fullName || 'N/A'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <Box sx={{
                            p: 1.5,
                            borderRadius: '8px',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.2)} 0%, ${alpha(theme.palette.info.main, 0.1)} 100%)`,
                            transition: 'transform 0.3s ease',
                            '&:hover': { transform: 'scale(1.02)' }
                          }}>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <LocalShipping fontSize="small" sx={{ mr: 0.5 }} /> Last Delivery
                            </Typography>
                            <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.5 }}>
                              {formatDate(selectedProduct.lastDeliveryDate)}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.secondary }}>
                              By: {selectedProduct.lastDeliveryEmployee?.fullName || 'N/A'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <Box sx={{
                            p: 1.5,
                            borderRadius: '8px',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.light, 0.2)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`,
                            transition: 'transform 0.3s ease',
                            '&:hover': { transform: 'scale(1.02)' }
                          }}>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <CheckCircle fontSize="small" sx={{ mr: 0.5 }} /> Last Consumption
                            </Typography>
                            <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.5 }}>
                              {formatDate(selectedProduct.lastConsumptionDate)}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.secondary }}>
                              By: {selectedProduct.lastConsumptionEmployee?.fullName || 'N/A'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  ) : (
                    <Paper
                      elevation={3}
                      sx={{
                        p: 2,
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                        transition: 'transform 0.3s ease',
                        '&:hover': { transform: 'scale(1.02)' }
                      }}
                    >
                      <Typography variant="subtitle1" color="primary" fontWeight="bold" gutterBottom>
                        Product Analytics
                      </Typography>
                      <Grid container spacing={2}>
                        {/* Product Orders Analytics */}
                        <Grid item xs={12} sm={4}>
                          <Box sx={{
                            p: 1.5,
                            borderRadius: '8px',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.success.light, 0.2)} 0%, ${alpha(theme.palette.success.main, 0.1)} 100%)`,
                            transition: 'transform 0.3s ease',
                            '&:hover': { transform: 'scale(1.02)' }
                          }}>
                            <Typography variant="subtitle1" color="success.main" fontWeight="bold" gutterBottom>
                              <ShoppingCart fontSize="small" sx={{ mr: 0.5 }} /> Orders
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Total Quantity: {selectedProduct.dateWiseAnalytics?.orders?.totalQuantity || 0}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Total Entries: {selectedProduct.dateWiseAnalytics?.orders?.totalEntries || 0}</Typography>
                            <Divider sx={{ my: 1 }} />
                            {Object.entries(selectedProduct.dateWiseAnalytics?.orders?.byDate || {}).length > 0 ? (
                              Object.entries(selectedProduct.dateWiseAnalytics?.orders?.byDate).map(([date, stats]) => (
                                <Box key={date} sx={{ p: 1, borderRadius: '6px', bgcolor: 'white', mb: 1 }}>
                                  <Typography variant="body2" fontWeight="bold">{formatDate(date)}</Typography>
                                  <Typography variant="body2" color="text.secondary">Quantity: {stats.quantity}</Typography>
                                  <Typography variant="body2" color="text.secondary">Entries: {stats.entries}</Typography>
                                </Box>
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary">No order data available</Typography>
                            )}
                          </Box>
                        </Grid>

                        {/* Product Deliveries Analytics */}
                        <Grid item xs={12} sm={4}>
                          <Box sx={{
                            p: 1.5,
                            borderRadius: '8px',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.2)} 0%, ${alpha(theme.palette.info.main, 0.1)} 100%)`,
                            transition: 'transform 0.3s ease',
                            '&:hover': { transform: 'scale(1.02)' }
                          }}>
                            <Typography variant="subtitle1" color="info.main" fontWeight="bold" gutterBottom>
                              <LocalShipping fontSize="small" sx={{ mr: 0.5 }} /> Deliveries
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Total Quantity: {selectedProduct.dateWiseAnalytics?.deliveries?.totalQuantity || 0}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Total Entries: {selectedProduct.dateWiseAnalytics?.deliveries?.totalEntries || 0}</Typography>
                            <Divider sx={{ my: 1 }} />
                            {Object.entries(selectedProduct.dateWiseAnalytics?.deliveries?.byDate || {}).length > 0 ? (
                              Object.entries(selectedProduct.dateWiseAnalytics?.deliveries?.byDate).map(([date, stats]) => (
                                <Box key={date} sx={{ p: 1, borderRadius: '6px', bgcolor: 'white', mb: 1 }}>
                                  <Typography variant="body2" fontWeight="bold">{formatDate(date)}</Typography>
                                  <Typography variant="body2" color="text.secondary">Quantity: {stats.quantity}</Typography>
                                  <Typography variant="body2" color="text.secondary">Entries: {stats.entries}</Typography>
                                </Box>
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary">No delivery data available</Typography>
                            )}
                          </Box>
                        </Grid>

                        {/* Product Consumption Analytics */}
                        <Grid item xs={12} sm={4}>
                          <Box sx={{
                            p: 1.5,
                            borderRadius: '8px',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.light, 0.2)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`,
                            transition: 'transform 0.3s ease',
                            '&:hover': { transform: 'scale(1.02)' }
                          }}>
                            <Typography variant="subtitle1" color="warning.main" fontWeight="bold" gutterBottom>
                              <CheckCircle fontSize="small" sx={{ mr: 0.5 }} /> Consumption
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Total Quantity: {selectedProduct.dateWiseAnalytics?.consumption?.totalQuantity || 0}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Total Entries: {selectedProduct.dateWiseAnalytics?.consumption?.totalEntries || 0}</Typography>
                            <Divider sx={{ my: 1 }} />
                            {Object.entries(selectedProduct.dateWiseAnalytics?.consumption?.byDate || {}).length > 0 ? (
                              Object.entries(selectedProduct.dateWiseAnalytics?.consumption?.byDate).map(([date, stats]) => (
                                <Box key={date} sx={{ p: 1, borderRadius: '6px', bgcolor: 'white', mb: 1 }}>
                                  <Typography variant="body2" fontWeight="bold">{formatDate(date)}</Typography>
                                  <Typography variant="body2" color="text.secondary">Quantity: {stats.quantity}</Typography>
                                  <Typography variant="body2" color="text.secondary">Entries: {stats.entries}</Typography>
                                </Box>
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary">No consumption data available</Typography>
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  )}
                </Box>
              ) : (
                // Product Grid View
                <Grid container spacing={2}>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={product.productId}>
                        <Paper
                          elevation={3}
                          sx={{
                            p: 1.5,
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, ${alpha(theme.palette.grey[100], 0.9)} 0%, ${alpha(theme.palette.grey[200], 0.7)} 100%)`,
                            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-5px)',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.3)} 0%, ${alpha(theme.palette.primary.main, 0.2)} 100%)`
                            },
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                          onClick={() => setSelectedProductId(product.productId)}
                        >
                          <Box sx={{ display: 'flex', mb: 1.5 }}>
                            <Avatar
                              src={`${config.baseUrl}${product.image}`}
                              alt={product.name}
                              variant="rounded"
                              sx={{ width: 48, height: 48, mr: 1.5, borderRadius: '8px' }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle1" noWrap fontWeight="bold">
                                {product.name}
                              </Typography>
                              <Chip
                                size="small"
                                label={`Unit: ${product.unit}`}
                                sx={{ mt: 0.5, fontWeight: 'medium' }}
                                variant="outlined"
                              />
                            </Box>
                          </Box>

                          <Divider sx={{ my: 1 }} />

                          <Box sx={{ flex: 1 }}>
                            <Grid container spacing={1}>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  <ShoppingCart fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                                  Ordered
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">{product.ordered}</Typography>
                              </Grid>

                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  <LocalShipping fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                                  Delivered
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">{product.delivered}</Typography>
                              </Grid>

                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  <CheckCircle fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                                  Consumed
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">{product.consumed}</Typography>
                              </Grid>

                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  <Inventory fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                                  Remaining
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">{product.remaining}</Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </Paper>
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}>
                      <Box sx={{ p: 3, textAlign: 'center', bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: '8px' }}>
                        <Typography variant="body1">No products match your search criteria.</Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Clear />}
                          onClick={clearFilters}
                          sx={{ mt: 1, borderColor: alpha(theme.palette.primary.main, 0.5), color: theme.palette.primary.main }}
                        >
                          Clear Filters
                        </Button>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              )}
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}

export default Home;