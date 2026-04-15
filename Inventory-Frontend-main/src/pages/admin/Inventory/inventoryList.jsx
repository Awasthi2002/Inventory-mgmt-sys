
import React, { useState, useEffect, useMemo } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Popover,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ButtonGroup,
  Link,
} from '@mui/material';
import { 
  Add as AddIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  ContentCopy as CopyIcon,
  FileDownload as ExcelIcon,
  PictureAsPdf as PdfIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Edit, Delete, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '@/config';
import EnhancedImage from './inhancedImage';
import Swal from 'sweetalert2';
// Import required libraries for export functionality
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function InventoryList() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await axios.get(`${config.apiurl}/brands/get_all_inventory_list`);

      // Reverse the data array before setting it
      setData(response.data.data.reverse());
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleShowAllEmployees = (event, employees) => {
    setAnchorEl(event.currentTarget);
    setSelectedEmployees(employees);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setSelectedEmployees(null);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/placeholder-image.jpg';
    const cleanPath = imagePath.startsWith('/uploads') ? imagePath.slice(8) : imagePath;
    const baseUrl = config.apiurl.replace('/api', '');
    return `${baseUrl}/uploads/${cleanPath}`;
  };

  const handleEdit = (row) => {
    // Navigate to edit form with the row ID
    navigate(`/admin/inventory_list/edit_offer/${row.id}`);
  };

  const handleDelete = (row) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          const response = await fetch(`${config.apiurl}/brands/delete/${row.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to delete item');
          }
          fetchBrands();


          return true;
        } catch (error) {
          Swal.showValidationMessage(
            `Delete failed: ${error.message}`
          );
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire(
          'Deleted!',
          'Your item has been deleted.',
          'success'
        );
      }
    });
  };

// EXPORT FUNCTIONS
  
  // Function to prepare data for export (flatten nested structures with user-friendly product details)
  const prepareDataForExport = () => {
    return data.map(brand => ({
      ID: brand._id,
      'Brand Name': brand.brandName,
      'Client Name': brand.clientId?.fullName || 'N/A',
      'Products Count': brand.products.length,
      'Team Members': brand.employees.map(emp => emp.fullName).join(', '),
      'Products': brand.products
        .map(prod => 
          `• Name: ${prod.name}\n  Unit: ${prod.unit}\n  URL: ${prod.productUrl || 'N/A'}\n  Image: ${getImageUrl(prod.image)}\n  No Expiry: ${prod.noExpiry}\n  Expiry Date: ${prod.expiry_date || 'N/A'}`
        )
        .join('\n\n'),
      'ProductImages': brand.products.map(prod => getImageUrl(prod.image)) // Store image URLs for PDF
    }));
  };
  
  // Function to handle PDF export with images
  const handlePdfExport = async () => {
    try {
      const doc = new jsPDF();
      const exportData = prepareDataForExport();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Inventory List', 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
      
      // Create the table
      doc.autoTable({
        head: [['ID', 'Brand Name', 'Client Name', 'Products Count', 'Team Members', 'Products', 'Images']],
        body: await Promise.all(exportData.map(async item => {
          // Ensure ProductImages is an array
          const productImages = Array.isArray(item.ProductImages) ? item.ProductImages : [];
          
          // Load images for this row
          const imageCells = await Promise.all(productImages.map(async (imageUrl) => {
            try {
              // Fetch image as a data URL
              const response = await fetch(imageUrl, { mode: 'cors' });
              if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
              const blob = await response.blob();
              const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              return { image: dataUrl, width: 20, height: 20 }; // Define image dimensions
            } catch (error) {
              console.warn(`Failed to load image ${imageUrl}:`, error.message);
              return { text: 'Image not available' }; // Fallback if image fails
            }
          }));
          
          return [
            item.ID,
            item['Brand Name'],
            item['Client Name'],
            item['Products Count'],
            item['Team Members'],
            item['Products'],
            imageCells // Always an array
          ];
        })),
        startY: 35,
        styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 30 }, // ID
          1: { cellWidth: 20 }, // Brand Name
          2: { cellWidth: 20 }, // Client Name
          3: { cellWidth: 15 }, // Products Count
          4: { cellWidth: 25 }, // Team Members
          5: { cellWidth: 50 }, // Products
          6: { cellWidth: 25 }  // Images
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        didDrawCell: (data) => {
          if (data.column.index === 6 && data.cell.raw) {
            const cellX = data.cell.x + 2;
            let cellY = data.cell.y + 2;
            const cellWidth = data.cell.width - 4;
            const cellHeight = data.cell.height - 4;
            
            // Ensure data.cell.raw is an array
            const imageDataArray = Array.isArray(data.cell.raw) ? data.cell.raw : [];
            
            if (imageDataArray.length === 0) {
              doc.text('No images', cellX, cellY + 5);
              return;
            }
            
            imageDataArray.forEach((imgData, index) => {
              if (imgData.image) {
                try {
                  // Draw image, scaled to fit within cell
                  doc.addImage(
                    imgData.image,
                    imgData.image.includes('image/png') ? 'PNG' : 'JPEG', // Detect format
                    cellX,
                    cellY + (index * 22),
                    Math.min(imgData.width, cellWidth),
                    Math.min(imgData.height, cellHeight / imageDataArray.length),
                    null,
                    'FAST'
                  );
                } catch (error) {
                  console.warn('Failed to add image to PDF:', error.message);
                  doc.text('Image error', cellX, cellY + (index * 22) + 5);
                }
              } else {
                // Draw fallback text
                doc.text(imgData.text || 'Image not available', cellX, cellY + (index * 22) + 5);
              }
            });
          }
        }
      });
      
      // Save the PDF
      doc.save('inventory-list.pdf');
      
      // Show success notification
      Swal.fire({
        title: 'Success!',
        text: 'PDF has been downloaded successfully',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to generate PDF. Check console for details.',
        icon: 'error',
        timer: 3000,
        showConfirmButton: false
      });
    }
  };
  
  // Function to handle Excel export
  const handleExcelExport = () => {
    const exportData = prepareDataForExport();
    const worksheet = XLSX.utils.json_to_sheet(exportData.map(item => ({
      ID: item.ID,
      'Brand Name': item['Brand Name'],
      'Client Name': item['Client Name'],
      'Products Count': item['Products Count'],
      'Team Members': item['Team Members'],
      'Products': item['Products']
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    
    // Adjust column widths for Excel
    worksheet['!cols'] = [
      { wch: 30 }, // ID
      { wch: 20 }, // Brand Name
      { wch: 20 }, // Client Name
      { wch: 15 }, // Products Count
      { wch: 20 }, // Team Members
      { wch: 80 }  // Products
    ];
    
    // Generate file and trigger download
    XLSX.writeFile(workbook, 'inventory-list.xlsx');
    
    // Show success notification
    Swal.fire({
      title: 'Success!',
      text: 'Excel file has been downloaded successfully',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  };
  
  // Function to handle copy to clipboard
  const handleCopyToClipboard = () => {
    const exportData = prepareDataForExport();
    
    // Convert to tab-separated format with clean product formatting
    let textToCopy = 'ID\tBrand Name\tClient Name\tProducts Count\tTeam Members\tProducts\n';
    exportData.forEach(item => {
      // Replace newlines with spaces in Products for single-line clipboard output
      const productsFormatted = item['Products'].replace(/\n/g, '; ');
      textToCopy += `${item.ID}\t${item['Brand Name']}\t${item['Client Name']}\t${item['Products Count']}\t${item['Team Members']}\t${productsFormatted}\n`;
    });
    
    // Use the clipboard API to copy
    navigator.clipboard.writeText(textToCopy).then(() => {
      // Show success notification
      Swal.fire({
        title: 'Copied!',
        text: 'Data has been copied to clipboard',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }, (err) => {
      console.error('Could not copy text: ', err);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to copy data to clipboard',
        icon: 'error',
      });
    });
  };
  
  // Function to handle print
  const handlePrint = () => {
    // Create a hidden iframe to print only the table data
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    document.body.appendChild(printFrame);
    
    const exportData = prepareDataForExport();
    
    // Create print content
    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory List</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background-color: #4F46E5; color: white; text-align: left; padding: 10px; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ddd; vertical-align: top; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          h1 { color: #333; margin-bottom: 10px; }
          .header { margin-bottom: 20px; }
          .date { color: #666; font-size: 0.9em; margin-bottom: 20px; }
          .products { max-width: 400px; white-space: pre-wrap; font-size: 0.9em; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Inventory List</h1>
          <div class="date">Generated on: ${new Date().toLocaleDateString()}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">ID</th>
              <th style="width: 15%;">Brand Name</th>
              <th style="width: 15%;">Client Name</th>
              <th style="width: 10%;">Products Count</th>
              <th style="width: 15%;">Team Members</th>
              <th style="width: 45%;">Products</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    exportData.forEach(item => {
      printContent += `
        <tr>
          <td>${item.ID}</td>
          <td>${item['Brand Name']}</td>
          <td>${item['Client Name']}</td>
          <td>${item['Products Count']}</td>
          <td>${item['Team Members']}</td>
          <td class="products">${item['Products']}</td>
        </tr>
      `;
    });
    
    printContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    // Write to iframe and print
    printFrame.contentDocument.open();
    printFrame.contentDocument.write(printContent);
    printFrame.contentDocument.close();
    
    // Wait for content to load before printing
    printFrame.onload = function() {
      printFrame.contentWindow.print();
      // Remove the iframe after printing
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    };
  };

  const columns = useMemo(
    () => [
        {
            accessorKey: '_id',
            header: 'id',
            size: 150, 
          },
      {
        accessorKey: 'brandName',
        header: 'Brand Name',
        size: 100, 
        Cell: ({ cell }) => (
          <Typography 
            variant="body2" 
            sx={{ color: '#3b5998', fontWeight: 'bold' }} // Primary Blue for Brand Name
          >
            {cell.getValue()}
          </Typography>
        ),
      },
      {
        accessorKey: 'clientId',
        header: 'Client',
        size: 100,
        Cell: ({ cell }) => {
          const client = cell.getValue();
          return (
            <Typography variant="body2">
              {client?.fullName || 'N/A'}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'products',
        header: 'Products Count',
        size: 10,
        Cell: ({ cell }) => cell.getValue().length,
      },
      {
        accessorKey: 'employees',
        header: 'Team Members',
        size: 250,
        Cell: ({ cell }) => {
          const employees = cell.getValue();
          return (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {employees.slice(0, 2).map((employee) => (
                <Chip
                  key={employee._id}
                  label={employee.fullName}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: '24px', '& .MuiChip-label': { px: 1, py: 0 } }}
                />
              ))}
              {employees.length > 2 && (
                <Chip
                  label={`+${employees.length - 2} More`}
                  size="small"
                  color="default"
                  onClick={(e) => handleShowAllEmployees(e, employees)}
                  sx={{ 
                    height: '24px',
                    '& .MuiChip-label': { px: 1, py: 0 },
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      color: 'white'
                    }
                  }}
                />
              )}
              <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClosePopover}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                PaperProps={{
                  sx: {
                    p: 2,
                    maxWidth: '400px',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>All Team Members</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedEmployees?.map((employee) => (
                    <Chip
                      key={employee._id}
                      label={employee.fullName}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Box>
              </Popover>
            </Box>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 80,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: '4px' }}>
            <Tooltip title="Edit">
              <IconButton onClick={() => handleEdit(row)} size="small">
                <Edit className="h-6 w-6" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton 
                onClick={() => handleDelete(row)}
                size="small"
                color="error"
                sx={{ padding: '4px' }}
              >
                <Delete className="h-6 w-6" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [anchorEl],
  );

const renderDetailPanel = ({ row }) => (
    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '8px', boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)' }}>
      <Typography variant="h6" gutterBottom sx={{ 
        color: '#1e40af', 
        fontWeight: 600, 
        borderBottom: '2px solid #e2e8f0',
        pb: 1,
        mb: 2
      }}>
        Products
      </Typography>
      <MaterialReactTable
        columns={[
          {
            accessorKey: 'productId',
            header: 'Product ID',
            size: 120,
            Cell: ({ cell }) => (
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#64748b' }}>
                {cell.getValue()}
              </Typography>
            ),
          },
          {
            accessorKey: 'name',
            header: 'Product Details',
            size: 400,
            Cell: ({ row }) => (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                width: '100%'
              }}>
                {/* First row: Image, Name and Expiry Status */}
                <Box sx={{ display: 'flex', width: '100%', mb: 1.5 }}>
                  <Box sx={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: '4px', 
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#fff',
                    flexShrink: 0
                  }}>
                    <EnhancedImage
                      src={getImageUrl(row.original.image)}
                      alt={row.original.name}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain'
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ ml: 2, flex: 1 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      alignItems: 'center', 
                      gap: 1 
                    }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#0f172a', 
                          fontWeight: 600, 
                          lineHeight: 1.3,
                          wordBreak: 'break-word',
                          width: '100%',
                          mb: 0.5
                        }}
                      >
                        {row.original.name}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        {/* Expiry status */}
                        {row.original.noExpiry ? (
                          <Chip 
                            label="No Expiry" 
                            color="success" 
                            size="small"
                            sx={{ 
                              height: '22px', 
                              '& .MuiChip-label': { px: 1, py: 0 },
                              bgcolor: '#dcfce7',
                              color: '#166534',
                              fontWeight: 500
                            }}
                          />
                        ) : row.original.expiry_date ? (
                          <Chip
                            label={`Exp: ${new Date(row.original.expiry_date).toLocaleDateString()}`}
                            color={new Date(row.original.expiry_date) < new Date() ? 'error' : 'warning'}
                            size="small"
                            sx={{ 
                              height: '22px', 
                              '& .MuiChip-label': { px: 1, py: 0 },
                              bgcolor: new Date(row.original.expiry_date) < new Date() ? '#fee2e2' : '#fef3c7',
                              color: new Date(row.original.expiry_date) < new Date() ? '#b91c1c' : '#854d0e',
                              fontWeight: 500
                            }}
                          />
                        ) : null}
                        
                        {/* Unit info */}
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: '#64748b',
                            bgcolor: '#f1f5f9',
                            px: 1,
                            py: 0.5,
                            borderRadius: '4px'
                          }}
                        >
                          Unit: {row.original.unit}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                
                {/* Second row: Product URL with external link button */}
                {row.original.productUrl && (
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'flex-start',
                    mt: 0.5,
                    bgcolor: '#eff6ff',
                    p: 1,
                    borderRadius: '4px',
                    border: '1px solid #dbeafe'
                  }}>
                    <LinkIcon sx={{ 
                      fontSize: '16px', 
                      mr: 1, 
                      flexShrink: 0, 
                      color: '#3b82f6',
                      mt: 0.25
                    }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#3b82f6',
                          wordBreak: 'break-all'
                        }}
                      >
                        <Link 
                          href={row.original.productUrl} 
                          target="_blank"
                          underline="hover"
                          sx={{ color: 'inherit', fontSize: 'inherit' }}
                        >
                          {row.original.productUrl}
                        </Link>
                      </Typography>
                    </Box>
                    <Tooltip title="Visit Product URL">
                      <IconButton 
                        href={row.original.productUrl} 
                        target="_blank"
                        size="small"
                        color="primary"
                        sx={{ ml: 1, p: 0.5, flexShrink: 0 }}
                      >
                        <ExternalLink size={16} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>
            ),
          }
        ]}
        data={row.original.products}
        enableTopToolbar={false}
        enableBottomToolbar={false}
        enableColumnActions={false}
        enableColumnFilters={false}
        enablePagination={false}
        enableSorting={true}
        muiTableBodyRowProps={{
          sx: {
            backgroundColor: '#fff',
            '&:hover': {
              backgroundColor: '#f1f5f9',
            },
            '&:nth-of-type(odd)': {
              backgroundColor: '#f8fafc',
            },
          },
        }}
        muiTableProps={{
          sx: {
            tableLayout: 'fixed',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden',
            '& .MuiTableCell-head': {
              bgcolor: '#f1f5f9',
              color: '#334155',
              fontWeight: 600,
            },
            '& .MuiTableCell-root': {
              padding: '16px',
              borderBottom: '1px solid #e2e8f0',
            },
          },
        }}
      />
    </Box>
  );

  // Custom toolbar component with export buttons
  const renderTopToolbar = ({ table }) => (
    <Box
      sx={{
        display: 'flex',
        gap: '16px',
        padding: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {table.getHeaderGroups()[0].headers.find(header => header.column.getCanFilter()) && (
          <Button
            onClick={() => table.setShowColumnFilters(!table.getState().showColumnFilters)}
            variant={table.getState().showColumnFilters ? 'contained' : 'outlined'}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            {table.getState().showColumnFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        )}
        {table.getState().showGlobalFilter && (
          <Box sx={{ flex: 1 }}>
            {table.getPrePaginationRowModel().rows.length > 0 && (
              <Box sx={{ fontWeight: 'bold' }}>
                {table.getPrePaginationRowModel().rows.length} Results
              </Box>
            )}
          </Box>
        )}
      </Box>
      
      {/* Export buttons */}
      <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <ButtonGroup variant="outlined" size="small" aria-label="export options">
          <Tooltip title="Export as PDF">
            <Button 
              onClick={handlePdfExport}
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
              onClick={handleExcelExport}
              startIcon={<ExcelIcon />}
              sx={{ textTransform: 'none' }}
            >
              Excel
            </Button>
          </Tooltip>
        </ButtonGroup>
        {/* Search field gets rendered automatically in the default position */}
      </Box>
    </Box>
  );

  const table = useMaterialReactTable({
    columns,
    data,
    enableExpandAll: true,
    enableExpanding: true,
    enableColumnFilters: true,
    enableColumnOrdering: true,
    enableGlobalFilter: true,
    enablePinning: true,
    enableRowSelection: false,
    getRowId: (row) => row._id,
    initialState: {
      showColumnFilters: false,
      showGlobalFilter: true,
      density: 'compact',
    },
    paginationDisplayMode: 'pages',
    positionToolbarAlertBanner: 'bottom',
    renderDetailPanel,
    renderTopToolbar, // Use custom toolbar with export buttons

    muiSearchTextFieldProps: {
      placeholder: 'Search brands, products, or team members...',
      variant: 'outlined',
      size: 'small',
      sx: { minWidth: '300px' }
    },
    state: {
      isLoading: loading,
      showAlertBanner: error !== null,
      showProgressBars: loading,
    },

    muiTableProps: {
      sx: {
        '& .MuiTableCell-root': {
          padding: '8px', // Reduced cell padding
        },
      },
    },
    // Custom table head cell styles
    muiTableHeadCellProps: {
      sx: {
        fontSize: '0.875rem',
        fontWeight: 'bold',
        padding: '8px',
      },
    },
    // Custom table body cell styles
    muiTableBodyCellProps: {
      sx: {
        fontSize: '0.875rem',
        padding: '8px',
      },
    },
    // Customize toolbar styles
    muiTopToolbarProps: {
      sx: {
        gap: '0.5rem',
        p: '0.5rem',
      },
    },
  });

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box >
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
                Inventory List
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/admin/inventory_list/add_offer')}
                sx={{
                  bgcolor: '#4F46E5',
                  '&:hover': { bgcolor: '#3730A3' },
                  textTransform: 'none',
                  borderRadius: '8px',
                  px: 3,
                  py: 1
                }}
              >
                Add Offer
              </Button>
            </Stack>
          </CardContent>
        </Card>
        <MaterialReactTable table={table} />
      </Box>
    </LocalizationProvider>
  );
}

export default InventoryList;