import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import {
  Box,
  Card,
  Stack,
  CardContent,
  Typography,
  Table,
  Button,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
  LinearProgress 
} from '@mui/material';
import config from '@/config';
import { FormControl, InputLabel, TextField } from '@mui/material';
import { Check, AlertTriangle, Ban } from 'lucide-react';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import EnhancedImage from '../Inventory/inhancedImage';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  ContentCopy as CopyIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { ButtonGroup, Tooltip } from '@mui/material';


const ConsumptionStatus = ({ consumptionStatus, total }) => {
  const consumed = consumptionStatus === 'not_consumed'
    ? 0
    : parseInt(consumptionStatus.split('_')[0]);
  
  const percentage = (consumed / total) * 100;

  const getStatusConfig = () => {
    if (percentage === 100) {
      return {
        label: 'Fully consumed',
        textColor: 'text-green-600',
        progressBg: 'bg-indigo-100',
        progressFill: 'bg-indigo-500'
      };
    } else if (percentage > 75) {
      return {
        label: 'Nearly complete',
        textColor: 'text-amber-600',
        progressBg: 'bg-amber-100',
        progressFill: 'bg-amber-500'
      };
    } else if (percentage > 0) {
      return {
        label: 'In progress',
        textColor: 'text-blue-600',
        progressBg: 'bg-blue-100',
        progressFill: 'bg-blue-500'
      };
    } else {
      return {
        label: 'Not started',
        textColor: 'text-red-600',
        progressBg: 'bg-red-100',
        progressFill: 'bg-red-500'
      };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="text-xs">
          <span className="font-medium text-gray-700">
            {consumed} of {total} used
          </span>
          <span className={`ml-2 ${statusConfig.textColor}`}>
            · {statusConfig.label}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {percentage.toFixed(0)}%
        </span>
      </div>
      
      <div className={`h-1 w-full rounded-full ${statusConfig.progressBg}`}>
        <div
          className={`h-full rounded-full ${statusConfig.progressFill} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};


export function ProductDeliveryTable() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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

const fetchProductDeliveries = async () => {
  try {
    setIsLoading(true);
    const dateRangeParams = {
      startDate: formatDateForAPI(dateRange.startDate),
      endDate: formatDateForAPI(dateRange.endDate),
    };
    console.log('Sending date range to API:', dateRangeParams);

    const response = await fetch(
      `${config.apiurl}/brands/get-all-delivered-product?startDate=${dateRangeParams.startDate}&endDate=${dateRangeParams.endDate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const result = await response.json();

    const reversedData = result.data.reverse();
    setData(reversedData);

    if (reversedData && reversedData.length > 0) {
      console.log('First item ID:', reversedData[0]._id);
    } else {
      console.log('No product deliveries found');
    }
  } catch (err) {
    setData([]);
    console.error('Error fetching product deliveries:', err);
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
    fetchProductDeliveries();
  }, []);

  // Handle date range change
const handleDateRangeChange = (event) => {
  const { name, value } = event.target;
  setDateRange((prev) => ({
    ...prev,
    [name]: value,
  }));
};

// Update useEffect to depend on dateRange
useEffect(() => {
  fetchProductDeliveries();
}, [dateRange]);



  const handleDelete = (row) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`${config.apiurl}/brands/delete-dilevery-record/${row._id}`)
          .then((response) => {
            if (response.data.success) {
              Swal.fire(
                'Deleted!',
                'The delivery record has been deleted.',
                'success'
              );
              fetchProductDeliveries(); // Refresh data
            }
          })
          .catch((err) => {
            const errorMessage = err.response?.data?.message || 'Unable to delete the delivery record';
  
            if (errorMessage.includes('Cannot delete ProductDelivery')) {
              Swal.fire({
                icon: 'warning',
                title: 'Deletion Blocked',
                text: errorMessage
              });
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Deletion Failed',
                text: errorMessage
              });
            }
          });
      }
    });
  };
  

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/placeholder-image.jpg';
    const cleanPath = imagePath.startsWith('/uploads') ? imagePath.slice(8) : imagePath;
    const baseUrl = config.apiurl.replace('/api', '');
    return `${baseUrl}/uploads/${cleanPath}`;
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'orderId',
      header: 'Order ID',
      size: 150,
    },
    {
      accessorKey: 'brand.brandName',
      header: 'Brand',
      size: 150,
    },
    {
      accessorKey: 'employee.fullName',
      header: 'Employee',
      size: 150,
    },
    {
      accessorKey: 'deliveryDate',
      header: 'Delivery Date',
      Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
      size: 150,
    },
     {
      accessorKey: 'platform.name',
      header: 'Platform',
      size: 150,
    },

{
  accessorKey: 'platform.reviewEnabled',
  header: 'Review Screenshot',
  Cell: ({ row }) => (
    row.original.platform.reviewEnabled && row.original.reviewScreenshot ? (
      <a href={row.original.reviewScreenshot} target="_blank" rel="noopener noreferrer">
        <img
          src={row.original.reviewScreenshot}
          alt="Review Screenshot"
          className="rounded-md"
          style={{ maxWidth: '100px', maxHeight: '50px' }}
        />
      </a>
    ) : (
      <span>not uploaded</span>
    )
  ),
  size: 150,
},
{
  accessorKey: 'reviewLink',
  header: 'Review Link',
  size: 100, // Fixed width in pixels
  Cell: ({ row }) => {
    const link = row.original.reviewLink;
    return link ? (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          cursor: 'pointer',
          textDecoration: 'underline',
          color: 'blue',
          display: 'inline-block',
          width: '200px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis', // Truncates long links with "..."
        }}
      >
        {link}
      </a>
    ) : (
      'Not Available'
    );
  },
},
{
  accessorKey: 'reviewDate',
  header: 'Review Date',
  Cell: ({ cell }) => cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : 'N/A',
  size: 150,
},
{
  accessorKey: 'accountNo',
  header: 'Account Number',
  Cell: ({ cell }) => cell.getValue() || 'N/A',
  size: 150,
},
{
  accessorKey: 'password',
  header: 'Password',
  Cell: ({ cell }) => cell.getValue() || 'N/A',
  size: 150,
},

  ], []);

  // Export to Excel
const handleExportExcel = () => {
  const flattenedData = data.flatMap(item =>
    item.products.map(product => ({
      OrderID: item.orderId || 'N/A',
      BrandName: item.brand?.brandName || 'N/A',
      EmployeeName: item.employee?.fullName || 'N/A',
      DeliveryDate: item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString() : 'N/A',
      PlatformName: item.platform?.name || 'N/A',
      ReviewLink: item.reviewLink || 'Not Available',
      ReviewScreenshot: item.reviewScreenshot || 'No screenshot available',
      ReviewDate: item.reviewDate ? new Date(item.reviewDate).toLocaleDateString() : 'N/A',
      AccountNo: item.accountNo || 'N/A',
      Password: item.password || 'N/A',
      ProductID: product.productId || 'N/A',
      Name: product.name || 'Unknown',
      Image: product.image || 'No image',
      Qty: product.quantity || 0,
      Consumption: product.consumptionStatus || 'Not Set',
      Delivery: product.deliveryStatus || 'Not Set',
      Expiry: product.noExpiry ? 'No Expiry' : new Date(product.expiry_date).toLocaleDateString()
    }))
  );

  const worksheet = XLSX.utils.json_to_sheet(flattenedData);
  const columnWidths = Object.keys(flattenedData[0]).map((key) => {
    const maxWidth = flattenedData.reduce((max, row) => {
      const cellValue = row[key] ? row[key].toString() : '';
      return Math.max(max, cellValue.length);
    }, key.length);
    return { wch: Math.min(maxWidth + 2, 60) };
  });
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ProductDeliveries');
  XLSX.writeFile(workbook, `ProductDeliveries_${new Date().toISOString().split('T')[0]}.xlsx`);

  Swal.fire({
    icon: 'success',
    title: 'Exported!',
    text: 'Excel file has been downloaded.',
    timer: 1500,
    showConfirmButton: false
  });
};
const handleExportPDF = () => {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Product Deliveries Report', 5, 8);
  doc.setFontSize(8);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 5, 12);

  const tableData = data.flatMap(item =>
    item.products.map(product => [
      item.orderId || 'N/A',
      item.brand?.brandName || 'N/A',
      item.employee?.fullName || 'N/A',
      item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString() : 'N/A',
      item.platform?.name || 'N/A',
      item.reviewLink || 'Not Available',
      item.reviewScreenshot || 'No screenshot available',
      item.reviewDate ? new Date(item.reviewDate).toLocaleDateString() : 'N/A',
      item.accountNo || 'N/A',
      item.password || 'N/A',
      product.productId || 'N/A',
      product.name || 'Unknown',
      product.image || 'No image',
      product.quantity || 0,
      product.consumptionStatus || 'Not Set',
      product.deliveryStatus || 'Not Set',
      product.noExpiry ? 'No Expiry' : new Date(product.expiry_date).toLocaleDateString()
    ])
  );

  const headers = [
    'Order ID', 'Brand Name', 'Employee Name', 'Delivery Date',
    'Platform Name', 'Review Link', 'Review Screenshot', 'Review Date',
    'Account No', 'Password', 'Product ID', 'Name', 'Image', 'Qty',
    'Consumption', 'Delivery', 'Expiry'
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
  const scaledWidths = columnWidths.map(width => width * mmPerChar);

  const columnStyles = scaledWidths.reduce((styles, width, index) => ({
    ...styles,
    [index]: { cellWidth: width, overflow: 'ellipsize', minCellHeight: 0 }
  }), {});

  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: 16,
    styles: { fontSize: 7, cellPadding: 0.3, overflow: 'linebreak' },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7, cellPadding: 0.3 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles,
    margin: { left: 3, right: 3, top: 16, bottom: 8 },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.text(`Page ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 3);
    }
  });

  doc.save(`ProductDeliveries_${new Date().toISOString().split('T')[0]}.pdf`);

  Swal.fire({
    icon: 'success',
    title: 'Exported!',
    text: 'PDF file has been downloaded.',
    timer: 1500,
    showConfirmButton: false
  });
};

const handleCopyToClipboard = () => {
  const text = data.flatMap(item =>
    item.products.map(product => [
      item.orderId || 'N/A',
      item.brand?.brandName || 'N/A',
      item.employee?.fullName || 'N/A',
      item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString() : 'N/A',
      item.platform?.name || 'N/A',
      item.reviewLink || 'Not Available',
      item.reviewScreenshot || 'No screenshot available',
      item.reviewDate ? new Date(item.reviewDate).toLocaleDateString() : 'N/A',
      item.accountNo || 'N/A',
      item.password || 'N/A',
      product.productId || 'N/A',
      product.name || 'Unknown',
      product.image || 'No image',
      product.quantity || 0,
      product.consumptionStatus || 'Not Set',
      product.deliveryStatus || 'Not Set',
      product.noExpiry ? 'No Expiry' : new Date(product.expiry_date).toLocaleDateString()
    ].join('\t'))
  ).join('\n');

  const header = [
    'Order ID', 'Brand Name', 'Employee Name', 'Delivery Date',
    'Platform Name', 'Review Link', 'Review Screenshot', 'Review Date',
    'Account No', 'Password', 'Product ID', 'Name', 'Image', 'Qty',
    'Consumption', 'Delivery', 'Expiry'
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

const handlePrint = () => {
  if (!data || data.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'No Data',
      text: 'No product deliveries available to print.',
      confirmButtonColor: '#3085d6'
    });
    return;
  }

  const printWindow = window.open('', '_blank');
  const headers = [
    'Order ID', 'Brand Name', 'Employee Name', 'Delivery Date',
    'Platform Name', 'Review Link', 'Review Screenshot', 'Review Date',
    'Account No', 'Password', 'Product ID', 'Name', 'Image', 'Qty',
    'Consumption', 'Delivery', 'Expiry'
  ];

  const columnWidths = headers.map((header, index) => {
    const maxWidth = data.flatMap(item =>
      item.products.map(product => {
        const values = [
          item.orderId || 'N/A',
          item.brand?.brandName || 'N/A',
          item.employee?.fullName || 'N/A',
          item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString() : 'N/A',
          item.platform?.name || 'N/A',
          item.reviewLink || 'Not Available',
          item.reviewScreenshot || 'No screenshot available',
          item.reviewDate ? new Date(item.reviewDate).toLocaleDateString() : 'N/A',
          item.accountNo || 'N/A',
          item.password || 'N/A',
          product.productId || 'N/A',
          product.name || 'Unknown',
          product.image || 'No image',
          product.quantity || 0,
          product.consumptionStatus || 'Not Set',
          product.deliveryStatus || 'Not Set',
          product.noExpiry ? 'No Expiry' : new Date(product.expiry_date).toLocaleDateString()
        ];
        const cellValue = values[index] ? values[index].toString() : '';
        return cellValue.length;
      })
    ).reduce((max, len) => Math.max(max, len), header.length);
    return Math.min(maxWidth + 2, 60);
  });

  const columnStyles = columnWidths.map((width, index) => `
    th:nth-child(${index + 1}), td:nth-child(${index + 1}) {
      width: ${width * 8}px;
      min-width: ${width * 8}px;
      max-width: ${width * 8}px;
      white-space: nowrap;
      text-align: left;
      padding: 8px;
      vertical-align: top;
    }
    td:nth-child(7) img {
      max-width: 100px;
      max-height: 100px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
  `).join('');

  const tableContent = data.flatMap(item =>
    item.products.map(product => `
      <tr>
        <td>${item.orderId || 'N/A'}</td>
        <td>${item.brand?.brandName || 'N/A'}</td>
        <td>${item.employee?.fullName || 'N/A'}</td>
        <td>${item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString() : 'N/A'}</td>
        <td>${item.platform?.name || 'N/A'}</td>
        <td>${item.reviewLink || 'Not Available'}</td>
        <td>${item.reviewScreenshot ? `<img src="${item.reviewScreenshot}" alt="Screenshot" onerror="this.style.display='none';this.nextSibling.style.display='block';"><span style="display:none;">No screenshot available</span>` : 'No screenshot available'}</td>
        <td>${item.reviewDate ? new Date(item.reviewDate).toLocaleDateString() : 'N/A'}</td>
        <td>${item.accountNo || 'N/A'}</td>
        <td>${item.password || 'N/A'}</td>
        <td>${product.productId || 'N/A'}</td>
        <td>${product.name || 'Unknown'}</td>
        <td>${product.image || 'No image'}</td>
        <td>${product.quantity || 0}</td>
        <td>${product.consumptionStatus || 'Not Set'}</td>
        <td>${product.deliveryStatus || 'Not Set'}</td>
        <td>${product.noExpiry ? 'No Expiry' : new Date(product.expiry_date).toLocaleDateString()}</td>
      </tr>
    `)
  ).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>Print Product Deliveries</title>
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
        <h2>Product Deliveries Report</h2>
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
    showConfirmButton: false
  });
};

  const table = useMaterialReactTable({
    columns,
    data,
    enableExpanding: true,
    enableRowActions: true,
    positionActionsColumn: 'last',
   renderTopToolbarCustomActions: () => (
  <Box sx={{ display: 'flex', gap: 2,p:2, alignItems: 'center' }}>
   
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
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: '1rem' }}>
        <Button
          startIcon={<EditIcon />}
          variant="outlined"
          color="primary"
          onClick={() => navigate(`/admin/edit_delivered_product/${row.original._id}`)}
        >
          Edit
        </Button>
        <Button
        startIcon={<DeleteIcon />}
        variant="outlined"
        color="error"
        onClick={() => handleDelete(row.original)}
      >
        Delete
      </Button>
      </Box>
    ),
    renderEmptyRowsFallback: () => (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          width: '100%'
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            color: '#6B7280',
            fontWeight: 500
          }}
        >
          No records found
        </Typography>
      </Box>
    ),
    renderDetailPanel: ({ row }) => (
      <Box className="p-3">
        <Typography variant="h6" className="mb-3 text-sm font-semibold text-gray-800">
          Product Details
        </Typography>
        <TableContainer component={Paper} className="shadow-sm border border-gray-100 rounded-lg">
          <Table>
            <TableHead>
              <TableRow className="bg-gray-50">
                <TableCell className="text-xs font-medium text-gray-600">Product ID</TableCell>
                <TableCell className="text-xs font-medium text-gray-600">Name</TableCell>
                <TableCell className="text-xs font-medium text-gray-600">Image</TableCell>
                <TableCell className="text-xs font-medium text-gray-600">Quantity</TableCell>
                <TableCell className="text-xs font-medium text-gray-600">Consumption Status</TableCell>
                <TableCell className="text-xs font-medium text-gray-600">Delivery Status</TableCell>
                <TableCell className="text-xs font-medium text-gray-600">Expiry</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {row.original.products.map((product) => (
                <TableRow 
                  key={product.productId}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <TableCell className="text-xs text-gray-600">{product.productId}</TableCell>
                  <TableCell className="text-xs text-gray-700 font-medium">{product.name}</TableCell>
                  <TableCell>
                    <EnhancedImage
                      src={getImageUrl(product.image)}
                      alt={product.name}
                      className="rounded-md"
                    />
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">{product.quantity}</TableCell>
                  <TableCell className="min-w-[200px]">
                    <ConsumptionStatus 
                      consumptionStatus={product.consumptionStatus}
                      total={product.quantity}
                    />
                  </TableCell>
                  <TableCell>
                     <Chip 
                       label={product.deliveryStatus.toLowerCase()}
                       color={
                         product.deliveryStatus === 'delivered' ? 'success' : 
                         product.deliveryStatus === 'pending' ? 'warning' : 'error'
                       }
                       size="small"
                     />
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">
                    {product.noExpiry ? 'No Expiry' : 
                     new Date(product.expiry_date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    )
    
  });

  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="100vh"
      >
        <CircularProgress />
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
              Delivered Product
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/admin/add_delivered_product')}
              sx={{
                bgcolor: '#4F46E5',
                '&:hover': { bgcolor: '#3730A3' },
                textTransform: 'none',
                borderRadius: '8px',
                px: 3,
                py: 1
              }}
            >
              Delivered Product
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <MaterialReactTable table={table} />
    </Box>
  );
}

export default ProductDeliveryTable;