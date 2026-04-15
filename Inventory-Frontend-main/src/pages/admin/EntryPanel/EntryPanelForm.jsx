import React, { useState, useEffect } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Box,
  IconButton,
  Card,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Tooltip from '@mui/material/Tooltip';
import config from "@/config";
import axios from 'axios';
import Swal from 'sweetalert2';

export function EntryPanelForm() {
  const [formData, setFormData] = useState({
    clientId: '',
    offerName: '',
    previewLink: '',
    trackingLinks: [{ link: '', margin: '' }],
  });
  const [clients, setClients] = useState([]);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch(`${config.apiurl}/clients`);
      const data = await response.json();
      setClients(data);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error fetching clients',
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.clientId) newErrors.clientId = 'Client is required';
    if (!formData.offerName) newErrors.offerName = 'Offer name is required';
    if (!formData.previewLink) newErrors.previewLink = 'Preview link is required';

    const trackingErrors = formData.trackingLinks.map((tracking, index) => ({
      link: !tracking.link ? 'Tracking link is required' : '',
      margin: !tracking.margin ? 'Margin is required' : 
              isNaN(tracking.margin) || tracking.margin <= 0 ? 'Margin must be a positive number' : '',
    }));

    // Check for duplicate links
    const links = formData.trackingLinks.map(t => t.link);
    const duplicates = links.filter((link, index) => link && links.indexOf(link) !== index);
    if (duplicates.length > 0) {
      trackingErrors.forEach((error, index) => {
        if (duplicates.includes(formData.trackingLinks[index].link)) {
          error.link = 'Tracking links must be unique';
        }
      });
    }

    // Check total margin
    const totalMargin = formData.trackingLinks.reduce((sum, t) => sum + (parseFloat(t.margin) || 0), 0);
    if (totalMargin !== 100) {
      newErrors.totalMargin = 'Total margin must be exactly 100%';
    }

    setErrors({ ...newErrors, trackingLinks: trackingErrors });
    return Object.keys(newErrors).length === 0 && trackingErrors.every(error => !error.link && !error.margin);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleTrackingLinkChange = (index, e) => {
    const { name, value } = e.target;
    const updatedLinks = [...formData.trackingLinks];
    updatedLinks[index][name] = value;
    setFormData({ ...formData, trackingLinks: updatedLinks });
  };

  const addTrackingLink = () => {
    setFormData({
      ...formData,
      trackingLinks: [...formData.trackingLinks, { link: '', margin: '' }],
    });
  };

  const removeTrackingLink = (index) => {
    const updatedLinks = formData.trackingLinks.filter((_, i) => i !== index);
    setFormData({ ...formData, trackingLinks: updatedLinks });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      if (errors.totalMargin) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: errors.totalMargin,
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please fill all required fields and ensure tracking links are unique.',
        });
      }
      return;
    }

    try {
      const response = await axios.post(`${config.apiurl}/offer/create`, formData, {
        headers: { 'Content-Type': 'application/json' },
      });
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Offer created successfully!',
      }).then(() => {
        navigate('/admin/EntryPanelTable');
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to create offer: ${error.response?.data?.error || error.message}`,
      });
    }
  };

  const totalMargin = formData.trackingLinks.reduce((sum, t) => sum + (parseFloat(t.margin) || 0), 0);

  return (
    <Box component="form" onSubmit={handleSubmit} className="max-w-5xl mx-auto ">
      <Card className="p-14 shadow-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Offer Create Form
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <FormControl fullWidth required error={!!errors.clientId}>
            <InputLabel sx={{ bgcolor: 'background.paper', px: 1 }}>Select Client</InputLabel>
            <Select
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              sx={{ borderRadius: '8px', height: '56px' }}
            >
              {clients.map(client => (
                <MenuItem key={client._id} value={client._id}>
                  {client.fullName}
                </MenuItem>
              ))}
            </Select>
            {errors.clientId && <p className="text-red-500 text-sm">{errors.clientId}</p>}
          </FormControl>

          <TextField
            label="Offer Name"
            name="offerName"
            value={formData.offerName}
            onChange={handleChange}
            fullWidth
            required
            error={!!errors.offerName}
            helperText={errors.offerName}
          />
        </div>

        <TextField
          label="Preview Link"
          name="previewLink"
          value={formData.previewLink}
          onChange={handleChange}
          fullWidth
          required
          error={!!errors.previewLink}
          helperText={errors.previewLink}
        />

        {formData.trackingLinks.map((tracking, index) => (
          <div
            key={index}
            className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mt-6"
          >
            <TextField
              className="md:col-span-8"
              label={`Tracking Link ${index + 1}`}
              name="link"
              value={tracking.link}
              onChange={(e) => handleTrackingLinkChange(index, e)}
              fullWidth
              required
              error={!!errors.trackingLinks?.[index]?.link}
              helperText={errors.trackingLinks?.[index]?.link}
            />
            <TextField
              className="md:col-span-3"
              label="Margin %"
              name="margin"
              type="number"
              value={tracking.margin}
              onChange={(e) => handleTrackingLinkChange(index, e)}
              fullWidth
              required
              error={!!errors.trackingLinks?.[index]?.margin}
              helperText={errors.trackingLinks?.[index]?.margin}
            />
            <div className="md:col-span-1 flex justify-start md:justify-center space-x-2">
              {index > 0 && (
                <Tooltip title="Remove this tracking link">
                  <IconButton onClick={() => removeTrackingLink(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
              {index === formData.trackingLinks.length - 1 && (
                <Tooltip title={totalMargin >= 100 ? "Cannot add more links: Total margin reached or exceeded 100%" : "Add new tracking link"}>
                  <span>
                    <IconButton onClick={addTrackingLink} disabled={totalMargin >= 100}>
                      <AddIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
        ))}

        <div className="flex justify-center mt-10">
          <button
            type="submit"
            className="w-80 h-12 bg-gradient-to-r from-blue-400 to-blue-800 text-white font-bold rounded-2xl shadow-md hover:from-blue-600 hover:to-blue-800 transition-all duration-300 ease-in-out"
          >
            Submit
          </button>
        </div>
      </Card>
    </Box>
  );
}

export default EntryPanelForm;