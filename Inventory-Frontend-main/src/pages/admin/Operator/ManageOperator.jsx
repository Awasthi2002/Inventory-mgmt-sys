import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardBody, Button,
  DialogFooter,
  DialogHeader,
  DialogBody,
  Input,
  Select,
  Option, 
} from "@material-tailwind/react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  Box, Typography, Button as MUIButton,
  Dialog, MenuItem, Select as MUISelect,
} from "@mui/material";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import PrintIcon from "@mui/icons-material/Print";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import GridOnIcon from "@mui/icons-material/GridOn";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";
import BlockIcon from "@mui/icons-material/Block";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LoginIcon from "@mui/icons-material/Login";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import axios from "axios";
import Swal from 'sweetalert2'; // Import SweetAlert2
import config from "@/config";
import { useAuth } from '../../auth/AuthContext';

export function OperatorManage() {
  const navigate = useNavigate();
  const { user, loginAs } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employee, newEmployee] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
  });
  const [errors, setErrors] = useState({
    phone: '',
    // other field errors
  });
  const roleOptions = [
    { value: "User", label: "User" },
    { value: "Employee", label: "Employee" },
  ];


  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await axios.get(`${config.apiurl}/operators`);
        setEmployees(prevEmployees => [newEmployee, ...prevEmployees]);
        setEmployees(response.data.reverse());
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchEmployees();
  }, []);


  const handleAddClient = () => {
    navigate('/admin/operators/addOperators');
  }




  const handleAction = async (action, id) => {
    try {
      let response;
      let confirmOptions = {
        text: `Are you sure you want to ${action.toLowerCase()} this employee?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: `Yes, ${action.toLowerCase()} it!`
      };

      switch (action) {
        case 'Approve':
          const approveResult = await Swal.fire(confirmOptions);
          if (approveResult.isConfirmed) {
            response = await axios.put(`${config.apiurl}/employees/${id}/approve`);
          }
          break;
        case 'Cancel':
          const cancelResult = await Swal.fire(confirmOptions);
          if (cancelResult.isConfirmed) {
            response = await axios.put(`${config.apiurl}/employees/${id}/cancel`);
          }
          break;
        case 'Ban':
          const banResult = await Swal.fire(confirmOptions);
          if (banResult.isConfirmed) {
            response = await axios.put(`${config.apiurl}/employees/${id}/ban`);
          }
          break;
        case 'Delete':
          const deleteResult = await Swal.fire({
            title: 'Are you sure?',
            text: 'You won’t be able to revert this!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
          });
          if (deleteResult.isConfirmed) {
            response = await axios.delete(`${config.apiurl}/employees/${id}`);
            if (response.status === 200) {
              setEmployees(prevEmployees => prevEmployees.filter(emp => emp._id !== id));
              Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Client has been deleted.',
                confirmButtonColor: '#008000'
              });
              return;
            }
          } else {
            return;
          }
          break;
        case 'Edit':
          response = await axios.get(`${config.apiurl}/employees/${id}`);
          if (response.status === 200) {
            const employeeToEdit = response.data;
            setEditingEmployee(employeeToEdit);
            setFormData({
              fullName: employeeToEdit.fullName,
              email: employeeToEdit.email,
              phone: employeeToEdit.phone,
              role: employeeToEdit.role,
            });
            setOpenEditDialog(true);
          }
          return;
        case 'Login':
          loginAs(id);  // Call loginAs function with the employee ID
          return;
        default:
          console.log(`${action} action on id ${id}`);
          return;
      }

      if (response && response.data) {
        setEmployees(prevEmployees =>
          prevEmployees.map(emp =>
            emp._id === id ? { ...emp, ...response.data } : emp
          )
        );
        Swal.fire({
          icon: 'success',
          title: `${action} Successful`,
          text: `Employee ${action.toLowerCase()}ed successfully.`,
          confirmButtonColor: '#080'
        });
      }
    } catch (error) {
      console.error(`Error ${action.toLowerCase()}ing employee:`, error);
      Swal.fire({
        icon: 'error',
        title: `Failed to ${action.toLowerCase()}`,
        text: `Failed to ${action.toLowerCase()} employee.`,
        confirmButtonColor: '#d33'
      });
    }
  };




  const handleSaveEdit = async () => {
    const errors = {};

    // Validation: Check if all required fields are filled
    if (!formData.fullName) {
      errors.fullName = 'Full Name is required.';
    }
    if (!formData.email) {
      errors.email = 'Email is required.';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Invalid email format. Ensure it includes "@" and ".com".';
    }
    if (!formData.role) {
      errors.role = 'Role is required.';
    }

    // If there are errors, set the error state and stop execution
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      // Sending PUT request to update the employee data
      const response = await axios.put(`${config.apiurl}/employees/${editingEmployee._id}`, formData);

      if (response.status === 200) {
        // Update the employees list with the edited employee details
        setEmployees(prevEmployees =>
          prevEmployees.map(emp =>
            emp._id === editingEmployee._id ? { ...emp, ...formData } : emp
          )
        );
        // Close the edit dialog and reset the editing employee state
        setOpenEditDialog(false);
        setEditingEmployee(null);

        // Show success notification
        Swal.fire({
          title: 'Updated Successfully',
          text: 'Employee updated successfully.',
          icon: 'success',
          confirmButtonColor: "#008000" // Optional: Customize the button color
        });
      }
    } catch (error) {
      // Show error notification if the update fails
      Swal.fire({
        title: 'Update Failed',
        text: 'Failed to update employee.',
        icon: 'error',
        confirmButtonColor: '#d33' // Optional: Customize the button color for error
      });
    }
  };

  // Function to validate email format
  const validateEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Validation for phone number field
    if (name === 'phone') {
      if (!/^\d*$/.test(value)) {
        setErrors(prevErrors => ({
          ...prevErrors,
          phone: 'Phone number must contain only digits.'
        }));
      } else if (value.length > 10) {
        setErrors(prevErrors => ({
          ...prevErrors,
          phone: 'Phone number must be exactly 10 digits.'
        }));
      } else {
        setErrors(prevErrors => ({
          ...prevErrors,
          phone: ''
        }));
      }
    }

    // Update form data
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };


  const sanitizeData = (data) => {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value || null])
    );
  };

  const columns = useMemo(
    () => [
      { accessorKey: '_id', header: 'ID', size: 50 },
      {
        accessorKey: 'fullName',
        header: 'Name',
        size: 150,
        Cell: ({ row }) => {
          const data = sanitizeData(row.original);
          return (
            <span
              className="text-blue-600 cursor-pointer"
              onClick={() => navigate(`/admin/employees/link/${data._id}`)}
            >
              {data.fullName}
            </span>
          );
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        size: 150,
        Cell: ({ row }) => {
          const data = sanitizeData(row.original);
          return <span>{data.email}</span>;
        },
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        size: 150,
        Cell: ({ row }) => {
          const data = sanitizeData(row.original);
          return <span>{data.phone}</span>;
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 100,
        Cell: ({ cell }) => {
          const status = cell.getValue();
          let color, text;

          switch (status) {
            case 1:
              color = 'green';
              text = 'Active';
              break;
            case 0:
              color = 'red';
              text = 'Inactive';
              break;
            case 2:
              color = 'orange';
              text = 'Pending';
              break;
            case 3:
              color = 'purple';
              text = 'Banned';
              break;
            default:
              color = 'grey';
              text = 'Unknown';
          }

          return (
            <Typography component="span" sx={{ color: color, fontWeight: 'bold' }}>
              {text}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'role',
        header: 'Role',
        size: 100,
        Cell: ({ row }) => {
          const data = sanitizeData(row.original);
          return <span>{data.role}</span>;
        },
      },
      {
        accessorKey: 'action',
        header: 'Action',
        size: 200,
        Cell: ({ row }) => {
          const data = sanitizeData(row.original);
          return (
            <Box display="flex" justifyContent="space-between" gap={1} className="flex-wrap md:flex-nowrap">
              <MUIButton
                size="small"
                variant="contained"
                color="success"
                onClick={() => handleAction('Approve', data._id)}
                sx={{ minWidth: 'unset', width: '32px', height: '32px' }}
              >
                <CheckIcon fontSize="small" />
              </MUIButton>
              <MUIButton
                size="small"
                variant="contained"
                color="error"
                onClick={() => handleAction('Cancel', data._id)}
                sx={{ minWidth: 'unset', width: '32px', height: '32px' }}
              >
                <CancelIcon fontSize="small" />
              </MUIButton>
              <MUIButton
                size="small"
                variant="contained"
                color="error"
                onClick={() => handleAction('Ban', data._id)}
                sx={{ minWidth: 'unset', width: '32px', height: '32px' }}
              >
                <BlockIcon fontSize="small" />
              </MUIButton>
              <MUIButton
                size="small"
                variant="contained"
                color="info"
                onClick={() => handleAction('Edit', data._id)}
                sx={{ minWidth: 'unset', width: '32px', height: '32px' }}
              >
                <EditIcon fontSize="small" />
              </MUIButton>
              <MUIButton
                size="small"
                variant="contained"
                color="error"
                onClick={() => handleAction('Delete', data._id)}
                sx={{ minWidth: 'unset', width: '32px', height: '32px' }}
              >
                <DeleteIcon fontSize="small" />
              </MUIButton>
              <MUIButton
                size="small"
                variant="contained"
                color="warning"
                onClick={() => handleAction('Login', data._id)}
                disabled={data.status === 3}
                sx={{ minWidth: 'unset', width: '32px', height: '32px' }}
              >
                <LoginIcon fontSize="small" />
              </MUIButton>
            </Box>
          );
        },
      },
    ],
    []
  );


  const table = useMaterialReactTable({
    columns,
    data: employees,
    density: 'compact',
    muiTableBodyRowProps: {
        sx: {
            height: '40px',  // Slightly taller for better content visibility
            transition: 'background-color 0.15s ease',  // Smooth hover transition
            '&:hover': {
                backgroundColor: 'rgba(245, 247, 250, 0.85)',  // Softer hover effect
            },
            '&:nth-of-type(odd)': {
                backgroundColor: 'rgba(0, 0, 0, 0.02)',  // Subtle zebra striping
            },
            '& td': {
                padding: '6px 12px',  // Better horizontal spacing
                borderBottom: '1px solid rgba(224, 224, 224, 0.8)',  // Lighter border
            },
        },
    },
    muiTableBodyCellProps: {
        sx: {
            fontSize: '0.875rem',  // Slightly larger for better readability
            lineHeight: '1',     // Improved line height
            whiteSpace: 'nowrap',
            fontWeight: 450,       // Slightly reduced weight for better legibility
            color: 'rgba(0, 0, 0, 0.87)',  // Better contrast
            transition: 'color 0.15s ease',
            '&:hover': {
                color: 'rgba(0, 0, 0, 0.95)',  // Subtle text emphasis on hover
            },
        },
    },
    muiTableProps: {
        sx: {
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',  // Subtle table shadow
            borderRadius: '4px',    // Rounded corners
            overflow: 'hidden',     // Ensures radius clips content
            '& .MuiTableRow-root': {
                borderSpacing: 0,
                margin: 0,
            },
        },
    },
    muiTableHeadCellProps: {
        sx: {
            padding: '8px 12px',    // Consistent with body padding
            background: '#f8f9fa',  // Lighter header background
            fontWeight: 600,
            color: 'rgba(0, 0, 0, 0.95)',
            fontSize: '0.875rem',
            letterSpacing: '0.01em',  // Subtle letter spacing
            textTransform: 'uppercase',  // Optional: makes headers more distinct
            borderBottom: '2px solid rgba(224, 224, 224, 1)',  // Stronger header border
            '&:hover': {
                backgroundColor: '#f0f2f5',  // Subtle header hover effect
            },
        },
    },
    renderTopToolbarCustomActions: () => (
      <Box display="flex" alignItems="center" className="flex-col md:flex-row">
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {/* Optional title or header */}
        </Typography>
        <Box sx={{ display: 'flex', gap: '8px', mt: ['2', '0'], flexWrap: 'wrap' }} className="mt-2 md:mt-0">
          <MUIButton onClick={handleCopy} sx={{ color: 'orange', minWidth: 'unset', width: '32px', height: '32px' }} className="w-8 h-8 mb-2 md:mb-0">
            <FileCopyIcon fontSize="small" />
          </MUIButton>
          <MUIButton onClick={handlePrint} sx={{ color: 'black', minWidth: 'unset', width: '32px', height: '32px' }} className="w-8 h-8 mb-2 md:mb-0">
            <PrintIcon fontSize="small" />
          </MUIButton>
          <MUIButton onClick={handleDownloadPdf} sx={{ color: 'red', minWidth: 'unset', width: '32px', height: '32px' }} className="w-8 h-8 mb-2 md:mb-0">
            <PictureAsPdfIcon fontSize="small" />
          </MUIButton>
          <MUIButton onClick={handleDownloadExcel} sx={{ color: 'green', minWidth: 'unset', width: '32px', height: '32px' }} className="w-8 h-8 mb-2 md:mb-0">
            <GridOnIcon fontSize="small" />
          </MUIButton>
        </Box>
      </Box>
    ),
  });

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  };
  
  const getStatusText = (status) => {
    switch (status) {
      case 1:
        return 'Active';
      case 0:
        return 'Paused';
      case 2:
        return 'Expired';
      default:
        return 'Unknown';
    }
  };
  
  const getFormattedValue = (row, accessorKey) => {
    if (!accessorKey) return '';
    
    // Handle nested properties (e.g., 'client_id.fullName')
    if (accessorKey.includes('.')) {
      const [parent, child] = accessorKey.split('.');
      return row[parent]?.[child] ?? 'N/A';
    }
    
    // Handle dates
    if (accessorKey === 'payout_start' || accessorKey === 'payout_end') {
      return formatDate(row[accessorKey]);
    }
    
    // Handle status
    if (accessorKey === 'status') {
      return getStatusText(row[accessorKey]);
    }
    
    return row[accessorKey] ?? 'N/A';
  };
  
  const getExportColumns = () => {
    return columns.filter(col => 
      col.accessorKey && 
      col.accessorKey !== 'action' && 
      col.id !== 'select'
    );
  };
  
  const handleCopy = () => {
    const exportColumns = getExportColumns();
    
    const tableData = employees
      .map((row) =>
        exportColumns
          .map((col) => `${col.header}: ${getFormattedValue(row, col.accessorKey)}`)
          .join('\t')
      )
      .join('\n');
  
    navigator.clipboard
      .writeText(tableData)
      .then(() => {
        Swal.fire({
          title: 'Copied!',
          text: 'Table data copied to clipboard.',
          icon: 'success',
          confirmButtonColor: '#080'
        });
      })
      .catch((err) => {
        console.error('Failed to copy table data: ', err);
        Swal.fire({
          title: 'Error',
          text: 'Failed to copy table data.',
          icon: 'error',
          confirmButtonColor: '#d33'
        });
      });
  };
  
  const handlePrint = () => {
    const exportColumns = getExportColumns();
    
    const headers = exportColumns.map(col => `<th>${col.header}</th>`).join('');
    const rows = employees.map(row =>
      `<tr>${exportColumns.map(col => 
        `<td>${getFormattedValue(row, col.accessorKey)}</td>`
      ).join('')}</tr>`
    ).join('');
  
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Table</title>
          <style>
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid black;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${headers}</tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    Swal.fire({
      title: 'Print Ready!',
      text: 'Document ready for printing',
      icon: 'success',
      confirmButtonColor: '#080'
    });
  };
  
  const handleDownloadPdf = () => {
    const exportColumns = getExportColumns();
    
    const headers = exportColumns.map(col => col.header);
    const rows = employees.map(row =>
      exportColumns.map(col => getFormattedValue(row, col.accessorKey))
    );
  
    const doc = new jsPDF();
    doc.autoTable({
      head: [headers],
      body: rows,
      styles: { cellPadding: 2, fontSize: 8 },
      columnStyles: {
        // Adjust column widths as needed
        0: { cellWidth: 20 }, // ID
        1: { cellWidth: 30 }, // CLIENT
        2: { cellWidth: 30 }, // OFFER NAME
        // Add more column styles as needed
      }
    });
  
    doc.save('clientsoffer.pdf');
    Swal.fire({
      title: 'Downloaded!',
      text: 'PDF file downloaded successfully',
      icon: 'success',
      confirmButtonColor: '#080'
    });
  };
  
  const handleDownloadExcel = () => {
    const exportColumns = getExportColumns();
    
    // Prepare the data with proper formatting
    const headers = exportColumns.map(col => col.header);
    const rows = employees.map(row =>
      exportColumns.map((col) => {
        const value = getFormattedValue(row, col.accessorKey);
        
        // Format numbers for revenue and budget
        if (col.accessorKey === 'revenue' || col.accessorKey === 'total_budget') {
          return {
            v: value,
            t: 'n', // number type
            z: '#,##0.00' // number format
          };
        }
        
        // Ensure dates and text values are properly formatted
        return {
          v: value,
          t: 's', // string type
          z: '@' // text format
        };
      })
    );
  
    // Create worksheet with formatting
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Set column widths
    worksheet['!cols'] = exportColumns.map(() => ({ wch: 15 }));
  
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
    
    XLSX.writeFile(workbook, 'clientsoffer.xlsx', {
      bookType: 'xlsx',
      cellStyles: true
    });
    
    Swal.fire({
      title: 'Downloaded!',
      text: 'Excel file downloaded successfully',
      icon: 'success',
      confirmButtonColor: '#080'
    });
  };

  return (
    <div className="space-y-6">

      <Card>
        <CardBody>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <p className="font-bold text-lg">Operators</p>
            </div>
            <div className="flex items-center">
              <p className="text-black-400 font-bold">Operator</p>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400 ml-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M6.293 15.293a1 1 0 0 1-1.414-1.414L12.586 10 4.88 2.707a1 1 0 1 1 1.414-1.414l8.997 8.999a1 1 0 0 1 0 1.414l-8.997 8.999a1 1 0 0 1-.707.293z"
                />
              </svg>
              <p className="text-gray-400 ml-1">Manage</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <p className="font-bold text-lg">Manage Operators</p>
            </div>
            <Button style={{ backgroundColor: "#7366F1" }} onClick={handleAddClient}>
              Add operator
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        
          <div className="relative mb-8 flex flex-col gap-4">
            <MaterialReactTable table={table} />
          </div>
        
      </Card>

      {/* edit dialog box */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogHeader>Edit Client</DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-4">
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
            />
            {formErrors.fullName && (
              <div className="text-red-600 text-sm font-bold mt-0">{formErrors.fullName}</div>
            )}
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            {formErrors.email && (
              <div className="text-red-600 text-sm font-bold mt-1">{formErrors.email}</div>
            )}
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
            />
            {errors.phone && (
              <div className="text-red-500 font-bold text-sm absolute top-full left-6 mt-1">
                {errors.phone}
              </div>

            )}
<MUISelect
  label="Role"
  id="role-select"
  name="role"
  value={formData.role}
  onChange={handleInputChange}
>
  {roleOptions.map((option) => (
    <MenuItem key={option.value} value={option.value}>
      {option.label}
    </MenuItem>
  ))}
</MUISelect>

            {formErrors.role && (
              <div className="text-red-600 text-sm font-bold mt-1">{formErrors.role}</div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="text" color="red" onClick={() => setOpenEditDialog(false)}>
            Cancel
          </Button>
          <Button variant="text" color="gray" onClick={handleSaveEdit}>
            Save
          </Button>
        </DialogFooter>
      </Dialog>

    </div>
  );
}
export default OperatorManage;
