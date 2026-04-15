import React, { useState, useEffect, useMemo } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import { 
  Typography, 
  Box, 
  Chip, 
  IconButton, 
  Tooltip,
  Button,
  Paper,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Swal from 'sweetalert2';
import config from '@/config';

export function EmpPaymentAccountsTable() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch(`${config.apiurl}/payment/get-allaccount-details`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch account details');
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          setAccounts(data.data);
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching account data:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Failed to load account details.',
          confirmButtonColor: '#3085d6'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const handleAddAccount = () => {
    navigate('/admin/account-details/add');
  };

  const handleEditAccount = (accountId) => {
    navigate(`/admin/account-details/edit/${accountId}`);
  };

  const handleDeleteClick = (account) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete the account "${account.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        handleDeleteConfirm(account._id);
      }
    });
  };

  const handleDeleteConfirm = async (accountId) => {
    try {
      // Implement your delete API call here
      
      const response = await fetch(`${config.apiurl}/payment/delete-account/${accountId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete the account');
      }
      

      setAccounts(accounts.filter(acc => acc._id !== accountId));
      
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'The account has been deleted successfully.',
        confirmButtonColor: '#3085d6'
      });
      
      console.log("Deleted account:", accountId);
    } catch (err) {
      console.error("Error deleting account:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to delete the account. Please try again.',
        confirmButtonColor: '#3085d6'
      });
    }
  };

  // Compact columns showing all details
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Account Name',
        size: 180,
      },
      {
        accessorKey: 'paymentType',
        header: 'Payment Type',
        size: 180,
        Cell: ({ row }) => (
          <Chip 
            icon={row.original.paymentType === 'card' ? <CreditCardIcon fontSize="small" /> : <AccountBalanceIcon fontSize="small" />}
            label={row.original.paymentType.toUpperCase()}
            color={row.original.paymentType === 'card' ? 'primary' : 'success'}
            size="small"
            sx={{ fontSize: '0.75rem', height: '24px' }}
          />
        ),
      },
      {
        accessorKey: 'phoneNumber',
        header: 'Mobile No.',
        size: 150,
      },
      {
        accessorKey: 'accountDetails',
        header: 'Account Details',
        size: 370,
        Cell: ({ row }) => (
          row.original.paymentType === 'card' ? (
            <Box sx={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
              <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                <strong>Card Number:</strong> {row.original.cardDetails.cardNumber}
              </Typography>
              {/* <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                <strong>Card Type:</strong> {row.original.cardDetails.cardType}
              </Typography> */}
              <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
  <strong>Card Type:</strong> {row.original.cardDetails.cardType} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>Expiration:</strong> {row.original.cardDetails.expirationDate} &nbsp;&nbsp;&nbsp;&nbsp;
  <strong>CVV:</strong> {row.original.cardDetails.cvv}
</Typography>
              {/* <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                <strong>Expiration:</strong> {row.original.cardDetails.expirationDate}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                <strong>CVV:</strong> {row.original.cardDetails.cvv}
              </Typography> */}
            </Box>
          ) : (
            <Box sx={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
              <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                <strong>UPI ID:</strong> {row.original.upiDetails.upiId}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                <strong>Bank Name:</strong> {row.original.upiDetails.bankName}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                <strong>Account Number:</strong> {row.original.upiDetails.accountNumber}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
                <strong>IFSC Code:</strong> {row.original.upiDetails.ifscCode}
              </Typography>
            </Box>
          )
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created Date',
        size: 180,
        Cell: ({ row }) => (
          <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>
            {new Date(row.original.createdAt).toLocaleDateString()}
          </Typography>
        ),
      },

    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: accounts,
    state: {
      isLoading: loading,
    },
    initialState: {
      density: 'compact',
      pagination: {
        pageSize: 10,
        pageIndex: 0,
      },
    },
    enableColumnResizing: true,
    enableStickyHeader: true,
    enablePagination: true,
    muiTableProps: {
      sx: {
        tableLayout: 'fixed',
      },
    },
    muiTableBodyCellProps: {
      sx: {
        padding: '6px 12px',
      },
    },
    muiTableHeadCellProps: {
      sx: {
        padding: '8px 12px',
        fontWeight: 'bold',
        backgroundColor: '#f5f5f5',
      },
    },
    muiTableContainerProps: {
      sx: { maxHeight: '600px' },
    },
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
          Payment Accounts ({accounts.length})
        </Typography>

      </Box>
    ),
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'Actions',
        size: 100,
      },
    },
  });

  if (error) {
    return (
      <Typography color="error" align="center" sx={{ mt: 4, px: 2 }}>Error: {error}</Typography>
    );
  }

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      {/* Simplified header */}
      <Card 
        elevation={2} 
        sx={{ 
          mb: 2, 
          borderRadius: 2,
          width: '100%'
        }}
      >
        <CardContent sx={{ py: 2 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              width: '100%'
            }}
          >
            <Typography 
              variant="h5" 
              component="h1" 
              sx={{ fontWeight: 'bold', color: '#1976d2' }}
            >
              Manage Payment Accounts
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreditCardIcon color="primary" fontSize="small" />
                <Typography variant="body2">Cards</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalanceIcon color="success" fontSize="small" />
                <Typography variant="body2">UPI/Bank</Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
      
      {/* Data table */}
      <Paper 
        sx={{ 
          width: '100%', 
          overflow: 'hidden',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}
      >
        <MaterialReactTable table={table} />
      </Paper>
    </Box>
  );
}

export default EmpPaymentAccountsTable;