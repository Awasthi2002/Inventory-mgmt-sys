import React, { useEffect, useMemo, useState, } from 'react';
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
} from '@mui/material';
import { ContentCopy, Link, } from '@mui/icons-material';
import axios from 'axios';
import config from "@/config";
import { useAuth } from '../../auth/AuthContext';

export function ClientAllEmpEnteredData() {
    const [data, setData] = useState([]);
    const [selectedOffer, setSelectedOffer] = useState(null);
    const [offers, setOffers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const { user } = useAuth();

    // Fetch all employee-entered data
    useEffect(() => {
        const params = {};
        if (selectedOffer && selectedOffer._id) params.offerId = selectedOffer._id;
        if (selectedEmployee && selectedEmployee._id) params.empId = selectedEmployee._id;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        axios.get(`${config.apiurl}/offer/emp-entries-with-filter`, { params })
            .then((response) => {
                setData(response.data.data || []);
                console.log('Fetched Data:', response.data.data);
            })
            .catch((error) => {
                console.error('Error fetching data:', error);
            });
    }, [selectedOffer, selectedEmployee, startDate, endDate]);

    // Fetch offers from the API
    useEffect(() => {
        axios.get(`${config.apiurl}/offer/get-offers/${user._id}`)
            .then((response) => {
                const fetchedOffers = response.data.data || [];
                console.log('Fetched Offers:', fetchedOffers);
                console.log('Fetching offers for user:', user._id);

                const filteredOffers = fetchedOffers.map((offer) => ({
                    _id: offer._id,
                    offerName: offer.offerName
                })).sort((a, b) =>
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
                setOffers(filteredOffers);
                if (filteredOffers.length > 0) {
                    setSelectedOffer(filteredOffers[0]);
                }
            })
            .catch((error) => {
                console.error('Error fetching offers:', error);
            });
    }, [user._id]);

    useEffect(() => {
        axios.get(`${config.apiurl}/employees`)
            .then((response) => {
                const fetchedEmployees = response.data || [];
                const filteredEmployees = fetchedEmployees.map((emp) => ({
                    _id: emp._id,
                    fullName: emp.fullName
                }));
                setEmployees(filteredEmployees);
            })
            .catch((error) => {
                console.error('Error fetching employees:', error);
            });
    }, []);

    const filteredData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include full day
        if (end < start) return [];

        let result = data;
        if (selectedOffer && selectedOffer._id) {
            result = result.filter((item) =>
                item.offerId && typeof item.offerId === 'object' && item.offerId._id === selectedOffer._id
            );
        }
        if (selectedEmployee && selectedEmployee._id) {
            result = result.filter((item) =>
                item.employeeId && typeof item.employeeId === 'object' && item.employeeId._id === selectedEmployee._id
            );
        }
        return result.filter((item) => {
            const created = item.createdAtDelhi?.isoString ? new Date(item.createdAtDelhi.isoString) : null;
            return created && created >= start && created <= end;
        });
    }, [data, selectedOffer, selectedEmployee, startDate, endDate]);

    const columns = useMemo(
        () => [
            {
                accessorKey: 'offerId.offerName',
                header: 'Offer Name',
                size: 150,
                Cell: ({ row, cell }) => (
                    <Typography variant="body2">
                        {cell.getValue() || 'N/A'}
                    </Typography>
                ),
            },
            {
                accessorKey: 'email',
                header: 'Email',
                Cell: ({ cell }) => cell.getValue() || 'N/A',
            },
            {
                accessorKey: 'phone',
                header: 'Phone',
                Cell: ({ cell }) => cell.getValue() || 'N/A',
            },
            {
                accessorKey: 'password',
                header: 'Password',
                Cell: ({ cell }) => cell.getValue() || 'N/A',
            },
            {
                accessorKey: 'amount',
                header: 'Amount',
                size: 120,
                Cell: ({ cell }) => cell.getValue() || 'N/A',
            },
            {
                accessorKey: 'trackingLink',
                header: 'Tracking Link',
                size: 300,
                Cell: ({ cell }) => {
                    const link = cell.getValue() || 'N/A';
                    const truncatedLink = link.length > 30 ? `${link.slice(0, 30)}...` : link;
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', maxWidth: 300, overflow: 'hidden' }}>
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
                Cell: ({ row, cell }) => {
                    const screenshotUrl = cell.getValue() || '';
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '50px' }}>
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
                                    <Tooltip title="View Image">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => window.open(screenshotUrl, '_blank')}
                                            sx={{ padding: '4px' }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                            </svg>
                                        </IconButton>
                                    </Tooltip>
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
                },
            },
            {
                accessorKey: 'status',
                header: 'Status',
                size: 120,
                Cell: ({ row, cell }) => {
                    const value = cell.getValue() || 'N/A';
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
                size: 120,
                Cell: ({ row, cell }) => {
                    return cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : 'N/A';
                },
            },
        ],
        []
    );

    const table = useMaterialReactTable({
        columns,
        data: filteredData,
        enableColumnActions: false,
        enableColumnFilters: true,
        enablePagination: true,
        enableSorting: true,
        enableRowSelection: false,
        muiTableProps: {
            sx: {
                table: {
                    borderCollapse: 'collapse',
                    fontSize: '0.75rem',
                },
                '& .MuiTableCell-root': {
                    padding: '1px',
                    fontSize: '0.75rem',
                },
                '& .MuiTableHead-root': {
                    '& .MuiTableCell-root': {
                        padding: '1px',
                        fontSize: '0.8rem',
                    },
                },
            },
        },
        initialState: {
            density: 'compact',
            pagination: { pageSize: 10 },
        },
        renderTopToolbarCustomActions: () => null,
    });

    return (
        <div className="lg:pr-4 lg:-ml-4">
            <div className="bg-white rounded-3xl">
                <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    align="center"
                    sx={{
                        fontWeight: 'bold',
                        padding: '2rem',
                        borderBottom: '1px solid #333333'
                    }}
                >
                    All Emp Entered Data
                </Typography>
                <div className='border-t-red-200'></div>

                <FormControl size="medium" sx={{ minWidth: 300, padding: 2 }}>
                    <Autocomplete
                        options={offers}
                        getOptionLabel={(option) => option.offerName || 'N/A'}
                        value={selectedOffer}
                        onChange={(event, newValue) => {
                            setSelectedOffer(newValue);
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                variant="outlined"
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                label="Filter by Offer"
                                placeholder={selectedOffer ? undefined : "Selected Offers"}
                                sx={{
                                    '& .MuiInputBase-root': {
                                        height: 40,
                                    },
                                }}
                                fullWidth
                            />
                        )}
                        isOptionEqualToValue={(option, value) => option._id === (value?._id || null)}
                    />
                </FormControl>
                <FormControl size="medium" sx={{ minWidth: 250, padding: 2 }}>
                    <Autocomplete
                        options={employees}
                        getOptionLabel={(option) => option.fullName || 'N/A'}
                        value={selectedEmployee}
                        onChange={(event, newValue) => {
                            setSelectedEmployee(newValue);
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                variant="outlined"
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                label="Filter by Employee"
                                placeholder={selectedEmployee ? undefined : "Selected Employees"}
                                sx={{
                                    '& .MuiInputBase-root': {
                                        height: 40,
                                    },
                                }}
                                fullWidth
                            />
                        )}
                        isOptionEqualToValue={(option, value) => option._id === (value?._id || null)}
                    />
                </FormControl>
                <FormControl size="medium" sx={{ minWidth: 200, padding: 2 }}>
                    <TextField
                        type="date"
                        label="Start Date"
                        value={startDate}
                        onChange={(e) => {
                            const newStart = e.target.value;
                            const today = new Date();
                            if (new Date(newStart) <= today) {
                                setStartDate(newStart);
                            }
                        }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ max: new Date().toISOString().split('T')[0] }}
                        size="small"
                        sx={{ '& .MuiInputBase-root': { height: 40 } }}
                    />
                </FormControl>
                <FormControl size="medium" sx={{ minWidth: 200, padding: 2 }}>
                    <TextField
                        type="date"
                        label="End Date"
                        value={endDate}
                        onChange={(e) => {
                            const newEnd = e.target.value;
                            const start = new Date(startDate);
                            const today = new Date();
                            if (new Date(newEnd) <= today && new Date(newEnd) >= start) {
                                setEndDate(newEnd);
                            }
                        }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ max: new Date().toISOString().split('T')[0] }}
                        size="small"
                        sx={{ '& .MuiInputBase-root': { height: 40 } }}
                    />
                </FormControl>
                <MaterialReactTable table={table} />
            </div>
        </div>
    );
}

export default ClientAllEmpEnteredData;