import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import {
  Box,
  Chip,
  Card,
  Stack,
  CardContent,
  Typography,
  CircularProgress,
  Table,
  Button,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  ButtonGroup,
} from '@mui/material';
import { FormControl, InputLabel, TextField } from '@mui/material';
import {
  Add as AddIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  ContentCopy as CopyIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import Swal from 'sweetalert2';
import { LinearProgress } from '@mui/material';
import config from '@/config';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../../auth/AuthContext';


export function ClientStockOrderedTable() {
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState(() => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0]; // Current date (e.g., 2025-06-07)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7); // 7 days before current date
  return {
    startDate: startDate.toISOString().split('T')[0], // e.g., 2025-05-31
    endDate,
  };
});

  const statusOptions = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const formatDateForAPI = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

const handleDateRangeChange = (event) => {
  const { name, value } = event.target;
  setDateRange((prev) => ({
    ...prev,
    [name]: value,
  }));
};


  // Handle status click for updating delivery status
  const handleStatusClick = (event, product, orderId) => {
    setAnchorEl(event.currentTarget);
    setSelectedProduct({ ...product, orderId });
  };

  const handleStatusClose = () => {
    setAnchorEl(null);
    setSelectedProduct(null);
  };







  // Handle status change for a product
  const handleStatusChange = async (newStatus) => {
    if (selectedProduct) {
      try {
        const response = await fetch(`${config.apiurl}/brands/update-delivery-status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: selectedProduct.orderId,
            productId: selectedProduct.productId,
            newStatus: newStatus
          })
        });

        const data = await response.json();

        if (data.success) {
          const refreshResponse = await fetch(`${config.apiurl}/client/orders/${user._id}`);
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success) {
            setOrderData(refreshResult.data || []);
          }
        } else {
          console.error('Failed to update status:', data.message);
          await Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: data.message || 'Failed to update status',
            confirmButtonColor: '#3085d6'
          });
        }
      } catch (err) {
        console.error('Error updating status:', err);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'An unexpected error occurred while updating the status.',
          confirmButtonColor: '#3085d6'
        });
      }
    }
    handleStatusClose();
  };

  // Fetch orders
async function fetchOrders() {
  try {
    const dateRangeParams = {
      startDate: formatDateForAPI(dateRange.startDate),
      endDate: formatDateForAPI(dateRange.endDate),
    };
    const response = await fetch(
      `${config.apiurl}/client/orders/${user._id}?startDate=${dateRangeParams.startDate}&endDate=${dateRangeParams.endDate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const result = await response.json();
    setOrderData(result.data || []);
    console.log('Fetched orders:', result.data);
  } catch (err) {
    setError('Failed to fetch orders');
    console.error('Error fetching orders:', err);
  } finally {
    setIsLoading(false);
  }
}

useEffect(() => {
  fetchOrders();
}, [dateRange, user._id]);

  // Export to Excel
  const handleExportExcel = () => {
    const flattenedData = orderData.map(order => ({
      OrderID: order.orderId || 'N/A',
      BrandName: order.brandName?.brandName || 'N/A',
      FinalAmount: `₹${order.finalAmount?.toLocaleString() || '0'}`,
      PhoneNumber: order.phoneNo || 'N/A',
      Address: order.fullAddress || 'N/A',
      CreatedDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
      ProductDetails: order.products?.map(p =>
        `${p.name || 'Unknown'} (ID: ${p.productId || 'N/A'}, Qty: ${p.quantity || 0}, Status: ${p.deliveryStatus || 'Not Set'})`
      ).join('; ') || 'No products',
      Note: order.note || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const columnWidths = Object.keys(flattenedData[0]).map((key, colIndex) => {
      const maxWidth = flattenedData.reduce((max, row) => {
        const cellValue = row[key] ? row[key].toString() : '';
        return Math.max(max, cellValue.length);
      }, key.length);
      return { wch: Math.min(maxWidth + 2, 60) };
    });

    worksheet['!cols'] = columnWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, `Orders_${new Date().toISOString().split('T')[0]}.xlsx`);

    Swal.fire({
      icon: 'success',
      title: 'Exported!',
      text: 'Excel file has been downloaded.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // Export to PDF
  const handleExportPDF = () => {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Orders Report', 5, 8);
  doc.setFontSize(8);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 5, 12);

  const tableData = orderData.map(order => {
    try {
      return [
        order.orderId || 'N/A',
        order.brandName?.brandName || 'N/A',
        `₹${order.finalAmount?.toLocaleString() || '0'}`,
        order.phoneNo || 'N/A',
        order.fullAddress || 'N/A',
        order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
        order.products?.map(p =>
          `${p.name || 'Unknown'} (ID: ${p.productId || 'N/A'}, Qty: ${p.quantity || 0}, Status: ${p.deliveryStatus || 'Not Set'})`
        ).join('; ') || 'No products',
        order.note || 'N/A',
      ];
    } catch (error) {
      console.error(`Error processing order ${order.orderId || 'unknown'}:`, error);
      return Array(8).fill('Error');
    }
  });

  const headers = [
    'Order ID', 'Brand Name', 'Final Amount',
    'Phone Number', 'Address', 'Created Date',
    'Product Details', 'Note',
  ];

  const columnWidths = headers.map((header, index) => {
    const maxWidth = tableData.reduce((max, row) => {
      const cellValue = row[index] ? row[index].toString() : '';
      const longestLine = cellValue.split('\n').reduce((lineMax, line) => Math.max(lineMax, line.length), 0);
      return Math.max(max, longestLine);
    }, header.length);
    return maxWidth;
  });

  const totalCharWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const pageWidth = doc.internal.pageSize.width - 6;
  const mmPerChar = pageWidth / totalCharWidth;
  const scaledWidths = columnWidths.map(width => width * mmPerChar * 1);

  const columnStyles = scaledWidths.reduce((styles, width, index) => ({
    ...styles,
    [index]: {
      cellWidth: width,
      overflow: index === 6 || index === 4 ? 'linebreak' : 'ellipsize',
      minCellHeight: index === 6 || index === 4 ? 10 : 0
    }
  }), {});

  try {
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 16,
      styles: {
        fontSize: 7,
        cellPadding: 0.3,
        overflow: 'linebreak',
        minCellHeight: 0
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: 0.3
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles,
      margin: { left: 3, right: 3, top: 16, bottom: 8 },
      didParseCell: (data) => {
        if (data.column.index === 6 || data.column.index === 4) {
          data.cell.styles.valign = 'top';
          data.cell.styles.halign = 'left';
        }
      },
      didDrawPage: (data) => {
        doc.setFontSize(7);
        doc.text(`Page ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 3);
      }
    });
  } catch (error) {
    console.error('Error rendering PDF table:', error);
    Swal.fire({
      icon: 'error',
      title: 'PDF Export Failed',
      text: 'An error occurred while generating the PDF. Please try again.',
      confirmButtonColor: '#3085d6'
    });
    return;
  }

  doc.save(`Orders_${new Date().toISOString().split('T')[0]}.pdf`);

  Swal.fire({
    icon: 'success',
    title: 'Exported!',
    text: 'PDF file has been downloaded.',
    timer: 1500,
    showConfirmButton: false
  });
};

  // Copy to Clipboard
  const handleCopyToClipboard = () => {
    const text = orderData.map(order => [
      order.orderId || 'N/A',
      order.brandName?.brandName || 'N/A',
      `₹${order.finalAmount?.toLocaleString() || '0'}`,
      order.phoneNo || 'N/A',
      order.fullAddress || 'N/A',
      order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
      order.products?.map(p =>
        `${p.name || 'Unknown'} (ID: ${p.productId || 'N/A'}, Qty: ${p.quantity || 0}, Status: ${p.deliveryStatus || 'Not Set'})`
      ).join('; ') || 'No products',
      order.note || 'N/A',
    ].join('\t')).join('\n');

    const header = [
      'Order ID', 'Brand Name', 'Final Amount',
      'Phone Number', 'Address', 'Created Date',
    ].join('\t');
    navigator.clipboard.writeText(`${header}\n${text}`)
      .then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Copied!',
          text: 'Data copied to clipboard.',
          timer: 1500,
          showConfirmButton: false
        });
      })
      .catch(() => {
        Swal.fire({
          icon: 'error',
          title: 'Copy Failed',
          text: 'Failed to copy data to clipboard.',
          confirmButtonColor: '#3085d6'
        });
      });
  };

  // Print functionality
  const handlePrint = () => {
    if (!orderData || orderData.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Data',
        text: 'No orders available to print.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const printWindow = window.open('', '_blank');

    const headers = [
      'Order ID', 'Brand Name', 'Final Amount',
      'Phone Number', 'Address', 'Created Date',
      'Product Details', 'Note', 
    ];

    const columnWidths = headers.map((header, index) => {
      const maxWidth = orderData.reduce((max, order) => {
        const values = [
          order.orderId || 'N/A',
          order.brandName?.brandName || 'N/A',
          `₹${order.finalAmount?.toLocaleString() || '0'}`,
          order.phoneNo || 'N/A',
          order.fullAddress || 'N/A',
          order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
          order.products
            ?.map(p => `${p.name || 'Unknown'} (ID: ${p.productId || 'N/A'}, Qty: ${p.quantity || 0}, Status: ${p.deliveryStatus || 'Not Set'})`)
            .join('; ') || 'No products',
          order.note || 'N/A',
        ];
        const cellValue = values[index] ? values[index].toString() : '';
        return Math.max(max, cellValue.length);
      }, header.length);
      return Math.min(maxWidth + 2, 60);
    });

    const columnStyles = columnWidths.map((width, index) => `
      th:nth-child(${index + 1}), td:nth-child(${index + 1}) {
        width: ${width * 8}px;
        min-width: ${width * 8}px;
        max-width: ${width * 8}px;
        white-space: ${index === 6 || index === 4 ? 'pre-wrap' : 'nowrap'};
        text-align: left;
        padding: 8px;
        vertical-align: top;
      }
      td:nth-child(9) {
        padding: 4px;
      }
      td:nth-child(9) img {
        max-width: 100px;
        max-height: 100px;
        object-fit: contain;
        display: block;
        margin: 0 auto;
      }
    `).join('');

    const tableContent = orderData.map(order => `
      <tr>
        <td>${order.orderId || 'N/A'}</td>
        <td>${order.brandName?.brandName || 'N/A'}</td>
        <td>₹${order.finalAmount?.toLocaleString() || '0'}</td>
        <td>${order.phoneNo || 'N/A'}</td>
        <td>${order.fullAddress || 'N/A'}</td>
        <td>${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
        <td>${order.products
          ?.map(p => `${p.name || 'Unknown'} (ID: ${p.productId || 'N/A'}, Qty: ${p.quantity || 0}, Status: ${p.deliveryStatus || 'Not Set'})`)
          .join('<br>') || 'No products'}</td>
        <td>${order.note || 'N/A'}</td>
       
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Orders</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            ${columnStyles}
            @media print {
              body { margin: 0; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              img { max-width: 100px; max-height: 100px; }
            }
          </style>
        </head>
        <body>
          <h2>Orders Report</h2>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                ${headers.map(header => `<th>${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${tableContent}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();

    Swal.fire({
      icon: 'success',
      title: 'Printed!',
      text: 'Document sent to printer.',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const columns = useMemo(
    () => [
      {
        id: 'orderDetails',
        header: 'Order Details',
        columns: [
          {
            accessorKey: 'orderId',
            header: 'Order ID',
            size: 180,
          },
          {
            accessorKey: 'brandName.brandName',
            header: 'Brand Name',
            size: 220,
          },
          {
            accessorKey: 'finalAmount',
            header: ' Amount',
            size: 50,
            Cell: ({ cell }) => (
              <Typography>
                ₹{cell.getValue()?.toLocaleString() || '0'}
              </Typography>
            ),
          },
        ],
      },
      {
        id: 'contact',
        header: 'Contact Information',
        columns: [
          {
            accessorKey: 'phoneNo',
            header: 'Phone Number',
            size: 150,
          },
          {
            accessorKey: 'fullAddress',
            header: 'Address',
            size: 450,
          },
        ],
      },
      {
        id: 'dates',
        header: 'Dates',
        columns: [
          {
            accessorKey: 'createdAt',
            header: 'Created Date',
            size: 200,
            Cell: ({ cell }) => (
              <Typography>
                {cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : ''}
              </Typography>
            ),
          },
        ],
      },
   
    ],
    []
  );

  // Render delivery status
  const renderDeliveryStatus = (status) => {
    if (Array.isArray(status)) {
      return status.map((s, index) => (
        <Chip
          key={index}
          label={s}
          color={
            s === 'Pending' ? 'warning' :
              s === 'Processing' ? 'info' :
                s === 'Shipped' ? 'primary' :
                  s === 'Delivered' ? 'success' :
                    s === 'Cancelled' ? 'error' : 'default'
          }
          size="small"
          sx={{ mr: 0.5 }}
        />
      ));
    }
    return (
      <Chip
        label={status || 'Not Set'}
        color={
          status === 'Pending' ? 'warning' :
            status === 'Processing' ? 'info' :
              status === 'Shipped' ? 'primary' :
                status === 'Delivered' ? 'success' :
                  status === 'Cancelled' ? 'error' : 'default'
        }
        size="small"
      />
    );
  };

  // Get available status options
  const getAvailableStatusOptions = (product) => {
    if (!product) return [];

    if (product.quantity === product.remaining_quantity) {
      return ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    }

    if (product.quantity > product.remaining_quantity && product.remaining_quantity > 0) {
      return ['Delivered'];
    }

    if (product.remaining_quantity === 0) {
      return [];
    }

    return [];
  };

  const table = useMaterialReactTable({
    columns,
    data: orderData,
    enableColumnFilterModes: true,
    enableColumnOrdering: true,
    enableGrouping: true,
    enableColumnPinning: true,
    enableFacetedValues: true,
    enableExpandAll: true,
    enableRowSelection: true,
    initialState: {
      showColumnFilters: false,
      showGlobalFilter: true,
      pagination: { pageSize: 5, pageIndex: 0 },
    },
    state: {
      isLoading,
    },
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <ButtonGroup variant="outlined" size="small" aria-label="export options">
          <Tooltip title="Export as PDF">
            <Button
              onClick={handleExportPDF}
              startIcon={<PdfIcon />}
              sx={{ textTransform: 'none' }}
            >
              PDF
            </Button>
          </Tooltip>
          <Tooltip title="Print">
            <Button
              onClick={handlePrint}
              startIcon={<PrintIcon />}
              sx={{ textTransform: 'none' }}
            >
              Print
            </Button>
          </Tooltip>
          <Tooltip title="Copy to clipboard">
            <Button
              onClick={handleCopyToClipboard}
              startIcon={<CopyIcon />}
              sx={{ textTransform: 'none' }}
            >
              Copy
            </Button>
          </Tooltip>
          <Tooltip title="Export as Excel">
            <Button
              onClick={handleExportExcel}
              startIcon={<ExcelIcon />}
              sx={{ textTransform: 'none' }}
            >
              Excel
            </Button>
          </Tooltip>
        </ButtonGroup>
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
    renderEmptyRowsFallback: () => (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <Box>
            <Typography variant="h6" color="textSecondary">
              No records to display
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {error || 'There are no orders available at the moment.'}
            </Typography>
          </Box>
        )}
      </Box>
    ),
    renderDetailPanel: ({ row }) => (
      <Box sx={{ p: 0.5 }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Products in Order
        </Typography>
        <Box sx={{ maxWidth: 'fit-content' }}>
          <Table size="small" sx={{
            '& .MuiTableCell-root': {
              p: '8px 16px',
              borderBottom: 'none',
              whiteSpace: 'nowrap'
            },
            width: 'auto',
            tableLayout: 'fixed'
          }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>Product ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '250px' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Total Quantity</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Delivered Quantity</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '200px' }}>Delivery Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {row.original.products?.map((product) => {
                const totalQuantity = product.quantity;
                const pendingQuantity = product.remaining_quantity;
                const deliveredQuantity = totalQuantity - pendingQuantity;

                const progressPercentage = (deliveredQuantity / totalQuantity) * 100;
                let progressStatus = 'Not Started';
                if (progressPercentage === 0) progressStatus = 'Not Started';
                else if (progressPercentage > 0 && progressPercentage < 50) progressStatus = 'Partially Delivered';
                else if (progressPercentage >= 50 && progressPercentage < 100) progressStatus = 'Half Delivered';
                else if (progressPercentage === 100) progressStatus = 'Fully Delivered';

                return (
                  <TableRow
                    key={product._id}
                    sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: '#fafafa',
                      },
                    }}
                  >
                    <TableCell sx={{ width: '120px' }}>{product.productId}</TableCell>
                    <TableCell sx={{ width: '250px' }}>{product.name}</TableCell>
                    <TableCell sx={{ width: '100px' }}>{totalQuantity}</TableCell>
                    <TableCell sx={{ width: '100px' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {deliveredQuantity}
                          <LinearProgress
                            variant="determinate"
                            value={(deliveredQuantity / totalQuantity) * 100}
                            sx={{
                              width: '50px',
                              height: '6px',
                              ml: 1,
                              '& .MuiLinearProgress-bar': {
                                backgroundColor:
                                  deliveredQuantity === totalQuantity ? 'success.main' :
                                    deliveredQuantity > 0 ? 'primary.main' : 'default'
                              }
                            }}
                          />
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.625rem',
                            color:
                              progressStatus === 'Not Started' ? 'text.disabled' :
                                progressStatus === 'Partially Delivered' ? 'warning.main' :
                                  progressStatus === 'Half Delivered' ? 'info.main' :
                                    progressStatus === 'Fully Delivered' ? 'success.main' : 'default',
                            mt: 0.5
                          }}
                        >
                          {progressStatus}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ width: '200px' }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%'
                      }}>
                        <Box>
                          {renderDeliveryStatus(product.deliveryStatus)}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => handleStatusClick(e, product, row.original.orderId)}
                          sx={{
                            backgroundColor: '#f0f0f0',
                            '&:hover': { backgroundColor: '#e0e0e0' },
                            '&.Mui-disabled': {
                              backgroundColor: '#e0e0e0',
                              opacity: 0.5
                            }
                          }}
                          disabled={product.remaining_quantity === 0}
                        >
                          <Edit size={16} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
        {row.original.note && (
          <Box sx={{ mt: 0.5, p: 0.5, backgroundColor: '#fff3e0', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.25 }}>
              Note:
            </Typography>
            <Typography>{row.original.note}</Typography>
          </Box>
        )}
  
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleStatusClose}
        >
          {selectedProduct && getAvailableStatusOptions(selectedProduct).map((status) => (
            <MenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              sx={{
                color:
                  status === 'Pending' ? 'warning.main' :
                    status === 'Processing' ? 'info.main' :
                      status === 'Shipped' ? 'primary.main' :
                        status === 'Delivered' ? 'success.main' :
                          status === 'Cancelled' ? 'error.main' : 'default',
              }}
            >
              {status}
            </MenuItem>
          ))}
          {selectedProduct && selectedProduct.remaining_quantity === 0 && (
            <MenuItem disabled sx={{ color: 'text.disabled' }}>
              No status changes available
            </MenuItem>
          )}
        </Menu>
      </Box>
    ),
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 'bold',
        backgroundColor: '#f5f5f5',
      },
    },
  });

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'error.main' }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            sx={{ py: 1 }}
          >
            <Typography
              variant="h5"
              component="h1"
              sx={{
                fontWeight: 600,
                color: '#1F2937'
              }}
            >
              Ordered Product
            </Typography>
            
          </Stack>
        </CardContent>
      </Card>
      <MaterialReactTable table={table} />
    </Box>
  );
}

export default ClientStockOrderedTable;