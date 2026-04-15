import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  MaterialReactTable, 
  useMaterialReactTable 
} from 'material-react-table';
import { 
  Box, 
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Add as AddIcon,
  VisibilityRounded as DetailIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { FormControl, InputLabel, TextField } from '@mui/material';

import Swal from 'sweetalert2';
import config from '@/config';


export function ConsumedProductsTable (){
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
    // Add state for date range
const [dateRange, setDateRange] = useState(() => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0]; // Current date (e.g., 2025-05-24)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7); // 7 days before current date
  return {
    startDate: startDate.toISOString().split('T')[0], // e.g., 2025-05-17
    endDate,
  };
});


// Add formatDateForAPI function
const formatDateForAPI = (date) => {
  return new Date(date).toISOString().split('T')[0];
};
// Modified fetchConsumedProducts to use fetch and pass date range params
// Modified fetchConsumedProducts to handle API response robustly
const fetchConsumedProducts = async () => {
  try {
    setIsLoading(true);
    const dateRangeParams = {
      startDate: formatDateForAPI(dateRange.startDate),
      endDate: formatDateForAPI(dateRange.endDate),
    };
    console.log('Sending date range to API:', dateRangeParams);

    const response = await fetch(
      `${config.apiurl}/consumed-products/get-all-consumed-product?startDate=${dateRangeParams.startDate}&endDate=${dateRangeParams.endDate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Check if response is OK (status 200-299)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Full API response:', result); // Log full response for debugging

    // Handle different response structures
    if (result.success !== undefined && result.success) {
      // Expected structure: { success: true, data: array, message: string }
      const reversedData = (result.data || []).reverse();
      setData(reversedData);
    } else if (Array.isArray(result)) {
      // Direct array response
      const reversedData = result.reverse();
      setData(reversedData);
    } else if (result.data && Array.isArray(result.data)) {
      // Structure: { data: array }
      const reversedData = result.data.reverse();
      setData(reversedData);
    } else {
      // Unexpected response structure
      console.error('Unexpected API response structure:', result);
      setError(result.message || 'Failed to fetch consumed products: Invalid response format');
      setData([]);
    }
  } catch (err) {
    console.error('Fetch Error:', err);
    setError(err.message || 'Failed to fetch consumed products');
    setData([]);
  } finally {
    setIsLoading(false);
  }
};

// Handle date range change
const handleDateRangeChange = (event) => {
  const { name, value } = event.target;
  setDateRange((prev) => ({
    ...prev,
    [name]: value,
  }));
};

// Update useEffect to include dateRange in dependency array
useEffect(() => {
  fetchConsumedProducts();
}, [dateRange]);


    // Delete Consumed Product
    const handleDeleteConsumedProduct = async (id) => {
      // Show confirmation dialog
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'You won\'t be able to revert this!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      });
  
      // If user confirms deletion
      if (result.isConfirmed) {
        try {
          await axios.delete(`${config.apiurl}/consumed-products/delete-consumed-product/${id}`);
          
          // Remove the deleted item from the local state
          setData(prevData => prevData.filter(item => item._id !== id));
          
          // Show success message
          Swal.fire(
            'Deleted!',
            'Your consumed product has been deleted.',
            'success'
          );
        } catch (err) {
          console.error('Delete Error:', err);
          
          // Show error message
          Swal.fire(
            'Error!',
            'Failed to delete the consumed product.',
            'error'
          );
        }
      }
    };

  const columns = useMemo(() => [
    {
      accessorFn: (row) => row.employeeId?.fullName || 'N/A',
      id: 'fullName',
      header: 'Employee',
      size: 120,
      Cell: ({ cell }) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {cell.getValue()}
        </Typography>
      )
    },
    {
      accessorFn: (row) => {
        // Collect unique brands from product details
        if (row.productDetails && row.productDetails.length > 0) {
          const uniqueBrands = [...new Set(row.productDetails.map(pd => pd.brandName).filter(Boolean))];
          return uniqueBrands.length > 0 ? uniqueBrands.join(', ') : 'N/A';
        }
        return 'N/A';
      },
      id: 'brands',
      header: 'Brands',
      size: 120,
      Cell: ({ cell }) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {cell.getValue()}
        </Typography>
      )
    },
    {
      accessorKey: 'date',
      header: 'Date',
      size: 80,
      Cell: ({ cell }) => {
        try {
          return (
            <Typography variant="body2">
              {cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : 'N/A'}
            </Typography>
          );
        } catch {
          return <Typography variant="body2">Invalid Date</Typography>;
        }
      }
    },
    {
      accessorKey: 'totalConsumedQuantity',
      header: 'Quantity',
      size: 80,
      Cell: ({ cell }) => (
        <Typography variant="body2">
          {cell.getValue()}
        </Typography>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 120,
      Cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
<Button 
  startIcon={<EditIcon />} 
  size="small" 
  variant="outlined"
  color="primary"
  sx={{
    textTransform: 'none',
    fontSize: '0.7rem',
    padding: '4px 8px',
    minWidth: 'auto'
  }}
  onClick={() => {
    navigate(`/admin/consumed_products_edit/${row.original._id}`);
  }}
>
  {!isMobile && 'Edit'}
</Button>
          <Button 
            startIcon={<DeleteIcon />} 
            size="small" 
            variant="outlined" 
            color="error"
            sx={{
              textTransform: 'none',
              fontSize: '0.7rem',
              padding: '4px 8px',
              minWidth: 'auto'
            }}
            onClick={() => handleDeleteConsumedProduct(row.original._id)}
          >
            {!isMobile && 'Delete'}
          </Button>
        </Box>
      )
    }
  ], [isMobile, theme]);

  const table = useMaterialReactTable({
    columns,
    data,
    state: {
      isLoading,
    },
    initialState: {
      density: 'compact',
      pagination: { pageSize: 5 }
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 'bold',
        color: theme.palette.text.secondary,
        backgroundColor: theme.palette.grey[100]
      }
    },
    muiTableBodyCellProps: {
      sx: {
        padding: '8px 12px'
      }
    },
    enableColumnFilterModes: true,
    enableColumnOrdering: true,
    enableColumnPinning: true,
    enableRowSelection: true,
    renderTopToolbarCustomActions: () => (
    <Box sx={{ display: 'flex', gap: 2, p: 2, alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 175 }}>
        <InputLabel shrink>Start Date</InputLabel>
        <TextField
          type="date"
          name="startDate"
          label="Start Date"
          value={dateRange.startDate}
          onChange={handleDateRangeChange}
          InputLabelProps={{ shrink: true }}
          inputProps={{
            max: dateRange.endDate || new Date().toISOString().split('T')[0],
            min: '1900-01-01',
          }}
          size="small"
          sx={{
            '& .MuiInputBase-root': {
              height: 40,
            },
          }}
          fullWidth
        />
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 175 }}>
        <InputLabel shrink>End Date</InputLabel>
        <TextField
          type="date"
          name="endDate"
          label="End Date"
          value={dateRange.endDate}
          onChange={handleDateRangeChange}
          InputLabelProps={{ shrink: true }}
          inputProps={{
            min: dateRange.startDate || '1900-01-01',
            max: new Date().toISOString().split('T')[0],
          }}
          size="small"
          sx={{
            '& .MuiInputBase-root': {
              height: 40,
            },
          }}
          fullWidth
        />
      </FormControl>
   
    </Box>
  ),
    renderDetailPanel: ({ row }) => (
      <Box sx={{ p: 2, backgroundColor: theme.palette.background.default }}>
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            color: theme.palette.text.secondary 
          }}
        >
          <DetailIcon fontSize="small" /> Detailed Product Information
        </Typography>
        {row.original.productDetails && row.original.productDetails.length > 0 ? (
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Brand</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Expiry</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {row.original.productDetails.map((product, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {product.productDetails?.name || 'Unknown'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {product.brandName || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {product.consumedQuantity || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2"
                        color={
                          product.productDetails?.expiry_date && 
                          new Date(product.productDetails.expiry_date) < new Date() 
                            ? 'error' 
                            : 'inherit'
                        }
                      >
                        {product.productDetails?.expiry_date 
                          ? new Date(product.productDetails.expiry_date).toLocaleDateString() 
                          : 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No product details available
          </Typography>
        )}
      </Box>
    ),
    muiDetailPanelProps: {
      sx: { backgroundColor: theme.palette.background.default }
    },
    displayColumnDefOptions: {
      'mrt-row-expand': {
        size: 30,
        muiTableHeadCellProps: {
          align: 'center',
        },
        muiTableBodyCellProps: {
          align: 'center',
        },
      },
    },
  });

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box sx={{ 
      width: '100%', 
      p: { xs: 1, sm: 2 },
      backgroundColor: theme.palette.background.paper
    }}>
      <Card 
        elevation={0} 
        sx={{ 
          mb: 2,
          borderRadius: 2,
          boxShadow: theme.shadows[1],
        }}
      >
        <CardContent>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 600,
                color: theme.palette.text.primary,
                textAlign: { xs: 'center', sm: 'left' },
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              Product Consumed
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/admin/second_consumed_prod_form')}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.5 },
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              Add Product Consumed
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <MaterialReactTable table={table} />
    </Box>
  );
};

export default ConsumedProductsTable;