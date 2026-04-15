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
  CircularProgress,
} from '@mui/material';
import { FormControl, InputLabel, TextField } from '@mui/material';
import config from '@/config';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
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
import { useAuth } from '../../auth/AuthContext';


export function ClientproductDeliveredTable() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
  

const fetchProductDeliveries = async () => {
  try {
    setIsLoading(true);
    const dateRangeParams = {
      startDate: formatDateForAPI(dateRange.startDate),
      endDate: formatDateForAPI(dateRange.endDate),
    };
    const response = await axios.get(
      `${config.apiurl}/client/deliveries/${user._id}?startDate=${dateRangeParams.startDate}&endDate=${dateRangeParams.endDate}`
    );
    console.log('Response:', response);
    setData(response.data.data || []);
  } catch (err) {
    setData([]);
    console.error('Error fetching product deliveries:', err);
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  if (user?._id) {
    fetchProductDeliveries();
  }
}, [user?._id, dateRange]); // Add user._id as dependency



  const columns = useMemo(() => [
    {
      accessorKey: 'orderId',
      header: 'Order ID',
      size: 220,
    },
    {
      accessorKey: 'brand.brandName',
      header: 'Brand',
      size: 220,
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
      size: 100,
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
              textOverflow: 'ellipsis',
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
      Cell: ({ cell }) => (cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : 'N/A'),
      size: 150,
    },
  ], []);

  // Export to Excel
  const handleExportExcel = () => {
    const flattenedData = data.flatMap(item =>
      item.products.map(product => ({
        OrderID: item.orderId || 'N/A',
        BrandName: item.brand?.brandName || 'N/A',
        ReviewLink: item.reviewLink || 'Not Available',
        ReviewScreenshot: item.reviewScreenshot || 'No screenshot available',
        ReviewDate: item.reviewDate ? new Date(item.reviewDate).toLocaleDateString() : 'N/A',
        ProductID: product.productId || 'N/A',
        Name: product.name || 'Unknown',
        Qty: product.quantity || 0,
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

  // Export to PDF
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
        item.reviewLink || 'Not Available',
        item.reviewScreenshot || 'No screenshot available',
        item.reviewDate ? new Date(item.reviewDate).toLocaleDateString() : 'N/A',
        product.productId || 'N/A',
        product.name || 'Unknown',
        product.quantity || 0,
      ])
    );

    const headers = [
      'Order ID', 'Brand Name', 'Review Link', 'Review Screenshot',
      'Review Date', 'Product ID', 'Name', 'Qty'
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

  // Copy to Clipboard
  const handleCopyToClipboard = () => {
    const text = data.flatMap(item =>
      item.products.map(product => [
        item.orderId || 'N/A',
        item.brand?.brandName || 'N/A',
        item.reviewLink || 'Not Available',
        item.reviewScreenshot || 'No screenshot available',
        item.reviewDate ? new Date(item.reviewDate).toLocaleDateString() : 'N/A',
        product.productId || 'N/A',
        product.name || 'Unknown',
        product.quantity || 0,
      ].join('\t'))
    ).join('\n');

    const header = [
      'Order ID', 'Brand Name', 'Review Link', 'Review Screenshot',
      'Review Date', 'Product ID', 'Name', 'Qty'
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
      'Order ID', 'Brand Name', 'Review Link', 'Review Screenshot',
      'Review Date', 'Product ID', 'Name', 'Qty'
    ];

    const columnWidths = headers.map((header, index) => {
      const maxWidth = data.flatMap(item =>
        item.products.map(product => {
          const values = [
            item.orderId || 'N/A',
            item.brand?.brandName || 'N/A',
            item.reviewLink || 'Not Available',
            item.reviewScreenshot || 'No screenshot available',
            item.reviewDate ? new Date(item.reviewDate).toLocaleDateString() : 'N/A',
            product.productId || 'N/A',
            product.name || 'Unknown',
            product.quantity || 0,
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
      td:nth-child(4) img {
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
          <td>${item.reviewLink || 'Not Available'}</td>
          <td>${item.reviewScreenshot ? `<img src="${item.reviewScreenshot}" alt="Screenshot" onerror="this.style.display='none';this.nextSibling.style.display='block';"><span style="display:none;">No screenshot available</span>` : 'No screenshot available'}</td>
          <td>${item.reviewDate ? new Date(item.reviewDate).toLocaleDateString() : 'N/A'}</td>
          <td>${product.productId || 'N/A'}</td>
          <td>${product.name || 'Unknown'}</td>
          <td>${product.quantity || 0}</td>
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
    positionActionsColumn: 'last',
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
                <TableCell className="text-xs font-medium text-gray-600">Quantity</TableCell>
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
                  <TableCell className="text-xs text-gray-600">{product.quantity}</TableCell>
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
         
          </Stack>
        </CardContent>
      </Card>
      <MaterialReactTable table={table} />
    </Box>
  );
}

export default ClientproductDeliveredTable;