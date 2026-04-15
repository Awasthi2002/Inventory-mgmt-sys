import React, { useMemo, useEffect, useState } from 'react';
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
import * as XLSX from 'xlsx';
import { FormControl, InputLabel, TextField } from '@mui/material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Add as AddIcon, PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  ContentCopy as CopyIcon,
  Print as PrintIcon, } from '@mui/icons-material';
import { Edit, Trash2, Eye, Edit as EditIcon, CreditCard, QrCode,DollarSign  } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import Swal from 'sweetalert2';
import { LinearProgress } from '@mui/material';
import config from "@/config";
import { useAuth } from '../auth/AuthContext';


export function EmpOrderTable() {
  const navigate = useNavigate();
   const { user } = useAuth(); 
  const [orderData, setOrderData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
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

  const statusOptions = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

  const handleStatusClick = (event, product, orderId) => {
    setAnchorEl(event.currentTarget);
    // Set selected product with orderId included
    setSelectedProduct({ ...product, orderId });
  };

  const handleStatusClose = () => {
    setAnchorEl(null);
    setSelectedProduct(null);
  };

  const handleViewClick = async (row) => {
    try {
      // Show confirmation dialog using Swal
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "This will mark all products in this order as delivered!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, mark as delivered!',
        cancelButtonText: 'Cancel'
      });
  
      // If user confirms
      if (result.isConfirmed) {
        // Show loading state
        Swal.fire({
          title: 'Updating...',
          text: 'Please wait while we update the order status',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
  
        // Make API call to update all products
        const response = await fetch(`${config.apiurl}/brands/${row.orderId}/complete-delivery`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          }
        });
  
        const data = await response.json();
  
        if (data.success) {
          // Show success message
          await Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'All products have been marked as delivered.',
            timer: 2000,
            showConfirmButton: false
          });
          
          // Refresh the order data
          const refreshResponse = await fetch(`${config.apiurl}/brands/get_all_ordered_product`);
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success) {
            setOrderData(refreshResult.data || []);
          }
        } else {
          // Show error message if API returns error
          await Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: data.message || 'Failed to update order status',
            confirmButtonColor: '#3085d6'
          });
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      // Show error message for unexpected errors
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An unexpected error occurred while updating the order status.',
        confirmButtonColor: '#3085d6'
      });
    }
  };

 


   


  const handleStatusChange = async (newStatus) => {
    if (selectedProduct) {
      // Debug logs
      console.log('Selected Product Complete Data:', selectedProduct);
      console.log('Order ID:', selectedProduct.orderId);
      console.log('Product ID:', selectedProduct.productId);
  
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
          console.log('Status updated successfully');
          // Refresh the data after successful update
          const refreshResponse = await fetch(`${config.apiurl}/brands/get-emplyee-productOrders/${user._id}`);
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success) {
            setOrderData(refreshResult.data || []);
          }
        } else {
          console.error('Failed to update status:', data.message);
        }
      } catch (err) {
        console.error('Error updating status:', err);
      }
    } else {
      console.warn('No product selected for status update');
    }
  
    handleStatusClose();
  };

  const renderPaymentMethodIcon = (paymentMethod) => {
    switch(paymentMethod) {
      case 'online':
        return <CreditCard size={16} />;
      case 'cod':
        return <DollarSign size={16} />; // Changed to a cash/dollar icon for COD
      default:
        return null;
    }
  };



// Add formatDateForAPI function
const formatDateForAPI = (date) => {
  return new Date(date).toISOString().split('T')[0];
};


// Modified fetchOrders to pass date range params
async function fetchOrders() {
  try {
    setIsLoading(true);
    const dateRangeParams = {
      startDate: formatDateForAPI(dateRange.startDate),
      endDate: formatDateForAPI(dateRange.endDate),
    };
    console.log('Sending date range to API:', dateRangeParams);

    const response = await fetch(
      `${config.apiurl}/brands/get-emplyee-productOrders/${user._id}?startDate=${dateRangeParams.startDate}&endDate=${dateRangeParams.endDate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Full API response:', result); // Debug log

    if (result.success) {
      setOrderData(result.data || []);
    } else {
      console.error('API error:', result.message);
      setError(result.message || 'Failed to fetch orders');
      setOrderData([]);
    }
  } catch (err) {
    console.error('Error fetching orders:', err);
    setError(err.message || 'Failed to fetch orders');
    setOrderData([]);
  } finally {
    setIsLoading(false);
  }
}

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
  fetchOrders();
}, [dateRange, user._id]);

const handleExportExcel = () => {
  const flattenedData = orderData.map(order => ({
    OrderID: order.orderId || 'N/A',
    BrandName: order.brandName?.brandName || 'N/A',
    OrderAmount: `₹${order.orderAmount?.toLocaleString() || '0'}`,
    DiscountAmount: `₹${order.discountAmount?.toLocaleString() || '0'}`,
    FinalAmount: `₹${order.finalAmount?.toLocaleString() || '0'}`,
    PlatformName: order.platformName || 'N/A', 
    CustomerName: order.username || 'N/A',
    AccountNo: order.accountNo || 'N/A',
    Password: order.password || 'N/A',
    EmployeeName: order.employeeName?.fullName || 'N/A',
    PaymentType: order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod === 'online' ? 'Online' : 'Not Specified',
    PhoneNumber: order.phoneNo || 'N/A',
    DeliveryPhone: order.deliveryPhoneNo || 'N/A',
    Address: order.fullAddress || 'N/A',
    CreatedDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
    ProductDetails: order.products?.map(p =>
      `${p.name || 'Unknown'} (ID: ${p.productId || 'N/A'}, Qty: ${p.quantity || 0}, Status: ${p.deliveryStatus || 'Not Set'})`
    ).join('; ') || 'No products',
    PaymentDetails: order.selectedAccount ?
      `Name: ${order.selectedAccount.name || 'N/A'}, Phone: ${order.selectedAccount.phoneNumber || 'N/A'}, ` +
      `Card Type: ${order.selectedAccount.cardDetails?.cardType || 'N/A'}, ` +
      `Card Number: ${order.selectedAccount.cardDetails?.cardNumber || 'N/A'}, ` +
      `Exp: ${order.selectedAccount.cardDetails?.expirationDate || 'N/A'}, ` +
      `CVV: ${order.selectedAccount.cardDetails?.cvv ? '*'.repeat(order.selectedAccount.cardDetails.cvv.length) : 'N/A'}` :
      'No payment details',
    Note: order.note || 'N/A',
    Screenshot: order.screenshot || 'No screenshot available' 
  }));

  const worksheet = XLSX.utils.json_to_sheet(flattenedData);

  const columnWidths = Object.keys(flattenedData[0]).map((key, colIndex) => {
    const maxWidth = flattenedData.reduce((max, row) => {
      const cellValue = row[key] ? row[key].toString() : '';
      return Math.max(max, cellValue.length);
    }, key.length); // Compare with header length
    return { wch: Math.min(maxWidth + 2, 60) }; // Add padding, cap at 60 characters
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
  const doc = new jsPDF({ orientation: 'landscape' }); // Landscape for wide table
  doc.setFontSize(14);
  doc.text('Orders Report', 5, 8); // Minimal top margin
  doc.setFontSize(8);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 5, 12); // Minimal top margin

  // Prepare table data
  const tableData = orderData.map(order => {
    try {
      return [
        order.orderId || 'N/A',
        order.brandName?.brandName || 'N/A',
        `₹${order.orderAmount?.toLocaleString() || '0'}`,
        `₹${order.discountAmount?.toLocaleString() || '0'}`,
        `₹${order.finalAmount?.toLocaleString() || '0'}`,
        order.platformName || 'N/A', // Added platformName
        order.username || 'N/A',
        order.accountNo || 'N/A',
        order.password || 'N/A',
        order.employeeName?.fullName || 'N/A',
        order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod === 'online' ? 'Online' : 'Not Specified',
        order.phoneNo || 'N/A',
        order.deliveryPhoneNo || 'N/A',
        order.fullAddress || 'N/A',
        order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
        order.products?.map(p =>
          `${p.name || 'Unknown'} (ID: ${p.productId || 'N/A'}, Qty: ${p.quantity || 0}, Status: ${p.deliveryStatus || 'Not Set'})`
        ).join('\n') || 'No products',
        order.selectedAccount ?
          `Name: ${order.selectedAccount.name || 'N/A'}\n` +
          `Phone: ${order.selectedAccount.phoneNumber || 'N/A'}\n` +
          `Card Type: ${order.selectedAccount.cardDetails?.cardType || 'N/A'}\n` +
          `Card Number: ${order.selectedAccount.cardDetails?.cardNumber || 'N/A'}\n` +
          `Exp: ${order.selectedAccount.cardDetails?.expirationDate || 'N/A'}\n` +
          `CVV: ${order.selectedAccount.cardDetails?.cvv ? '*'.repeat(order.selectedAccount.cardDetails.cvv.length) : 'N/A'}` :
          'No payment details',
        order.note || 'N/A',
        order.screenshot || 'No screenshot available' // Added screenshot
      ];
    } catch (error) {
      console.error(`Error processing order ${order.orderId || 'unknown'}:`, error);
      return Array(19).fill('Error'); // Fallback row, updated to 19 
    }
  });

  // Define headers
  const headers = [
    'Order ID', 'Brand Name', 'Order Amount', 'Discount Amount', 'Final Amount',
    'Platform Name', 'Customer Name', 'Account No', 'Password', 'Employee Name', // Added Platform Name
    'Payment Type', 'Phone Number', 'Delivery Phone', 'Address', 'Created Date',
    'Product Details', 'Payment Details', 'Note', 'Screenshot'
  ];

  // Calculate maximum content length for each column
  const columnWidths = headers.map((header, index) => {
    const maxWidth = tableData.reduce((max, row) => {
      const cellValue = row[index] ? row[index].toString() : '';
      const longestLine = cellValue.split('\n').reduce((lineMax, line) => Math.max(lineMax, line.length), 0);
      return Math.max(max, longestLine);
    }, header.length);
    return maxWidth; // Store character length for scaling
  });

  // Calculate total character width and scale to fit the full page
  const totalCharWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const pageWidth = doc.internal.pageSize.width - 6; // 297mm - 3mm left + 3mm right margins
  const mmPerChar = pageWidth / totalCharWidth; // Scale to fit full page
  const scaledWidths = columnWidths.map(width => width * mmPerChar * 1); // Increased to 0.5mm/char for wider columns

  // Create columnStyles object
  const columnStyles = scaledWidths.reduce((styles, width, index) => ({
    ...styles,
    [index]: {
      cellWidth: width,
      overflow: index === 15 || index === 16 || index === 13 ? 'linebreak' : 'ellipsize', // Wrap for Product Details, Payment Details, and Address
      minCellHeight: index === 15 || index === 16 || index === 13 ? 10 : 0 // Increased height for wrapped content
    }
  }), {});

  try {
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 16, // Reduced startY
      styles: {
        fontSize: 7, // Reduced font size for better fit
        cellPadding: 0.3, // Minimal padding
        overflow: 'linebreak',
        minCellHeight: 0
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7, // Match body font size
        cellPadding: 0.3 // Minimal header padding
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles,
      margin: { left: 3, right: 3, top: 16, bottom: 8 }, // Further reduced margins
      didParseCell: (data) => {
        if (data.column.index === 15 || data.column.index === 16 || data.column.index === 13) {
          data.cell.styles.valign = 'top';
          data.cell.styles.halign = 'left';
        }
      },
      didDrawPage: (data) => {
        // Add page number
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
    `₹${order.orderAmount?.toLocaleString() || '0'}`,
    `₹${order.discountAmount?.toLocaleString() || '0'}`,
    `₹${order.finalAmount?.toLocaleString() || '0'}`,
    order.platformName || 'N/A', // Added platformName
    order.username || 'N/A',
    order.accountNo || 'N/A',
    order.password || 'N/A',
    order.employeeName?.fullName || 'N/A',
    order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod === 'online' ? 'Online' : 'Not Specified',
    order.phoneNo || 'N/A',
    order.deliveryPhoneNo || 'N/A',
    order.fullAddress || 'N/A',
    order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
    order.products?.map(p =>
      `${p.name || 'Unknown'} (ID: ${p.productId || 'N/A'}, Qty: ${p.quantity || 0}, Status: ${p.deliveryStatus || 'Not Set'})`
    ).join('; ') || 'No products',
    order.selectedAccount ?
      `Name: ${order.selectedAccount.name || 'N/A'}, Phone: ${order.selectedAccount.phoneNumber || 'N/A'}, ` +
      `Card Type: ${order.selectedAccount.cardDetails?.cardType || 'N/A'}, ` +
      `Card Number: ${order.selectedAccount.cardDetails?.cardNumber || 'N/A'}, ` +
      `Exp: ${order.selectedAccount.cardDetails?.expirationDate || 'N/A'}, ` +
      `CVV: ${order.selectedAccount.cardDetails?.cvv ? '*'.repeat(order.selectedAccount.cardDetails.cvv.length) : 'N/A'}` :
      'No payment details',
    order.note || 'N/A',
    order.screenshot || 'No screenshot available' // Added screenshot
  ].join('\t')).join('\n');

  const header = [
    'Order ID', 'Brand Name', 'Order Amount', 'Discount Amount', 'Final Amount',
    'Platform Name', 'Customer Name', 'Account No', 'Password', 'Employee Name', // Added Platform Name
    'Payment Type', 'Phone Number', 'Delivery Phone', 'Address', 'Created Date',
    'Product Details', 'Payment Details', 'Note', 'Screenshot'
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
  // Check if orderData is empty
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

  // Define headers including platformName and screenshot
  const headers = [
    'Order ID',
    'Brand Name',
    'Order Amount',
    'Discount Amount',
    'Final Amount',
    'Platform Name',
    'Customer Name',
    'Account No',
    'Password',
    'Employee Name',
    'Payment Type',
    'Phone Number',
    'Delivery Phone',
    'Address',
    'Created Date',
    'Product Details',
    'Payment Details',
    'Note',
    'Screenshot',
  ];

  // Calculate maximum content length for each column
  const columnWidths = headers.map((header, index) => {
    const maxWidth = orderData.reduce((max, order) => {
      const values = [
        order.orderId || 'N/A',
        order.brandName?.brandName || 'N/A',
        `₹${order.orderAmount?.toLocaleString() || '0'}`,
        `₹${order.discountAmount?.toLocaleString() || '0'}`,
        `₹${order.finalAmount?.toLocaleString() || '0'}`,
        order.platformName || 'N/A',
        order.username || 'N/A',
        order.accountNo || 'N/A',
        order.password || 'N/A',
        order.employeeName?.fullName || 'N/A',
        order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod === 'online' ? 'Online' : 'Not Specified',
        order.phoneNo || 'N/A',
        order.deliveryPhoneNo || 'N/A',
        order.fullAddress || 'N/A',
        order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
        order.products
          ?.map(p => `${p.name || 'Unknown'} (ID: ${p.productId || 'N/A'}, Qty: ${p.quantity || 0}, Status: ${p.deliveryStatus || 'Not Set'})`)
          .join('; ') || 'No products',
        order.selectedAccount
          ? `Name: ${order.selectedAccount.name || 'N/A'}, Phone: ${order.selectedAccount.phoneNumber || 'N/A'}, ` +
            `Card Type: ${order.selectedAccount.cardDetails?.cardType || 'N/A'}, ` +
            `Card Number: ${order.selectedAccount.cardDetails?.cardNumber || 'N/A'}, ` +
            `Exp: ${order.selectedAccount.cardDetails?.expirationDate || 'N/A'}, ` +
            `CVV: ${order.selectedAccount.cardDetails?.cvv ? '*'.repeat(order.selectedAccount.cardDetails.cvv.length) : 'N/A'}`
          : 'No payment details',
        order.note || 'N/A',
        order.screenshot ? 'Screenshot' : 'No screenshot available', // Simplified for width calculation
      ];
      const cellValue = values[index] ? values[index].toString() : '';
      return Math.max(max, cellValue.length);
    }, header.length);
    return Math.min(maxWidth + 2, 60); // Add padding, cap at 60 characters
  });

  // Generate CSS for column widths
  const columnStyles = columnWidths.map((width, index) => `
    th:nth-child(${index + 1}), td:nth-child(${index + 1}) {
      width: ${width * 8}px;
      min-width: ${width * 8}px;
      max-width: ${width * 8}px;
      white-space: ${index === 15 || index === 16 || index === 13 ? 'pre-wrap' : 'nowrap'};
      text-align: left;
      padding: 8px;
      vertical-align: top; /* Align content to top for images */
    }
    /* Specific styling for screenshot column */
    td:nth-child(19) {
      padding: 4px;
    }
    td:nth-child(19) img {
      max-width: 100px;
      max-height: 100px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
  `).join('');

  // Generate table content
  const tableContent = orderData.map(order => `
    <tr>
      <td>${order.orderId || 'N/A'}</td>
      <td>${order.brandName?.brandName || 'N/A'}</td>
      <td>₹${order.orderAmount?.toLocaleString() || '0'}</td>
      <td>₹${order.discountAmount?.toLocaleString() || '0'}</td>
      <td>₹${order.finalAmount?.toLocaleString() || '0'}</td>
      <td>${order.platformName || 'N/A'}</td>
      <td>${order.username || 'N/A'}</td>
      <td>${order.accountNo || 'N/A'}</td>
      <td>${order.password || 'N/A'}</td>
      <td>${order.employeeName?.fullName || 'N/A'}</td>
      <td>${order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod === 'online' ? 'Online' : 'Not Specified'}</td>
      <td>${order.phoneNo || 'N/A'}</td>
      <td>${order.deliveryPhoneNo || 'N/A'}</td>
      <td>${order.fullAddress || 'N/A'}</td>
      <td>${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
      <td>${order.products
        ?.map(p => `${p.name || 'Unknown'} (ID: ${p.productId || 'N/A'}, Qty: ${p.quantity || 0}, Status: ${p.deliveryStatus || 'Not Set'})`)
        .join('<br>') || 'No products'}</td>
      <td>${order.selectedAccount
        ? `Name: ${order.selectedAccount.name || 'N/A'}, Phone: ${order.selectedAccount.phoneNumber || 'N/A'}, ` +
          `Card Type: ${order.selectedAccount.cardDetails?.cardType || 'N/A'}, ` +
          `Card Number: ${order.selectedAccount.cardDetails?.cardNumber || 'N/A'}, ` +
          `Exp: ${order.selectedAccount.cardDetails?.expirationDate || 'N/A'}, ` +
          `CVV: ${order.selectedAccount.cardDetails?.cvv ? '*'.repeat(order.selectedAccount.cardDetails.cvv.length) : 'N/A'}`
        : 'No payment details'}</td>
      <td>${order.note || 'N/A'}</td>
      <td>${
        order.screenshot
          ? `<img src="${order.screenshot}" alt="Screenshot" onerror="this.style.display='none';this.nextSibling.style.display='block';"><span style="display:none;">No screenshot available</span>`
          : 'No screenshot available'
      }</td>
    </tr>
  `).join('');

  // Write HTML to print window
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
            size: 120,
          },
          {
            accessorKey:'brandName.brandName',
            header:'Brand Name',
            size: 150,
          },
          {
            accessorKey: 'orderAmount',
            header: 'Amount',
            size: 50,
            Cell: ({ cell }) => (
              <Typography>
                ₹{cell.getValue()?.toLocaleString() || '0'}
              </Typography>
            ),
          },
          {
            accessorKey: 'discountAmount',
            header: 'Discount Amount',
            size: 50,
            Cell: ({ cell }) => (
              <Typography>
                ₹{cell.getValue()?.toLocaleString() || '0'}
              </Typography>
            ),
          },
          {
            accessorKey: 'finalAmount',
            header: 'Final Amount',
            size: 50,
            Cell: ({ cell }) => (
              <Typography>
                ₹{cell.getValue()?.toLocaleString() || '0'}
              </Typography>
            ),
          },
          {
            accessorKey: 'username',
            header: 'Customer Name',
            size: 150,
          },
        ],
      },
      {
        id: 'Account details',
        header: 'Account Details',
        columns: [
          {
            accessorKey: 'accountNo',
            header: 'Account No.',
            size: 120,
          },
            {
            accessorKey: 'platformName.name',
            header: 'Platform Name',
            size: 150,
          },
          {
            accessorKey:'password',
            header:'Password',
            size: 150,
          },
        ],
      },
      {
        id: 'employee',
        header: 'Employee Information',
        columns: [
          {
            accessorKey: 'employeeName.fullName',
            header: 'Employee Name',
            size: 150,
          },
        ],
      },
      {
        id: 'payment',
        header: 'Payment Method',
        columns: [
          {
            accessorKey: 'paymentMethod',
            header: 'Payment Type',
            size: 100,
            Cell: ({ cell }) => {
              const paymentMethod = cell.getValue();
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {renderPaymentMethodIcon(paymentMethod)}
                  <Chip 
                    label={
                      paymentMethod === 'cod' ? 'COD' : 
                      paymentMethod === 'online' ? 'Online' : 
                      'Not Specified'
                    } 
                    size="small" 
                    color={
                      paymentMethod === 'cod' ? 'default' : 
                      paymentMethod === 'online' ? 'primary' : 'default'
                    }
                  />
                </Box>
              );
            },
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
            accessorKey: 'deliveryPhoneNo',
            header: 'Delivery Phone',
            size: 150,
          },
          {
            accessorKey: 'fullAddress',
            header: 'Address',
            size: 200,
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
      {
        id: 'actions',
        header: 'Actions',
        size: 150,
        Cell: ({ row }) => {
          // Check if all products are delivered and have 0 remaining quantity
          const isFullyDelivered = row.original.products?.every(
            product => 
              product.deliveryStatus === 'Delivered' && 
              product.remaining_quantity === 0
          );
  
          return (
            <Box sx={{ display: 'flex', gap: '8px' }}>
              <Tooltip title={isFullyDelivered ? "All products delivered" : "Mark Order as Fully Delivered"}>
                <span> {/* Wrapper span to make disabled tooltip work */}
                  <IconButton
                    onClick={() => handleViewClick(row.original)}
                    size="small"
                    disabled={isFullyDelivered}
                    sx={{
                      backgroundColor: 'success.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'success.dark',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: 'rgba(0, 0, 0, 0.12)',
                        color: 'rgba(0, 0, 0, 0.26)',
                      }
                    }}
                  >
                    <Truck size={16} />
                  </IconButton>
                </span>
              </Tooltip>
          
            </Box>
          );
        },
      },
    ],
    [],
  );

  const renderSelectedAccountDetails = (row) => {
    return (
      <Box
        sx={{
          mt: 2,
          display: 'flex',
          gap: 1.5,
          backgroundColor: '#f0f0f0',
          borderRadius: 2,
          p: 1.5,
          alignItems: 'flex-start',
        }}
      >
        <Box
          sx={{
            width: '450px', // Fixed width for square shape
            height: '250px', // Fixed height for square shape
            p: 1.5,
            bgcolor: 'white',
            borderRadius: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'auto', // Handle overflow content
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center', // Center content for COD
            justifyContent: 'center', // Center content for COD
          }}
        >
          <Typography
            variant="h6"
            sx={{ mb: 0.5, fontWeight: 'bold', fontSize: '1.1rem' }}
          >
            Payment Method Details
          </Typography>

          {row.paymentMethod === 'cod' ? (
            <Box sx={{ mt: 1 }}>
              <Chip
                label="CASH ON DELIVERY"
                color="default"
                size="medium"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
          ) : (
            <Box sx={{ width: '100%', mt: 1 }}>
              <Box sx={{ display: 'flex', mb: 1, gap: 2 }}>
                <Typography variant="body2" sx={{ width: '120px', fontWeight: 'bold' }}>
                  Account Name:
                </Typography>
                <Typography variant="body2">
                  {row.selectedAccount?.name || 'Not Specified'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', mb: 1, gap: 2 }}>
                <Typography variant="body2" sx={{ width: '120px', fontWeight: 'bold' }}>
                  Registered Phone:
                </Typography>
                <Typography variant="body2">
                  {row.selectedAccount?.phoneNumber || 'Not Specified'}
                </Typography>
              </Box>

              {row.selectedAccount?.paymentType === 'card' && row.selectedAccount.cardDetails && (
                <Box sx={{ mt: 1.5, }}>
                  <Typography
                    variant="h5"
                    sx={{ mb: 0.5, fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }}
                  >
                    Card Information
                  </Typography>
                  <Box sx={{ display: 'flex', mb: 0.5, gap: 2 }}>
                    <Typography variant="body2" sx={{ width: '110px', fontWeight: 'bold' }}>
                      Card Type:
                    </Typography>
                    <Typography variant="body2">
                      {row.selectedAccount.cardDetails.cardType || 'Not Specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', mb: 0.5, gap: 2 }}>
                    <Typography variant="body2" sx={{ width: '110px', fontWeight: 'bold' }}>
                      Card Number:
                    </Typography>
                    <Typography variant="body2">
                      {row.selectedAccount.cardDetails.cardNumber || 'Not Specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', mb: 0.5, gap: 2 }}>
                    <Typography variant="body2" sx={{ width: '110px', fontWeight: 'bold' }}>
                      Expiration Date:
                    </Typography>
                    <Typography variant="body2">
                      {row.selectedAccount.cardDetails.expirationDate || 'Not Specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', mb: 0.5, gap: 2 }}>
                    <Typography variant="body2" sx={{ width: '110px', fontWeight: 'bold' }}>
                      CVV:
                    </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'semibold',color: 'text.secondary' }}>
    {row.selectedAccount.cardDetails.cvv || 'Not Specified'}
  </Typography>
                  </Box>
                </Box>
              )}

              {row.selectedAccount?.paymentType === 'upi' && row.selectedAccount.upiDetails && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography
                    variant="h6"
                    sx={{ mb: 0.5, fontWeight: 'bold', fontSize: '0.95rem' }}
                  >
                    UPI Information
                  </Typography>
                  <Box sx={{ display: 'flex', mb: 0.5, gap: 2 }}>
                    <Typography variant="body2" sx={{ width: '150px', fontWeight: 'bold' }}>
                      UPI ID:
                    </Typography>
                    <Typography variant="body2">
                      {row.selectedAccount.upiDetails.upiId || 'Not Specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', mb: 0.5, gap: 2 }}>
                    <Typography variant="body2" sx={{ width: '150px', fontWeight: 'bold' }}>
                      Bank Name:
                    </Typography>
                    <Typography variant="body2">
                      {row.selectedAccount.upiDetails.bankName || 'Not Specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', mb: 0.5, gap: 2 }}>
                    <Typography variant="body2" sx={{ width: '150px', fontWeight: 'bold' }}>
                      Account Number:
                    </Typography>
                    <Typography variant="body2">
                      {row.selectedAccount.upiDetails.accountNumber || 'Not Specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', mb: 0.5, gap: 2 }}>
                    <Typography variant="body2" sx={{ width: '150px', fontWeight: 'bold' }}>
                      IFSC Code:
                    </Typography>
                    <Typography variant="body2">
                      {row.selectedAccount.upiDetails.ifscCode || 'Not Specified'}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
    <Box
  sx={{
    width: '350px', // Fixed width
    height: '250px', // Fixed height
    p: 1.5,
    bgcolor: 'white',
    borderRadius: 1,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', // Center content horizontally
    justifyContent: 'center', // Center content vertically
  }}
>
  <Typography
    variant="h6"
    sx={{ mb: 1, fontWeight: 'bold', fontSize: '1.1rem' }}
  >
    Payment Screenshot
  </Typography>
  {row.screenshot ? (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        textAlign: 'center',
        width: '100%', // Ensure inner box takes full width
        height: '100%', // Ensure inner box takes full height
      }}
    >
      <Box
        component="img"
        src={row.screenshot}
        alt="Payment Screenshot"
        sx={{
          maxWidth: '100%', // Ensure image doesn't exceed container width
          maxHeight: '120px', // Limit height to fit within box
          objectFit: 'contain', // Maintain aspect ratio without cropping
          borderRadius: 1, // Optional: rounded corners for image
        }}
      />
      <Button
        variant="outlined"
        size="small"
        onClick={() => window.open(row.screenshot, '_blank')}
        sx={{
          textTransform: 'none',
          borderColor: 'primary.main',
          color: 'primary.main',
          '&:hover': {
            borderColor: 'primary.dark',
            backgroundColor: 'primary.light',
          },
          px: 2,
          py: 0.5,
        }}
      >
        Preview
      </Button>
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.screenshot.split('/').pop() || 'Screenshot'}
      </Typography>
    </Box>
  ) : (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      No screenshot available
    </Typography>
  )}
</Box>
      </Box>
    );
  };


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


  const getAvailableStatusOptions = (product) => {
    if (!product) return [];
    
    // If remaining quantity equals total quantity, show all options
    if (product.quantity === product.remaining_quantity) {
      return ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    }
    
    // If remaining quantity is between 0 and total quantity, only show Delivered
    if (product.quantity > product.remaining_quantity && product.remaining_quantity > 0) {
      return ['Delivered'];
    }
    
    // If remaining quantity is 0, return empty array (no options available)
    if (product.remaining_quantity === 0) {
      return [];
    }
    
    return []; // Default case, no options available
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
              {/* <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>pending delivery</TableCell> */}
              <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Delivered Quantity</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '200px' }}>Delivery Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {row.original.products?.map((product) => {
              const totalQuantity = product.quantity;
              const pendingQuantity = product.remaining_quantity;
              const deliveredQuantity = totalQuantity - pendingQuantity;
              
              // Determine delivery progress status
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
                  {/* <TableCell sx={{ width: '100px' }}>{product.remaining_quantity}</TableCell> */}
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
      {renderSelectedAccountDetails(row.original)}
        {row.original.note && (
          <Box sx={{ mt: 0.5, p: 0.5, backgroundColor: '#fff3e0', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.25 }}>
              Note:
            </Typography>
            <Typography>{row.original.note}</Typography>
          </Box>
        )}

        {/* Status Update Menu */}
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/Employee/order_product')}
          sx={{
            bgcolor: '#4F46E5',
            '&:hover': { bgcolor: '#3730A3' },
            textTransform: 'none',
            borderRadius: '8px',
            px: 3,
            py: 1
          }}
        >
          Order product
        </Button>
      </Stack>
    </CardContent>
  </Card>
   <MaterialReactTable table={table} />
  </Box>
  ) ;
}

export default EmpOrderTable;