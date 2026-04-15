import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  IconButton,
  FormHelperText,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { Chip } from '@mui/material';
import Swal from 'sweetalert2'; // Import SweetAlert2
import config from "@/config";


export function AssignWorkForm() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    offerEntries: [{ offerId: '', entryCount: '' }],
    employeeIds: [],
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState({ offers: true, employees: true, submit: false });

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await axios.get(`${config.apiurl}/offer/get-all-offers`);
        setOffers(response.data);
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to fetch offers: ' + (err.response?.data?.error || err.message),
          confirmButtonColor: '#d33',
        });
      } finally {
        setLoading((prev) => ({ ...prev, offers: false }));
      }
    };

    const fetchEmployees = async () => {
      try {
        const response = await axios.get(`${config.apiurl}/employees`);
        setEmployees(response.data);
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to fetch employees: ' + (err.response?.data?.error || err.message),
          confirmButtonColor: '#d33',
        });
      } finally {
        setLoading((prev) => ({ ...prev, employees: false }));
      }
    };

    fetchOffers();
    fetchEmployees();
  }, []);

  const handleOfferEntryChange = (index, field, value) => {
    const updatedEntries = [...formData.offerEntries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    setFormData({ ...formData, offerEntries: updatedEntries });
  };

  const handleEmployeeChange = (event) => {
    setFormData({ ...formData, employeeIds: event.target.value });
  };

  const addOfferEntry = () => {
    setFormData({
      ...formData,
      offerEntries: [...formData.offerEntries, { offerId: '', entryCount: '' }],
    });
  };

  const deleteOfferEntry = (index) => {
    if (formData.offerEntries.length === 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'At least one offer entry is required',
        confirmButtonColor: '#3085d6',
      });
      return;
    }
    const updatedEntries = formData.offerEntries.filter((_, i) => i !== index);
    setFormData({ ...formData, offerEntries: updatedEntries });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading((prev) => ({ ...prev, submit: true }));

    // Validation
    if (!formData.employeeIds.length) {
      setError('At least one employee must be selected');
      setLoading((prev) => ({ ...prev, submit: false }));
      return;
    }
    for (const entry of formData.offerEntries) {
      if (!entry.offerId || !entry.entryCount) {
        setError('All offer and entry count fields are required');
        setLoading((prev) => ({ ...prev, submit: false }));
        return;
      }
      if (isNaN(entry.entryCount) || entry.entryCount <= 0) {
        setError('Entry count must be a positive number');
        setLoading((prev) => ({ ...prev, submit: false }));
        return;
      }
    }

    try {
      await submitAssignment(false); // First attempt without forceUpdate
    } catch (error) {
      await handleSubmitError(error);
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const submitAssignment = async (forceUpdate = false) => {
    const payload = {
      offerEntries: formData.offerEntries.map(entry => ({
        offerId: entry.offerId,
        entryCount: parseInt(entry.entryCount),
      })),
      employeeIds: formData.employeeIds,
      ...(forceUpdate && { forceUpdate: true })
    };

    const response = await axios.post(`${config.apiurl}/offer/create-offer-entry`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    await handleSuccessResponse(response.data);
  };

  const handleConflictDialog = async (conflictData) => {
    const { existingEntries, totalExistingOffers, totalNewOffers } = conflictData;

    let htmlContent = `<div style="text-align: left; font-size: 14px;">`;

    htmlContent += `<div style="margin-bottom: 15px; padding: 10px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
    <strong style="color: #92400e;">⚠️ Entries Already Exist for Today</strong>
  </div>`;

    htmlContent += `<div style="margin-bottom: 15px;">
    <strong>📊 Summary:</strong><br>
    • Existing offers: ${totalExistingOffers}<br>
    • New offers: ${totalNewOffers}
  </div>`;

    if (existingEntries?.length) {
      htmlContent += `<div style="margin-bottom: 15px;">
      <strong>🔍 Existing Entries Details:</strong><br>`;

      existingEntries.forEach(entry => {
        htmlContent += `<div style="margin: 8px 0; padding: 8px; background: #f8fafc; border-radius: 4px; border-left: 3px solid #64748b;">
        <strong>Offer ID:</strong> ${entry.offerId}<br>
        <strong>Current Count:</strong> ${entry.currentEntryCount} → <strong>New Count:</strong> ${entry.newEntryCount}
      </div>`;
      });

      htmlContent += `</div>`;
    }

    htmlContent += `<div style="padding: 10px; background: #f0f9ff; border-radius: 6px; border-left: 4px solid #3b82f6;">
    <strong style="color: #1e40af;">💡 What happens if you update?</strong><br>
    • Previous employee assignments will be deleted<br>
    • New assignments will be created with updated counts<br>
    • Daily assignment records will be updated
  </div>`;

    htmlContent += `</div>`;

    const result = await Swal.fire({
      title: 'Entries Already Exist!',
      html: htmlContent,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Update Entries',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      width: '600px',
      customClass: {
        popup: 'swal-wide'
      }
    });

    if (result.isConfirmed) {
      // User confirmed, proceed with forceUpdate
      setLoading((prev) => ({ ...prev, submit: true }));
      try {
        await submitAssignment(true); // Call with forceUpdate = true
      } catch (updateError) {
        await handleSubmitError(updateError);
      } finally {
        setLoading((prev) => ({ ...prev, submit: false }));
      }
    }
  };

  // Handle successful response
  const handleSuccessResponse = async (data) => {
    const {
      message,
      operationType,
      dailyAssignWorks,
      employeeWiseEntries,
      processedDate,
      operationSummary,
      updateDetails
    } = data;

    // Build alert content
    let htmlContent = `<div style="text-align: left; font-size: 14px;">`;

    if (processedDate) {
      htmlContent += `<div style="margin-bottom: 10px; padding: 6px; background: #f0f9ff; border-radius: 4px;">
      <strong>📅 Date:</strong> ${processedDate}</div>`;
    }

    // Operation type indicator
    if (operationType === 'UPDATE') {
      htmlContent += `<div style="margin-bottom: 10px; padding: 6px; background: #fef3c7; border-radius: 4px;">
      <strong>🔄 Operation:</strong> Updated existing entries</div>`;
    } else {
      htmlContent += `<div style="margin-bottom: 10px; padding: 6px; background: #f0fdf4; border-radius: 4px;">
      <strong>✨ Operation:</strong> Created new entries</div>`;
    }

    // Operation summary
    if (operationSummary) {
      htmlContent += `<div style="margin-bottom: 10px;">`;

      if (operationSummary.dailyAssignmentsCreated > 0) {
        htmlContent += `<div><strong style="color: #059669;">✅ Created:</strong> 
        ${operationSummary.dailyAssignmentsCreated} daily assignments</div>`;
      }

      if (operationSummary.dailyAssignmentsUpdated > 0) {
        htmlContent += `<div><strong style="color: #0891b2;">🔄 Updated:</strong> 
        ${operationSummary.dailyAssignmentsUpdated} daily assignments</div>`;
      }

      if (operationSummary.employeeAssignmentsCreated > 0) {
        htmlContent += `<div><strong style="color: #7c3aed;">👥 Employee Assignments:</strong> 
        ${operationSummary.employeeAssignmentsCreated} created</div>`;
      }

      if (operationSummary.employeeAssignmentsDeleted > 0) {
        htmlContent += `<div><strong style="color: #dc2626;">🗑️ Previous Assignments:</strong> 
        ${operationSummary.employeeAssignmentsDeleted} removed</div>`;
      }

      htmlContent += `</div>`;
    }

    // Update details for update operations
    if (updateDetails?.updatedOffers?.length) {
      htmlContent += `<div style="padding: 8px; background: #fef3c7; border-radius: 4px; border-left: 3px solid #f59e0b; margin-top: 10px;">
      <strong style="color: #d97706;">📝 Updated Offers:</strong><br>`;
      updateDetails.updatedOffers.forEach(offer => {
        htmlContent += `• Offer: ${offer.offerId}<br>`;
        htmlContent += `&nbsp;&nbsp;Previous: ${offer.currentEntryCount} → New: ${offer.newEntryCount}<br>`;
      });
      htmlContent += `</div>`;
    }

    htmlContent += `</div>`;

    const isUpdate = operationType === 'UPDATE';

    await Swal.fire({
      title: isUpdate ? 'Updated Successfully!' : 'Created Successfully!',
      html: htmlContent,
      icon: 'success',
      confirmButtonText: 'Continue',
      confirmButtonColor: '#10b981',
      width: '550px'
    });

    navigate('/admin/AssignWorkTable');
  };


  const handleSubmitError = async (error) => {
    console.error('Error:', error);

    // Handle conflict case (entries already exist)
    if (error.response?.status === 409 && error.response?.data?.conflictType === 'ENTRIES_EXIST_TODAY') {
      await handleConflictDialog(error.response.data);
      return;
    }

    // Handle other errors
    let title = 'Error!';
    let content = 'An unexpected error occurred.';

    if (error.response?.data) {
      const { error: errorMsg, existingOffers } = error.response.data;
      content = errorMsg;

      if (existingOffers?.length) {
        title = 'Already Exists!';
        content += `<div style="margin-top: 10px; padding: 8px; background: #fef2f2; border-radius: 4px;">`;
        existingOffers.forEach(offer => {
          content += `• ${offer.message}<br>`;
        });
        content += `</div>`;
      }
    }

    await Swal.fire({
      title,
      html: content,
      icon: 'error',
      confirmButtonText: 'Try Again',
      confirmButtonColor: '#dc2626',
      width: '450px'
    });

    setError(content.replace(/<[^>]*>/g, '')); // Remove HTML tags for form error
  };

  return (
    <Paper
      elevation={3}
      sx={{
        maxWidth: '1100px',
        width: '100%',
        margin: 'auto',
        padding: { xs: 2, sm: 3 },
        borderRadius: '16px',
      }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{ fontWeight: 'bold', mb: 3, color: 'text.primary' }}
      >
        Assign Work
      </Typography>

      {(loading.offers || loading.employees) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        {formData.offerEntries.map((entry, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              padding: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '12px',
              background: 'grey.50',
              mb: 2,
            }}
          >
            <FormControl fullWidth sx={{ flex: 1 }}>
              <InputLabel id={`offerId-label-${index}`}>Select Offer</InputLabel>
              <Select
                labelId={`offerId-label-${index}`}
                id={`offerId-${index}`}
                name="offerId"
                value={entry.offerId}
                label="Select Offer"
                onChange={(e) => handleOfferEntryChange(index, 'offerId', e.target.value)}
                disabled={loading.offers}
                sx={{ borderRadius: '8px' }}
              >
                <MenuItem value="">-- Select an Offer --</MenuItem>
                {offers
                  .filter((offer) =>
                    !formData.offerEntries.some(
                      (entry, i) => entry.offerId === offer._id && i !== index
                    )
                  )
                  .map((offer) => (
                    <MenuItem key={offer._id} value={offer._id}>
                      {offer.offerName}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              label="Entry Count"
              type="number"
              name="entryCount"
              value={entry.entryCount}
              onChange={(e) => handleOfferEntryChange(index, 'entryCount', e.target.value)}
              placeholder="Enter count"
              fullWidth
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  background: 'background.default',
                  '& fieldset': { borderColor: 'grey.400' },
                  '&:hover fieldset': { borderColor: 'primary.main' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.dark' },
                },
                '& .MuiInputLabel-root': {
                  color: 'text.secondary',
                  fontWeight: 500,
                },
                '& .MuiInputBase-input': { fontSize: { xs: '0.9rem', sm: '1rem' } },
              }}
              InputProps={{ inputProps: { min: 1 } }}
            />

            <IconButton
              color="error"
              onClick={() => deleteOfferEntry(index)}
              disabled={formData.offerEntries.length === 1}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            onClick={addOfferEntry}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
            }}
            disabled={loading.offers}
          >
            Add Offer Row
          </Button>
        </Box>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="employeeIds-label">Select Employees</InputLabel>
          <Select
            labelId="employeeIds-label"
            id="employeeIds"
            name="employeeIds"
            multiple
            value={formData.employeeIds}
            onChange={handleEmployeeChange}
            label="Select Employees"
            disabled={loading.employees}
            sx={{ borderRadius: '8px' }}
            renderValue={(selected) =>
              selected
                .map((id) => employees.find((emp) => emp._id === id)?.fullName)
                .join(', ')
            }
          >
            {employees.map((employee) => (
              <MenuItem key={employee._id} value={employee._id}>
                {employee.fullName} 
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Hold Ctrl/Cmd to select multiple employees</FormHelperText>
        </FormControl>

        {formData.employeeIds.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 'medium', mb: 1, color: 'text.primary' }}
            >
              Selected Employees:
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 2, borderRadius: '8px', background: 'grey.50' }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.employeeIds.map((id) => {
                  const employee = employees.find((emp) => emp._id === id);
                  return (
                    <Chip
                      key={id}
                      label={`${employee?.fullName} `}
                      sx={{
                        m: 0.5,
                        flexBasis: { xs: '100%', sm: 'calc(33.33% - 8px)' },
                        maxWidth: { xs: '100%', sm: 'calc(33.33% - 14px)' },
                        backgroundColor: 'primary.light',
                        color: 'primary.contrastText',
                        fontWeight: 'large',
                        '& .MuiChip-label': {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                        fontSize: { xs: '0.8rem', sm: '0.9rem' },
                      }}
                    />
                  );
                })}
              </Box>
            </Paper>
          </Box>
        )}

        <div className="flex justify-center mt-10">
          <button
            type="submit"
            disabled={loading.submit || loading.offers || loading.employees}
            className="w-80 h-12 bg-gradient-to-r from-blue-400 to-blue-800 text-white font-bold rounded-2xl shadow-md hover:from-blue-600 hover:to-blue-800 transition-all duration-300 ease-in-out"
          >
            {loading.submit ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
          </button>
        </div>
      </form>
    </Paper>
  );
}

export default AssignWorkForm;