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
import Swal from 'sweetalert2';
import config from '@/config';


export function OpConsumedProductTable() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);



  useEffect(() => {
    const fetchConsumedProducts = async () => {
      try {
        const response = await axios.get(`${config.apiurl}/consumed-products/get-all-consumed-product`);
        // Reverse the data to show newest first
        const reversedData = response.data.data.reverse();
        setData(reversedData);
        setIsLoading(false);
      } catch (err) {
        console.error('Fetch Error:', err);
        // More detailed error handling
        const errorMessage = err.response?.data?.message || 'Failed to fetch consumed products';
        setError(errorMessage);
        setData([]); // Ensure data is reset on error
        setIsLoading(false);
      }
    };

    fetchConsumedProducts();
  }, []);


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
              navigate(`/operator/OpConsumedProductEdit/${row.original._id}`);
            }}
          >
            {!isMobile && 'Edit'}
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
              onClick={() => navigate('/operator/OpSecondProductConsumedForm')}
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

export default OpConsumedProductTable;