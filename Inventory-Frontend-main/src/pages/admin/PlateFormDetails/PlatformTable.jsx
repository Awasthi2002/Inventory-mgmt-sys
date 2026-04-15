import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import Swal from 'sweetalert2';
import config from '@/config';


export function PlatformList() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState(null);
  const [editName, setEditName] = useState('');
  const [editReviewEnabled, setEditReviewEnabled] = useState(false);
  const [addName, setAddName] = useState('');
  const [addReviewEnabled, setAddReviewEnabled] = useState(false);

  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config.apiurl}/platform/get-all-platforms`);
      setPlatforms(response.data.platforms);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch platforms');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || 'Failed to fetch platforms',
        confirmButtonColor: '#3B82F6',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const handleAddOpen = () => {
    setAddName('');
    setAddReviewEnabled(false);
    setAddOpen(true);
  };

  const handleAddClose = () => {
    setAddOpen(false);
    setAddName('');
    setAddReviewEnabled(false);
  };

  const handleAddSubmit = async () => {
    try {
      const response = await axios.post(`${config.apiurl}/platform/create-platform`, {
        name: addName,
        reviewEnabled: addReviewEnabled,
      });
      setPlatforms([...platforms, response.data.platform]);
      handleAddClose();
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Platform created successfully!',
        confirmButtonColor: '#3B82F6',
      });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create platform');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || 'Failed to create platform',
        confirmButtonColor: '#3B82F6',
      });
    }
  };

  const handleEditOpen = (platform) => {
    setCurrentPlatform(platform);
    setEditName(platform.name);
    setEditReviewEnabled(platform.reviewEnabled);
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setCurrentPlatform(null);
    setEditName('');
    setEditReviewEnabled(false);
  };

  const handleEditSubmit = async () => {
    try {
      const response = await axios.put(`${config.apiurl}/platform/update-platform/${currentPlatform.id}`, {
        name: editName,
        reviewEnabled: editReviewEnabled,
      });
      setPlatforms(platforms.map((p) => (p.id === currentPlatform.id ? response.data.platform : p)));
      handleEditClose();
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Platform updated successfully!',
        confirmButtonColor: '#3B82F6',
      });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update platform');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || 'Failed to update platform',
        confirmButtonColor: '#3B82F6',
      });
    }
  };

  const handleDeleteOpen = (platform) => {
    setCurrentPlatform(platform);
    setDeleteOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteOpen(false);
    setCurrentPlatform(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`${config.apiurl}/platform/delete-platform/${currentPlatform.id}`);
      setPlatforms(platforms.filter((p) => p.id !== currentPlatform.id));
      handleDeleteClose();
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Platform deleted successfully!',
        confirmButtonColor: '#3B82F6',
      });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete platform');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || 'Failed to delete platform',
        confirmButtonColor: '#3B82F6',
      });
    }
  };

  // Define columns for MaterialReactTable
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Platform Name',
        Cell: ({ cell }) => (
          <Typography className="text-gray-800 font-medium">
            {cell.getValue()}
          </Typography>
        ),
      },
      {
        accessorKey: 'reviewEnabled',
        header: 'Review Status',
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue() ? 'Enabled' : 'Disabled'}
            color={cell.getValue() ? 'success' : 'error'}
            size="small"
            sx={{ fontWeight: 500, borderRadius: '16px' }}
          />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created At',
        Cell: ({ cell }) => (
          <Typography className="text-gray-600">
            {new Date(cell.getValue()).toLocaleString()}
          </Typography>
        ),
      },
      {
        header: 'Actions',
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: '8px' }}>
            <Tooltip title="Edit Platform">
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => handleEditOpen(row.original)}
                className="border-blue-500 text-blue-500 hover:bg-blue-50"
                sx={{ borderRadius: '8px' }}
              >
                Edit
              </Button>
            </Tooltip>
            <Tooltip title="Delete Platform">
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => handleDeleteOpen(row.original)}
                className="border-red-500 text-red-500 hover:bg-red-50"
                sx={{ borderRadius: '8px' }}
              >
                Delete
              </Button>
            </Tooltip>
          </Box>
        ),
      },
    ],
    []
  );

  // Configure the table
  const table = useMaterialReactTable({
    columns,
    data: platforms,
    enableRowSelection: false,
    enableColumnFilters: false,
    enableGlobalFilter: true,
    enablePagination: true,
    enableSorting: true,
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
      density: 'comfortable',
    },
  
    renderEmptyRowsFallback: () => (
      <Typography className="text-center text-gray-500 text-lg py-6">
        No platforms available. Start by adding a new platform!
      </Typography>
    ),
    state: { isLoading: loading },
  });

  return (
    <Box className="p-2 -ml-8 max-w-7xl mx-auto mt-2  rounded-xl">
      <Box className="flex justify-between items-center mb-8">
        <Typography variant="h4" className="font-bold text-gray-800 tracking-tight">
          Platform Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddOpen}
          className="bg-blue-600 hover:bg-blue-700 transition-all duration-200"
          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 500 }}
        >
          Add Platform
        </Button>
      </Box>

      {loading ? (
        <Box className="flex justify-center py-12">
          <CircularProgress size={48} color="primary" />
        </Box>
      ) : (
        <Paper className=" rounded-lg">
          <MaterialReactTable table={table} />
        </Paper>
      )}

      {/* Add Platform Dialog */}
      <Dialog
        open={addOpen}
        onClose={handleAddClose}
        PaperProps={{ sx: { borderRadius: '12px', padding: '16px' } }}
      >
        <DialogTitle className="text-gray-800 font-semibold">Add New Platform</DialogTitle>
        <DialogContent>
          <TextField
            label="Platform Name"
            variant="outlined"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            fullWidth
            margin="normal"
            required
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={addReviewEnabled}
                onChange={(e) => setAddReviewEnabled(e.target.checked)}
                color="primary"
              />
            }
            label={addReviewEnabled ? 'Review Enabled' : 'Review Disabled'}
            className="mt-4 text-gray-700"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleAddClose}
            color="secondary"
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            Cancel
          </Button>
        <Button
  onClick={handleAddSubmit}
  disabled={!addName.trim()}
  sx={{
    textTransform: 'none',
    borderRadius: '8px',
    backgroundColor: '#3B82F6',
    color: 'white',
    '&:hover': {
      backgroundColor: '#2563EB',
    },
  }}
>
  Add
</Button>

        </DialogActions>
      </Dialog>

      {/* Edit Platform Dialog */}
      <Dialog
        open={editOpen}
        onClose={handleEditClose}
        PaperProps={{ sx: { borderRadius: '12px', padding: '16px' } }}
      >
        <DialogTitle className="text-gray-800 font-semibold">Edit Platform</DialogTitle>
        <DialogContent>
          <TextField
            label="Platform Name"
            variant="outlined"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            fullWidth
            margin="normal"
            required
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={editReviewEnabled}
                onChange={(e) => setEditReviewEnabled(e.target.checked)}
                color="primary"
              />
            }
            label={editReviewEnabled ? 'Review Enabled' : 'Review Disabled'}
            className="mt-4 text-gray-700"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleEditClose}
            color="secondary"
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            Cancel
          </Button>
 <Button
  onClick={handleEditSubmit}
  disabled={!editName.trim()}
  sx={{
    textTransform: 'none',
    borderRadius: '8px',
    backgroundColor: '#3B82F6',
    color: 'white',
    '&:hover': {
      backgroundColor: '#2563EB',
    },
  }}
>
  Save
</Button>

        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={handleDeleteClose}
        PaperProps={{ sx: { borderRadius: '12px', padding: '16px' } }}
      >
        <DialogTitle className="text-gray-800 font-semibold">Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography className="text-gray-600">
            Are you sure you want to delete the platform "{currentPlatform?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteClose}
            color="secondary"
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            sx={{ textTransform: 'none', borderRadius: '8px', backgroundColor: '#EF4444', color: 'white' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PlatformList;