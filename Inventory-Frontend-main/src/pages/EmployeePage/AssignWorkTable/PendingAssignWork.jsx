import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
    MaterialReactTable,
    useMaterialReactTable,
} from 'material-react-table';
import {
    IconButton,
    Tooltip,
    Typography,
    Autocomplete,
    TextField,
    FormControl,
    Chip,
    Select,
    MenuItem,
    Box
} from '@mui/material';
import { Edit, Delete, ContentCopy, Link, Save, Cancel } from '@mui/icons-material';
import Swal from 'sweetalert2';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import axios from 'axios';
import { useAuth } from '../../auth/AuthContext';
import config from "@/config";
import { SquareDashedMousePointer } from 'lucide-react';



export function PendingAssignWork() {
    const [data, setData] = useState([]);
    const [editingRow, setEditingRow] = useState(null);
    const [editData, setEditData] = useState({});
    const [validationErrors, setValidationErrors] = useState({});
    const [pendingCount, setPendingCount] = useState(0); // New state for pending count
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const [accountDetails, setAccountDetails] = useState([]);
    const [error, setError] = useState(null);
    const tempEditData = useRef({});
    const [doubleClickEditingCell, setDoubleClickEditingCell] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);


    const fetchAccountDetails = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${config.apiurl}/payment/get-allaccount-details`);
            const data = await response.json();
            if (data.success) {
                setAccountDetails(data.data || []);
            }
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
            Swal.fire({
                title: 'Error!',
                text: err.message || 'Failed to fetch account details',
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#d33',
            });
        }
    };

    // Fetch account details on component mount
    useEffect(() => {
        fetchAccountDetails();
    }, []);

    // Fetch employee-entered data using empId
    useEffect(() => {
        if (user && user._id) {
            setLoading(true);
            console.log('Fetching data for empId:', user._id);
            axios.get(`${config.apiurl}/offer/get-all-emp-pending-entries/${user._id}`)
                .then((response) => {
                    console.log('Raw API Response:', response);
                    const fetchedData = response.data.data || [];
                    const count = response.data.count || 0; // Extract count from API response
                    console.log('Extracted API Data:', fetchedData);
                    setData(fetchedData);
                    setPendingCount(count); // Set pending count
                    console.log('Data state after set:', fetchedData);
                    setLoading(false);
                })
                .catch((error) => {
                    console.error('Error fetching data:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to fetch data. Please try again.',
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                    });
                    setLoading(false);
                });
        } else {
            console.log('User or user._id not available:', user);
            setLoading(false);
        }
    }, [user]);

    const filteredData = useMemo(() => {
        console.log('Data for table:', data);
        return data;
    }, [data]);

    // Add handleDoubleClick function
    const handleDoubleClick = useCallback((rowId, field) => {
        if (editingRow === rowId) return; // Don't allow double-click if already in edit mode
        setDoubleClickEditingCell(`${rowId}-${field}`);

        // Set initial edit data for this cell
        const rowData = data.find(item => item._id === rowId);
        if (rowData) {
            if (field.includes('.')) {
                const [parentKey, childKey] = field.split('.');
                tempEditData.current = {
                    ...tempEditData.current,
                    [parentKey]: {
                        ...tempEditData.current[parentKey],
                        [childKey]: rowData[parentKey]?.[childKey] || ''
                    }
                };
            } else {
                tempEditData.current = {
                    ...tempEditData.current,
                    [field]: rowData[field] || ''
                };
            }
            setEditData(prev => ({
                ...prev,
                [field]: rowData[field] || ''
            }));
        }
    }, [editingRow, data]);

    // Add handleDoubleClickSave function
    const handleDoubleClickSave = useCallback((rowId, field) => {
        const finalData = { ...tempEditData.current };
        const rowData = data.find(item => item._id === rowId);

        // Validation
        let error = '';
        const value = finalData[field] || '';

        if (field === 'email') error = validateEmail(value);
        if (field === 'phone') error = validatePhone(value);
        if (field === 'amount') error = validateAmount(value);
        if (field === 'trackingLink') error = validateLink(value);

        if (error && value) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Input',
                text: error,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
            });
            setDoubleClickEditingCell(null);
            tempEditData.current = {};
            setEditData({});
            return;
        }

        // Prepare payload with only the changed field
        const payload = {
            [field]: value
        };

        // API call
        axios.put(`${config.apiurl}/offer/update-entry/${rowId}`, payload)
            .then((response) => {
                if (response.data.success) {
                    // Special handling for paymentOption - update paymentDetails immediately
                    if (field === 'paymentOption') {
                        const selectedAccount = accountDetails.find(
                            (account) => account._id === value
                        );

                        const updatedPaymentDetails = selectedAccount
                            ? {
                                name: selectedAccount.name,
                                phoneNumber: selectedAccount.phoneNumber,
                                paymentType: selectedAccount.paymentType,
                                cardDetails: selectedAccount.paymentType === 'card'
                                    ? { cardNumber: selectedAccount.cardDetails?.cardNumber }
                                    : undefined,
                                upiDetails: selectedAccount.paymentType !== 'card'
                                    ? { upiId: selectedAccount.upiDetails?.upiId }
                                    : undefined,
                            }
                            : null;

                        // Update data with both paymentOption and paymentDetails
                        setData((prev) =>
                            prev.map((item) =>
                                item._id === rowId
                                    ? {
                                        ...item,
                                        [field]: value,
                                        paymentDetails: updatedPaymentDetails
                                    }
                                    : item
                            )
                        );
                    } else {
                        // Regular field update
                        setData((prev) =>
                            prev.map((item) =>
                                item._id === rowId
                                    ? { ...item, [field]: value }
                                    : item
                            )
                        );
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: 'Data updated successfully!',
                        timer: 1500,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to update data. Please try again.',
                        confirmButtonColor: '#3085d6',
                    });
                }
            })
            .catch((error) => {
                console.error('Error updating data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error updating data. Please try again.',
                    confirmButtonColor: '#3085d6',
                });
            });

        // Reset state
        setDoubleClickEditingCell(null);
        tempEditData.current = {};
        setEditData({});
    }, [data, accountDetails]);

    const EditableImageCell = useCallback(({ row, cell, field }) => {
        const isEditing = editingRow === row.original._id;
        const isDoubleClickEditing = doubleClickEditingCell === `${row.original._id}-${field}`;
        const screenshotUrl = row.original[field] || '';

        // Handle file change for upload
        const handleFileChange = (e) => {
            const file = e.target.files[0];
            if (file) {
                setSelectedFile(file);
                tempEditData.current = {
                    ...tempEditData.current,
                    [field]: file
                };
                setEditData((prev) => ({ ...prev, [field]: URL.createObjectURL(file) }));
            }
        };

        // Handle image upload to API
        const handleImageUpload = (id, file) => {
            if (!file) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No File Selected',
                    text: 'Please select an image to upload.',
                    confirmButtonColor: '#3085d6',
                });
                return;
            }

            const formData = new FormData();
            formData.append('screenshot', file);

            axios.put(`${config.apiurl}/offer/update-entry/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
                .then((response) => {
                    if (response.data.success) {
                        setData((prev) =>
                            prev.map((item) =>
                                item._id === id
                                    ? { ...item, [field]: response.data.data[field] || URL.createObjectURL(file) }
                                    : item
                            )
                        );
                        Swal.fire({
                            icon: 'success',
                            title: 'Success',
                            text: 'Screenshot updated successfully!',
                            timer: 1500,
                            showConfirmButton: false,
                        });
                        setEditData((prev) => ({ ...prev, [field]: response.data.data[field] || URL.createObjectURL(file) }));
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to upload screenshot. Please try again.',
                            confirmButtonColor: '#3085d6',
                        });
                    }
                })
                .catch((error) => {
                    console.error('Error uploading screenshot:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Error uploading screenshot. Please try again.',
                        confirmButtonColor: '#3085d6',
                    });
                })
                .finally(() => {
                    setDoubleClickEditingCell(null);
                    setSelectedFile(null);
                    tempEditData.current = {};
                });
        };

        // Handle download
 const handleDownload = async (url, filename) => {
    try {
        // Fetch the image as a blob
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Create a temporary anchor element for download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename || `screenshot_${row.original._id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Error downloading image:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to download screenshot. Please try again.',
            confirmButtonColor: '#3085d6',
        });
    }
};

        // Display mode
        if (!isEditing && !isDoubleClickEditing) {
            return (
                <div
                    onDoubleClick={() => handleDoubleClick(row.original._id, field)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '50px' }}
                >
                    {screenshotUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img
                                src={screenshotUrl}
                                alt="Screenshot"
                                style={{
                                    width: '50px',
                                    height: '50px',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd'
                                }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <Tooltip title="View Image">
                                    <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(screenshotUrl, '_blank');
                                        }}
                                        sx={{ padding: '4px' }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                        </svg>
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Download Image">
                                    <IconButton
                                        size="small"
                                        color="success"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(screenshotUrl, `screenshot_${row.original._id}.jpg`);
                                        }}
                                        sx={{ padding: '4px' }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                                        </svg>
                                    </IconButton>
                                </Tooltip>
                            </div>
                        </div>
                    ) : (
                        <div
                            style={{
                                width: '120px',
                                height: '50px',
                                border: '2px dashed #ccc',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#f9f9f9',
                                color: '#666'
                            }}
                        >
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', textAlign: 'center' }}>
                                No Image
                            </Typography>
                        </div>
                    )}
                </div>
            );
        }

        // Edit mode (both regular and double-click)
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: 'row' }}>
                {(isEditing || isDoubleClickEditing) && (selectedFile || screenshotUrl) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                            src={editData[field] || (selectedFile ? URL.createObjectURL(selectedFile) : screenshotUrl)}
                            alt="Screenshot Preview"
                            style={{
                                width: '50px',
                                height: '50px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid #ddd'
                            }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <Tooltip title="View Image">
                                <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(editData[field] || (selectedFile ? URL.createObjectURL(selectedFile) : screenshotUrl), '_blank');
                                    }}
                                    sx={{ padding: '4px' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                    </svg>
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Download Image">
                                <IconButton
                                    size="small"
                                    color="success"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(editData[field] || (selectedFile ? URL.createObjectURL(selectedFile) : screenshotUrl), `screenshot_${row.original._id}.jpg`);
                                    }}
                                    sx={{ padding: '4px' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                                    </svg>
                                </IconButton>
                            </Tooltip>
                        </div>
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '48px' }}>
                    <label
                        htmlFor={`file-upload-${row.original._id}`}
                        style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            backgroundColor: '#1976d2',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            border: 'none'
                        }}
                    >
                        Choose File
                    </label>
                    <input
                        id={`file-upload-${row.original._id}`}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        autoFocus={isDoubleClickEditing}
                    />
                    {isDoubleClickEditing && selectedFile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Tooltip title="Cancel Selection">
                                <IconButton
                                    color="error"
                                    size="small"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        tempEditData.current = { ...tempEditData.current, [field]: null };
                                        setEditData((prev) => ({ ...prev, [field]: null }));
                                        setDoubleClickEditingCell(null);
                                    }}
                                    sx={{ padding: '4px' }}
                                >
                                    <Cancel fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Save Image">
                                <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={() => handleImageUpload(row.original._id, selectedFile)}
                                    sx={{ padding: '4px' }}
                                >
                                    <Save fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
        );
    }, [editingRow, doubleClickEditingCell, selectedFile, editData, handleDoubleClick]);


    const paymentStatuses = ['pending', 'completed', 'failed'];

    const validateEmail = (email) => {
        if (!email) return '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) ? '' : 'Invalid email format';
    };

    const validatePhone = (phone) => {
        if (!phone) return '';
        const phoneRegex = /^\d{10,15}$/;
        return phoneRegex.test(phone) ? '' : 'Phone must be 10-15 digits only';
    };

    const validateAmount = (amount) => {
        if (!amount) return '';
        const amountRegex = /^\d+(\.\d{1,2})?$/;
        return amountRegex.test(amount) && Number(amount) > 0 ? '' : 'Amount must be a positive number';
    };

    const validateLink = (link) => {
        if (!link) return '';
        const linkRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/i;
        return linkRegex.test(link) ? '' : 'Invalid URL format';
    };

    const handleEdit = useCallback((row) => {
        setEditingRow(row._id);
        setEditData(row);
        tempEditData.current = { ...row };
        setValidationErrors({});
    }, []);

    const handleCancel = useCallback(() => {
        setEditingRow(null);
        setEditData({});
        tempEditData.current = {};
        setValidationErrors({});
        Swal.fire({
            icon: 'warning',
            title: 'Cancelled',
            text: 'Edit operation cancelled.',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
        });
    }, []);

    const handleSave = useCallback((id) => {
        const finalData = { ...editData, ...tempEditData.current };

        // Validation checks (assuming similar validation functions exist)
        const errors = {
            email: validateEmail(finalData.email || ''),
            phone: validatePhone(finalData.phone || ''),
            amount: validateAmount(finalData.amount || ''),
            trackingLink: validateLink(finalData.trackingLink || ''),
        };

        setValidationErrors(errors);

        // Prepare the data to send to the API, excluding uneditable fields
        const payload = {
            email: finalData.email,
            phone: finalData.phone,
            password: finalData.password,
            amount: finalData.amount,
            paymentOption: finalData.paymentOption,
            paymentStatus: finalData.paymentStatus,
            status: finalData.status,
            trackingLink: finalData.trackingLink,
            comment: finalData.comment, // Add comment to the payload
        };

        // Handle image upload if a file is selected
        const handleImageUpload = () => {
            if (finalData.screenshot instanceof File) {
                const formData = new FormData();
                formData.append('screenshot', finalData.screenshot);

                return axios.put(`${config.apiurl}/offer/update-entry/${id}`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            }
            return Promise.resolve({ data: { success: true, data: {} } });
        };

        // Make the API calls
        Promise.all([
            axios.put(`${config.apiurl}/offer/update-entry/${id}`, payload),
            handleImageUpload()
        ])
            .then(([response, imageResponse]) => {
                if (response.data.success && imageResponse.data.success) {
                    // Find the selected account details from accountDetails based on paymentOption
                    const selectedAccount = accountDetails.find(
                        (account) => account._id === finalData.paymentOption
                    );

                    // Get the actual screenshot URL from server response or keep existing
                    const updatedScreenshot = imageResponse.data.data?.screenshot ||
                        (finalData.screenshot instanceof File ? null : finalData.screenshot) ||
                        data.find(item => item._id === id)?.screenshot;

                    // Construct the updated row, including paymentDetails and screenshot
                    const updatedRow = {
                        ...finalData,
                        paymentDetails: selectedAccount
                            ? {
                                name: selectedAccount.name,
                                phoneNumber: selectedAccount.phoneNumber,
                                paymentType: selectedAccount.paymentType,
                                cardDetails: selectedAccount.paymentType === 'card'
                                    ? { cardNumber: selectedAccount.cardDetails?.cardNumber }
                                    : undefined,
                                upiDetails: selectedAccount.paymentType !== 'card'
                                    ? { upiId: selectedAccount.upiDetails?.upiId }
                                    : undefined,
                            }
                            : finalData.paymentDetails || data.find(item => item._id === id)?.paymentDetails,
                        screenshot: updatedScreenshot,
                        comment: finalData.comment, // Add comment to the updated row
                    };

                    // Update the data state with the new row
                    setData((prev) =>
                        prev.map((item) =>
                            item._id === id
                                ? {
                                    ...item,
                                    ...payload,
                                    paymentDetails: updatedRow.paymentDetails,
                                    screenshot: updatedRow.screenshot,
                                    comment: updatedRow.comment // Update comment in state
                                }
                                : item
                        )
                    );

                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: 'Data saved successfully!',
                        confirmButtonColor: '#3085d6',
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to save data. Please try again.',
                        confirmButtonColor: '#3085d6',
                    });
                }
            })
            .catch((error) => {
                console.error('Error saving data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error saving data. Please try again.',
                    confirmButtonColor: '#3085d6',
                });
            })
            .finally(() => {
                // Reset state
                setEditingRow(null);
                setEditData({});
                tempEditData.current = {};
                setValidationErrors({});
                setSelectedFile(null);
            });
    }, [editData, accountDetails, data]);

    const handleDelete = useCallback((id) => {
        Swal.fire({
            icon: 'warning',
            title: 'Are you sure?',
            text: 'Do you want to delete this record?',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, keep it',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
        }).then((result) => {
            if (result.isConfirmed) {
                axios.delete(`${config.apiurl}/offer/delete-entry/${id}`)
                    .then((response) => {
                        //  console.log('Delete Request URL:', `${config.apiurl}/offer/delete-emp-data/${id}`);

                        console.log('Delete Response:', response);
                        if (response.data.success) {
                            setData((prev) => prev.filter((item) => item._id !== id));
                            Swal.fire({
                                icon: 'success',
                                title: 'Deleted!',
                                text: 'Record has been deleted.',
                                confirmButtonColor: '#3085d6',
                                cancelButtonColor: '#d33',
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: 'Failed to delete record. Please try again.',
                                confirmButtonColor: '#3085d6',
                                cancelButtonColor: '#d33',
                            });
                        }
                    })
                    .catch((error) => {
                        console.error('Error deleting data:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Error deleting data. Please try again.',
                            confirmButtonColor: '#3085d6',
                            cancelButtonColor: '#d33',
                        });
                    });
            }
        });
    }, []);

    const handleEntryStatus = useCallback((id) => {
        Swal.fire({
            icon: 'warning',
            title: 'Confirm Completion',
            text: 'Are you sure you want to mark this entry as completed?',
            showCancelButton: true,
            confirmButtonText: 'Yes, complete it!',
            cancelButtonText: 'No, cancel',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
        }).then((result) => {
            if (result.isConfirmed) {
                axios.put(`${config.apiurl}/offer/complete-entry/${id}`)
                    .then((response) => {
                        if (response.data.success) {
                            setData((prev) =>
                                prev.map((item) =>
                                    item._id === id ? { ...item, status: 'completed' } : item
                                )
                            );
                            Swal.fire({
                                icon: 'success',
                                title: 'Success',
                                text: 'Entry marked as completed!',
                                confirmButtonColor: '#3085d6',
                                cancelButtonColor: '#d33',
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: 'Failed to mark entry as completed. Please try again.',
                                confirmButtonColor: '#3085d6',
                                cancelButtonColor: '#d33',
                            });
                        }
                    })
                    .catch((error) => {
                        console.error('Error completing entry:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Error completing entry. Please try again.',
                            confirmButtonColor: '#3085d6',
                            cancelButtonColor: '#d33',
                        });
                    });
            }
        });
    }, []);

    const handleInputChange = useCallback((key, value) => {
        if (key.includes('.')) {
            const [parentKey, childKey] = key.split('.');
            tempEditData.current = {
                ...tempEditData.current,
                [parentKey]: {
                    ...tempEditData.current[parentKey],
                    [childKey]: value
                }
            };
        } else {
            tempEditData.current = {
                ...tempEditData.current,
                [key]: value
            };
        }
    }, []);

    const handleBlur = useCallback((key, value) => {
        let error = '';
        if (key === 'email') error = validateEmail(value);
        if (key === 'phone') error = validatePhone(value);
        if (key === 'amount') error = validateAmount(value);
        if (key === 'trackingLink') error = validateLink(value);

        setValidationErrors((prev) => ({ ...prev, [key]: error }));

        if (error && value) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Input',
                text: error,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
            });
        }

        if (key.includes('.')) {
            const [parentKey, childKey] = key.split('.');
            setEditData(prev => ({
                ...prev,
                [parentKey]: {
                    ...prev[parentKey],
                    [childKey]: value
                }
            }));
        } else {
            setEditData(prev => ({ ...prev, [key]: value }));
        }
    }, []);

    // Modified EditableCell to support double-click editing
    const EditableCell = useCallback(({ row, cell, field, type = 'text', isNested = false }) => {
        const isEditing = editingRow === row.original._id;
        const isDoubleClickEditing = doubleClickEditingCell === `${row.original._id}-${field}`;
        const value = isNested ?
            (editData[field.split('.')[0]]?.[field.split('.')[1]] || row.original[field.split('.')[0]]?.[field.split('.')[1]] || '') :
            (editData[field] || row.original[field] || '');

        if (isEditing) {
            return (
                <TextField
                    defaultValue={value}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    onBlur={(e) => handleBlur(field, e.target.value)}
                    size="small"
                    type={type}
                    fullWidth={field === 'trackingLink'}
                />
            );
        }

        if (isDoubleClickEditing) {
            return (
                <TextField
                    defaultValue={value}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    onBlur={(e) => {
                        handleBlur(field, e.target.value);
                        handleDoubleClickSave(row.original._id, field);
                    }}
                    size="small"
                    type={type}
                    fullWidth={field === 'trackingLink'}
                    autoFocus
                />
            );
        }

        return (
            <div
                onDoubleClick={() => handleDoubleClick(row.original._id, field)}
                style={{ cursor: 'pointer', minHeight: '20px' }}
            >
                {cell.getValue() || 'N/A'}
            </div>
        );
    }, [editingRow, doubleClickEditingCell, editData, handleInputChange, handleBlur, handleDoubleClick, handleDoubleClickSave]);

    // Modified EditableSelect to support double-click editing
    const EditableSelect = useCallback(({ row, cell, field, options }) => {
        const isEditing = editingRow === row.original._id;
        const isDoubleClickEditing = doubleClickEditingCell === `${row.original._id}-${field}`;
        const value = (isEditing || isDoubleClickEditing) ? (editData[field] || row.original[field] || '') : row.original[field] || '';

        if (isEditing || isDoubleClickEditing) {
            if (field === 'paymentOption') {
                return (
                    <Select
                        defaultValue={value}
                        onChange={(e) => {
                            handleInputChange(field, e.target.value);
                            if (isDoubleClickEditing) {
                                handleDoubleClickSave(row.original._id, field);
                            } else {
                                handleBlur(field, e.target.value);
                            }
                        }}
                        size="small"
                        fullWidth
                        autoFocus={isDoubleClickEditing}
                    >
                        <MenuItem value="">Select an account</MenuItem>
                        {accountDetails.length === 0 ? (
                            <MenuItem disabled>No Option</MenuItem>
                        ) : (
                            accountDetails.map((account) => (
                                <MenuItem key={account._id} value={account._id}>
                                    {account.name} - {account.phoneNumber} - {account.paymentType} - {
                                        account.paymentType === "card"
                                            ? account.cardDetails.cardNumber
                                            : account.upiDetails.upiId
                                    }
                                </MenuItem>
                            ))
                        )}
                    </Select>
                );
            }
            return (
                <Select
                    defaultValue={value}
                    onChange={(e) => {
                        handleInputChange(field, e.target.value);
                        if (isDoubleClickEditing) {
                            handleDoubleClickSave(row.original._id, field);
                        } else {
                            handleBlur(field, e.target.value);
                        }
                    }}
                    size="small"
                    fullWidth
                    autoFocus={isDoubleClickEditing}
                >
                    {options.map((option) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                    ))}
                </Select>
            );
        }

        const chipColor = (chipValue) => {
            if (['pending'].includes(chipValue)) return 'info';
            if (['completed', 'approved'].includes(chipValue)) return 'success';
            if (['failed', 'rejected'].includes(chipValue)) return 'error';
            return 'default';
        };

        if (field === 'paymentOption') {
            if (!value || !row.original.paymentDetails) {
                return (
                    <div
                        onDoubleClick={() => handleDoubleClick(row.original._id, field)}
                        style={{ cursor: 'pointer', minHeight: '20px' }}
                    >
                        <Typography variant="body2">N/A</Typography>
                    </div>
                );
            }
            const details = row.original.paymentDetails;
            const displayText = `${details.name} - ${details.phoneNumber} - ${details.paymentType} - ${details.paymentType === "card"
                ? details.cardDetails.cardNumber
                : details.upiDetails.upiId
                }`;
            return (
                <div onDoubleClick={() => handleDoubleClick(row.original._id, field)} style={{ cursor: 'pointer' }}>
                    <Chip
                        label={displayText}
                        color="default"
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                    />
                </div>
            );
        }

        return value ? (
            <div onDoubleClick={() => handleDoubleClick(row.original._id, field)} style={{ cursor: 'pointer' }}>
                <Chip
                    label={value}
                    color={chipColor(row.original[field] || '')}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                />
            </div>
        ) : (
            <div onDoubleClick={() => handleDoubleClick(row.original._id, field)} style={{ cursor: 'pointer', minHeight: '20px' }}>
                N/A
            </div>
        );
    }, [editingRow, doubleClickEditingCell, editData, handleInputChange, handleBlur, accountDetails, handleDoubleClick, handleDoubleClickSave]);


const handlePublish = async () => {
    const selectedRows = table.getSelectedRowModel().rows;

    if (selectedRows.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Warning!',
            text: 'No rows selected for publishing.',
            confirmButtonColor: '#3085d6',
        });
        return;
    }


  

    // Collect only the _id of selected rows
    const selectedIds = selectedRows.map(row => row.original._id);
    const payload = { entryIds: selectedIds };

    try {
        console.log('Payload:', payload);
        const response = await axios.post(`${config.apiurl}/offer/entries/bulk-complete`, payload);
        console.log('Response:', response.data);

        const { summary } = response.data;
        const summaryCards = `
            <div style="text-align: left; font-size: 16px; display: flex; flex-wrap: wrap; gap: 15px; justify-content: flex-start;">
                <div style="background: #e6f3ff; border-radius: 8px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 200px;">
                    <div style="font-weight: bold; color: #333;">Total Requested</div>
                    <div style="margin-top: 5px; color: #3085d6; font-size: 18px;">${summary.totalRequested}</div>
                </div>
                <div style="background: #f0fff0; border-radius: 8px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 200px;">
                    <div style="font-weight: bold; color: #333;">Found</div>
                    <div style="margin-top: 5px; color: #3085d6; font-size: 18px;">${summary.found}</div>
                </div>
                <div style="background: #fff0f5; border-radius: 8px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 200px;">
                    <div style="font-weight: bold; color: #333;">Not Found</div>
                    <div style="margin-top: 5px; color: #3085d6; font-size: 18px;">${summary.notFound}</div>
                </div>
                <div style="background: #f5f5dc; border-radius: 8px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 200px;">
                    <div style="font-weight: bold; color: #333;">Duplicates Removed</div>
                    <div style="margin-top: 5px; color: #3085d6; font-size: 18px;">${summary.duplicatesRemoved}</div>
                </div>
                <div style="background: #f0e68c; border-radius: 8px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 200px;">
                    <div style="font-weight: bold; color: #333;">Already Completed</div>
                    <div style="margin-top: 5px; color: #3085d6; font-size: 18px;">${summary.alreadyCompleted}</div>
                </div>
                <div style="background: #e0ffff; border-radius: 8px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 200px;">
                    <div style="font-weight: bold; color: #333;">Updated</div>
                    <div style="margin-top: 5px; color: #3085d6; font-size: 18px;">${summary.updated}</div>
                </div>
            </div>
        `;

        Swal.fire({
            title: 'Success!',
            html: `
                <div style="text-align: left; font-size: 16px;">
                    <div style="margin-bottom: 12px;">${response.data.message}</div>
                    <div><strong>Summary:</strong></div>
                    <div style="margin-top: 8px;">${summaryCards}</div>
                </div>
            `,
            icon: 'success',
            width: 700,
            confirmButtonColor: '#3085d6',
        });

        table.resetRowSelection();
        // Re-fetch data to update the table
       

        const responseData = await axios.get(`${config.apiurl}/offer/get-emp-entered-data/${user._id}`);
        setData(responseData.data.data || []);
    } catch (error) {
        console.error('Publish error:', error.response?.data, error.message);
        let errorMessage = error.response?.data?.message || error.message || 'Failed to send data.';
        let missingFieldsHtml = '';

        if (error.response?.data?.entriesWithMissingFields?.length > 0) {
            missingFieldsHtml = error.response.data.entriesWithMissingFields
                .map(entry => {
                    const missingFields = entry.missingFields
                        .map(field => `<span style="color: #ff0000; font-weight: bold;">${field.field}</span>`)
                        .join(', ');
                    return `<div style="margin-bottom: 8px;">Entry ID ${entry.entryId}: Missing ${missingFields}</div>`;
                })
                .join('');
            errorMessage = `
                <div style="text-align: left; font-size: 16px;">
                    <div style="margin-bottom: 12px;">${errorMessage}</div>
                    <div><strong>Details:</strong></div>
                    <div style="margin-top: 8px;">${missingFieldsHtml}</div>
                </div>
            `;
        }

        Swal.fire({
            title: 'Error!',
            html: errorMessage,
            icon: 'error',
            width: 600,
            confirmButtonColor: '#3085d6',
        });
    }
};

    const columns = useMemo(
        () => [
            {
                accessorKey: 'offerId.offerName',
                header: 'Offer Name',
                Cell: ({ row, cell }) => (
                    <Typography variant="body2">
                        {cell.getValue() || 'N/A'}
                    </Typography>
                ),
            },
            {
                accessorKey: 'email',
                header: 'Email',
                Cell: ({ row, cell }) => (
                    <EditableCell row={row} cell={cell} field="email" />
                ),
            },
            {
                accessorKey: 'phone',
                header: 'Phone',
                Cell: ({ row, cell }) => (
                    <EditableCell row={row} cell={cell} field="phone" />
                ),
            },
            {
                accessorKey: 'password',
                header: 'Password',
                Cell: ({ row, cell }) => (
                    <EditableCell row={row} cell={cell} field="password" />
                ),
            },
            {
                accessorKey: 'amount',
                header: 'Amount',
                Cell: ({ row, cell }) => (
                    <EditableCell row={row} cell={cell} field="amount" type="number" />
                ),
            },
            {
                accessorKey: 'trackingLink',
                header: 'Tracking Link',
                size: 300,
                Cell: ({ row, cell }) => {
                    const isEditing = editingRow === row.original._id;
                    const isDoubleClickEditing = doubleClickEditingCell === `${row.original._id}-trackingLink`;
                    const link = cell.getValue() || 'N/A';
                    const truncatedLink = link.length > 30 ? `${link.slice(0, 30)}...` : link;

                    if (isEditing) {
                        return (
                            <TextField
                                defaultValue={editData.trackingLink || row.original.trackingLink || ''}
                                onChange={(e) => handleInputChange('trackingLink', e.target.value)}
                                onBlur={(e) => handleBlur('trackingLink', e.target.value)}
                                size="small"
                                fullWidth
                            />
                        );
                    }

                    if (isDoubleClickEditing) {
                        return (
                            <TextField
                                defaultValue={editData.trackingLink || row.original.trackingLink || ''}
                                onChange={(e) => handleInputChange('trackingLink', e.target.value)}
                                onBlur={(e) => {
                                    handleBlur('trackingLink', e.target.value);
                                    handleDoubleClickSave(row.original._id, 'trackingLink');
                                }}
                                size="small"
                                fullWidth
                                autoFocus
                            />
                        );
                    }

                    return (
                        <div style={{ display: 'flex', alignItems: 'center', maxWidth: 300, overflow: 'hidden', cursor: 'pointer' }}
                            onDoubleClick={() => handleDoubleClick(row.original._id, 'trackingLink')}>
                            {link !== 'N/A' && (
                                <>
                                    <Tooltip title="Copy Link">
                                        <IconButton size="small" onClick={() => navigator.clipboard.writeText(link)}>
                                            <ContentCopy fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Open Link">
                                        <IconButton size="small" onClick={() => window.open(link, '_blank')}>
                                            <Link fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                            <Typography variant="caption" sx={{ fontWeight: 500, color: 'blue' }} title={link}>
                                {truncatedLink}
                            </Typography>
                        </div>
                    );
                },
            },
{
            accessorKey: 'screenshot',
            header: 'Screenshot',
            size: 200,
            Cell: ({ row, cell }) => (
                <EditableImageCell row={row} cell={cell} field="screenshot" />
            ),
        },
            {
                accessorKey: 'paymentDetails',
                header: 'Payment Details',
                size: 300,
                Cell: ({ row, cell }) => {
                    const isEditing = editingRow === row.original._id;
                    const isDoubleClickEditing = doubleClickEditingCell === `${row.original._id}-paymentOption`;

                    if (isEditing || isDoubleClickEditing) {
                        return (
                            <Select
                                defaultValue={editData.paymentOption || row.original.paymentOption || ''}
                                onChange={(e) => {
                                    handleInputChange('paymentOption', e.target.value);
                                    if (isDoubleClickEditing) {
                                        handleDoubleClickSave(row.original._id, 'paymentOption');
                                    } else {
                                        handleBlur('paymentOption', e.target.value);
                                    }
                                }}
                                size="small"
                                fullWidth
                                autoFocus={isDoubleClickEditing}
                            >
                                <MenuItem value="">Select an account</MenuItem>
                                {accountDetails.length === 0 ? (
                                    <MenuItem disabled>No Option</MenuItem>
                                ) : (
                                    accountDetails.map((account) => (
                                        <MenuItem key={account._id} value={account._id}>
                                            {account.name} - {account.phoneNumber} - {account.paymentType} - {
                                                account.paymentType === "card"
                                                    ? account.cardDetails.cardNumber
                                                    : account.upiDetails.upiId
                                            }
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                        );
                    }

                    // Display API-fetched paymentDetails when not editing
                    const details = row.original.paymentDetails;
                    if (!details) {
                        return (
                            <div
                                onDoubleClick={() => handleDoubleClick(row.original._id, 'paymentOption')}
                                style={{ cursor: 'pointer', minHeight: '20px' }}
                            >
                                <Typography variant="body2">N/A</Typography>
                            </div>
                        );
                    }

                    const displayText = (
                        <span>
                            🧑‍🦱: {details.name || 'N/A'} - 📞: {details.phoneNumber || 'N/A'} -
                            <span className="font-bold">Type: {details.paymentType || 'N/A'}</span> -
                            {details.paymentType === "card"
                                ? <span>Card: <span className="font-bold bg-yellow-200 px-1 rounded">{details.cardDetails?.cardNumber || 'N/A'}</span></span>
                                : <span>UPI: <span className="font-bold bg-yellow-200 px-1 rounded">{details.upiDetails?.upiId || 'N/A'}</span></span>
                            }
                        </span>
                    );

                    return (
                        <div onDoubleClick={() => handleDoubleClick(row.original._id, 'paymentOption')} style={{ cursor: 'pointer' }}>
                            <Chip
                                label={displayText}
                                color="default"
                                size="small"
                                sx={{ textTransform: 'capitalize', maxWidth: '100%', overflow: 'hidden' }}
                                title={displayText}
                            />
                        </div>
                    );
                },
            },
            {
  accessorKey: 'comment',
  header: 'Comments',
  size: 200,
  Cell: ({ row, cell }) => (
    <EditableCell row={row} cell={cell} field="comment" />
  ),
},
            {
                accessorKey: 'paymentStatus',
                header: 'Payment Status',
                Cell: ({ row, cell }) => (
                    <EditableSelect
                        row={row}
                        cell={cell}
                        field="paymentStatus"
                        options={paymentStatuses}
                    />
                ),
            },
            {
                accessorKey: 'status',
                header: 'Status',
                Cell: ({ row, cell }) => {
                    const value = row.original.status || 'N/A';
                    const chipColor = (chipValue) => {
                        if (['pending'].includes(chipValue)) return 'info';
                        if (['completed', 'approved'].includes(chipValue)) return 'success';
                        if (['failed', 'rejected'].includes(chipValue)) return 'error';
                        return 'default';
                    };
                    return value ? (
                        <Chip
                            label={value}
                            color={chipColor(value)}
                            size="small"
                            sx={{ textTransform: 'capitalize' }}
                        />
                    ) : 'N/A';
                },
            },
            {
                accessorKey: 'createdAt',
                header: 'Created At',
                Cell: ({ row, cell }) => {
                    return cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : 'N/A';
                },
            },
            {
                accessorKey: 'actions',
                header: 'Actions',
                Cell: ({ row }) =>
                    editingRow === row.original._id ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <IconButton color="primary" onClick={() => handleSave(row.original._id)}>
                                <Save />
                            </IconButton>
                            <IconButton color="secondary" onClick={handleCancel}>
                                <Cancel />
                            </IconButton>
                            <IconButton color="success" onClick={() => handleEntryStatus(row.original._id)}>
                                <LibraryAddCheckIcon />
                            </IconButton>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <IconButton color="primary" onClick={() => handleEdit(row.original)}>
                                <Edit />
                            </IconButton>
                            <IconButton color="error" onClick={() => handleDelete(row.original._id)}>
                                <Delete />
                            </IconButton>
                            <IconButton color="success" onClick={() => handleEntryStatus(row.original._id)}>
                                <LibraryAddCheckIcon />
                            </IconButton>
                        </div>
                    ),
            },
        ],
        [editingRow, doubleClickEditingCell, editData, validationErrors, EditableCell, EditableSelect, handleEdit, handleSave, handleCancel, handleDelete, handleEntryStatus, handleDoubleClick, handleDoubleClickSave]);

    const table = useMaterialReactTable({
        columns,
        data: filteredData,
        enableColumnActions: false,
        enableColumnFilters: true,
        enablePagination: true,
        enableSorting: true,
          enableRowSelection: true, 
                  enableMultiRowSelection: true,
        muiTableProps: {
            sx: {
                table: {
                    borderCollapse: 'collapse',
                    fontSize: '0.75rem', // Smaller table font
                },
                '& .MuiTableCell-root': {
                    padding: '2px', // Reduced cell padding
                    fontSize: '0.75rem', // Smaller cell text
                },
                '& .MuiTableHead-root': {
                    '& .MuiTableCell-root': {
                        padding: '4px', // Reduced header padding
                        fontSize: '0.8rem', // Smaller header text
                    },
                },
            },
        },
        initialState: {
            density: 'compact', // Set compact density
            pagination: { pageSize: 10 }, // Smaller page size for compactness
        },
        renderEmptyRowsFallback: () => (
            <Typography variant="body2" sx={{ textAlign: 'center', padding: 2 }}>
                {loading ? 'Loading data...' : 'No data available'}
            </Typography>
        ),
           renderTopToolbarCustomActions: () => (
                              <Box sx={{ display: 'flex', gap: '8px', mt: ['2', '0'], flexWrap: 'wrap', p: 2 }} className="mt-2 md:mt-0">
                               
                                <label className="cursor-pointer">
                                  <div
                                    onClick={handlePublish}
                                    className="bg-gradient-to-b from-green-500 to-green-900 text-white px-4 py-2 -mt-1 ml-4 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-green-100 hover:shadow-xl transform hover:scale-105 active:translate-y-1 transition-all duration-300"
                                  >
                                    <SquareDashedMousePointer />
                                    All Publish Status 
                                  </div>
                                </label>
                              </Box>
                            ),
    });

    return (
        <div className=" ">
            <div className="bg-white rounded-3xl">
                <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    align="center"
                    sx={{
                        fontWeight: 'bold',
                        padding: '1rem',
                        borderBottom: '1px solid #333333'
                    }}
                >
                    Pending Assign Work
                    {/* <span className='text-red-600'>  ({pendingCount}) </span> */}
                </Typography>
                <div className='border-t-red-200'></div>




                {loading ? (
                    <Typography variant="h6" sx={{ textAlign: 'center', padding: 2 }}>
                        Loading data...
                    </Typography>
                ) : (
                    <MaterialReactTable table={table} />
                )}
            </div>
        </div>
    );
}

export default PendingAssignWork;