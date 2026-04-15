
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
import EnhancedImage from '../../admin/Inventory/inhancedImage';
import Swal from 'sweetalert2';
// Import required libraries for export functionality
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../../auth/AuthContext';


export function ClientinventoryList() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await axios.get(`${config.apiurl}/client/inventory/${user._id}`);

      // Reverse the data array before setting it
      setData(response.data.data.reverse());
      console.log(response.data.data);
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



  // Function to prepare data for export
  const prepareDataForExport = () => {
    return data.map(item => ({
      ID: item._id || 'N/A',
      'Brand Name': item.brandName || 'N/A',
      'Products Count': item.products?.length || 0,
      'Team Members': item.employees?.map(emp => emp.fullName).join(', ') || 'N/A',
      'Products': item.products
        ?.map(p => `${p.name || 'Unknown'} (ID: ${p.productId || 'N/A'}, Unit: ${p.unit || 'N/A'}, Expiry: ${p.noExpiry ? 'No Expiry' : p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : 'N/A'})`)
        .join('; ') || 'No products',
      'ProductImages': item.products?.map(p => getImageUrl(p.image)) || [],
    }));
  };

  const handleExcelExport = () => {
    try {
      const exportData = prepareDataForExport();
      const worksheet = XLSX.utils.json_to_sheet(
        exportData.map(item => ({
          ID: item.ID,
          'Brand Name': item['Brand Name'],
          'Products Count': item['Products Count'],
          'Team Members': item['Team Members'],
          'Products': item['Products'],
          'Images': item['ProductImages'].join('; ') || 'No images', // Add Images column
        }))
      );

      worksheet['!cols'] = [
        { wch: 30 }, // ID
        { wch: 20 }, // Brand Name
        { wch: 15 }, // Products Count
        { wch: 25 }, // Team Members
        { wch: 80 }, // Products
        { wch: 60 }, // Images
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
      XLSX.writeFile(workbook, `Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);

      Swal.fire({
        icon: 'success',
        title: 'Exported!',
        text: 'Excel file has been downloaded.',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Failed to generate Excel file. Check console for details.',
        timer: 3000,
        showConfirmButton: false,
      });
    }
  };

  const handlePdfExport = async () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(14);
      doc.text('Inventory List', 3, 6); // Reduced top margin for title
      doc.setFontSize(8);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 3, 10); // Reduced top margin for date

      const exportData = prepareDataForExport();
      const tableData = exportData.map(item => [
        item.ID,
        item['Brand Name'],
        item['Products Count'],
        item['Team Members'],
        item['Products'],
        item['ProductImages'].join('\n') || 'No images',
      ]);

      const headers = ['ID', 'Brand Name', 'Products Count', 'Team Members', 'Products', 'Images'];

      // Calculate maximum content length for each column
      const columnWidths = headers.map((header, index) => {
        const maxWidth = exportData.reduce((max, row) => {
          const cellValue = row[Object.keys(row)[index]] ? row[Object.keys(row)[index]].toString() : '';
          const longestLine = cellValue.split('\n').reduce((lineMax, line) => Math.max(lineMax, line.length), 0);
          return Math.max(max, longestLine);
        }, header.length);
        return maxWidth;
      });

      // Calculate total page width and scale columns to fit
      const pageWidth = doc.internal.pageSize.width - 6; // Minimal margins (3mm each side)
      const totalCharWidth = columnWidths.reduce((sum, width) => sum + width, 0);
      const mmPerChar = pageWidth / totalCharWidth; // Scale to fit full page width
      const scaledWidths = columnWidths.map(width => width * mmPerChar * 1); // Increased scaling factor to 1 for maximum width

      // Define column styles with dynamic widths
      const columnStyles = scaledWidths.reduce(
        (styles, width, index) => ({
          ...styles,
          [index]: {
            cellWidth: width,
            overflow: index === 4 || index === 5 ? 'linebreak' : 'ellipsize',
            minCellHeight: index === 4 || index === 5 ? 10 : 0,
          },
        }),
        {}
      );

      doc.autoTable({
        head: [headers],
        body: tableData,
        startY: 12, // Reduced startY to maximize table space
        styles: { fontSize: 7, cellPadding: 0.4, overflow: 'linebreak' }, // Slightly reduced cellPadding
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 0.4,
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles,
        margin: { left: 3, right: 3, top: 12, bottom: 6 }, // Minimal margins
        didParseCell: (data) => {
          if (data.column.index === 4 || data.column.index === 5) {
            data.cell.styles.valign = 'top';
            data.cell.styles.halign = 'left';
          }
        },
        didDrawPage: (data) => {
          doc.setFontSize(7);
          doc.text(`Page ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 3);
        },
      });

      doc.save(`Inventory_${new Date().toISOString().split('T')[0]}.pdf`);

      Swal.fire({
        icon: 'success',
        title: 'Exported!',
        text: 'PDF file has been downloaded.',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Failed to generate PDF. Check console for details.',
        timer: 3000,
        showConfirmButton: false,
      });
    }
  };

  // Copy to Clipboard
  const handleCopyToClipboard = () => {
    try {
      const exportData = prepareDataForExport();
      const header = ['ID', 'Brand Name', 'Products Count', 'Team Members', 'Products', 'Images'].join('\t');
      const text = exportData
        .map(item => [
          item.ID,
          item['Brand Name'],
          item['Products Count'],
          item['Team Members'],
          item['Products'],
          item['ProductImages'].join('; ') || 'No images',
        ].join('\t'))
        .join('\n');

      navigator.clipboard.writeText(`${header}\n${text}`).then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Copied!',
          text: 'Data copied to clipboard.',
          timer: 1500,
          showConfirmButton: false,
        });
      });
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      Swal.fire({
        icon: 'error',
        title: 'Copy Failed',
        text: 'Failed to copy data to clipboard.',
        timer: 3000,
        showConfirmButton: false,
      });
    }
  };

  // Print functionality
  const handlePrint = () => {
    if (!data || data.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Data',
        text: 'No inventory data available to print.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    const exportData = prepareDataForExport();
    const headers = ['ID', 'Brand Name', 'Products Count', 'Team Members', 'Products', 'Images'];

    const columnWidths = headers.map((header, index) => {
      const maxWidth = exportData.reduce((max, row) => {
        const cellValue = row[Object.keys(row)[index]] ? row[Object.keys(row)[index]].toString() : '';
        return Math.max(max, cellValue.length);
      }, header.length);
      return Math.min(maxWidth + 2, 60);
    });

    const columnStyles = columnWidths
      .map(
        (width, index) => `
      th:nth-child(${index + 1}), td:nth-child(${index + 1}) {
        width: ${width * 8}px;
        min-width: ${width * 8}px;
        max-width: ${width * 8}px;
        white-space: ${index === 5 || index === 6 ? 'pre-wrap' : 'nowrap'};
        text-align: left;
        padding: 8px;
        vertical-align: top;
      }
    `
      )
      .join('');

    const tableContent = exportData
      .map(
        item => `
      <tr>
        <td>${item.ID}</td>
        <td>${item['Brand Name']}</td>
        <td>${item['Products Count']}</td>
        <td>${item['Team Members']}</td>
        <td>${item['Products'].replace(/; /g, '<br>')}</td>
        <td>${item['ProductImages'].join('<br>') || 'No images'}</td>
      </tr>
    `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Inventory</title>
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
            }
          </style>
        </head>
        <body>
          <h2>Inventory List</h2>
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
            size: 150,
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

            </Stack>
          </CardContent>
        </Card>
        <MaterialReactTable table={table} />
      </Box>
    </LocalizationProvider>
  );
}

export default ClientinventoryList;