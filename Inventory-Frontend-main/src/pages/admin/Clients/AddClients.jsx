import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import config from '@/config';
import { Card, CardContent, TextField, Button, MenuItem, FormControl, InputLabel, Select, Box, Typography } from '@mui/material';

export function AddClient (){
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    role: 'client',
    fullName: '',
    phone: '',
    address: '',
    status: 1, // Set default status to Active (1)
    poc: null,
    companyName: null,
    companyType: null,
    gst_no: null,
    pan_no: null,
  });
  const [error, setError] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'status') {
      const statusValue = value === 'Active' ? 1 : value === 'Inactive' ? 0 : value === 'Pending' ? 2 : '';
      setFormData((prev) => ({ ...prev, [name]: statusValue }));
    } else if (name === 'phone') {
      if (!/^\d*$/.test(value)) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Phone Number',
          text: 'Phone number must contain only digits.',
          confirmButtonColor: '#d33',
        });
        return;
      }
      if (value.length > 10) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Phone Number Length',
          text: 'Phone number must be exactly 10 digits.',
          confirmButtonColor: '#d33',
        });
        return;
      }
      setFormData((prev) => ({ ...prev, phone: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmedFullName = formData.fullName.trim();
    const updatedFormData = { ...formData, fullName: trimmedFullName };
    const requiredFields = ['email', 'role', 'fullName', 'phone', 'address'];

    for (let field of requiredFields) {
      if (!updatedFormData[field]) {
        Swal.fire({
          text: 'All fields are required',
          icon: 'error',
          confirmButtonColor: '#d33',
        });
        setLoading(false);
        return;
      }
    }

    if (updatedFormData.status === '') {
      Swal.fire({
        text: 'Status is required',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
      setLoading(false);
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(updatedFormData.email)) {
      Swal.fire({
        text: 'Invalid email format',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
      setLoading(false);
      return;
    }

    const phonePattern = /^\d{10}$/;
    if (!phonePattern.test(updatedFormData.phone)) {
      Swal.fire({
        text: 'Phone number must be exactly 10 digits',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
      setLoading(false);
      return;
    }

    const lowercaseEmail = updatedFormData.email.toLowerCase();

    try {
      const response = await axios.post(`${config.apiurl}/register`, {
        ...updatedFormData,
        email: lowercaseEmail,
        fullName: trimmedFullName,
      });
      const successMessage = `Client registered successfully. Generated password: ${response.data.generatedPassword}`;

      Swal.fire({
        text: successMessage,
        icon: 'success',
        confirmButtonColor: '#008000',
      }).then(() => {
        navigate('/admin/clients/manageClients');
      });

      console.log(response);
    } catch (err) {
      if (err.response) {
        Swal.fire({
          text: err.response.data,
          icon: 'error',
          confirmButtonColor: '#d33',
        });
      } else {
        Swal.fire({
          text: 'An error occurred. Please try again.',
          icon: 'error',
          confirmButtonColor: '#d33',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 px-4">
      <Card className="shadow-md rounded-md">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Typography className="font-bold text-lg text-gray-800">
                Add Client
              </Typography>
            </div>
            <div className="flex items-center">
              <Typography className="text-black-400 font-bold text-sm">
                Client
              </Typography>
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
              <Typography className="text-gray-400 ml-1 text-sm">
                Add Client
              </Typography>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md rounded-md">
        <CardContent className="p-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <Typography className="text-red-500 text-center text-sm">
                {error}
              </Typography>
            )}
            {responseMessage && (
              <Typography
                className={
                  responseMessage.includes('Client registered successfully')
                    ? 'text-green-500 text-center text-sm'
                    : 'text-red-500 text-center text-sm'
                }
              >
                {responseMessage.split('Generated password:')[0]}
                {responseMessage.includes('Generated password:') && (
                  <span className="text-green-500">
                    Generated password:{' '}
                    <span className="text-red-500">
                      {responseMessage.split('Generated password:')[1]}
                    </span>
                  </span>
                )}
              </Typography>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Full Name"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                fullWidth
                variant="outlined"
                size="small"
                className="bg-white rounded-md"
                InputProps={{
                  className: 'py-2 px-3 text-sm border-gray-300',
                }}
              />
              <TextField
                label="Phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                fullWidth
                variant="outlined"
                size="small"
                className="bg-white rounded-md"
                InputProps={{
                  className: 'py-2 px-3 text-sm border-gray-300',
                }}
              />
              <TextField
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                fullWidth
                variant="outlined"
                size="small"
                className="bg-white rounded-md"
                InputProps={{
                  className: 'py-2 px-3 text-sm border-gray-300',
                }}
              />
              <TextField
                label="Role"
                type="text"
                name="role"
                value={formData.role}
                disabled
                fullWidth
                variant="outlined"
                size="small"
                className="bg-gray-100 rounded-md"
                InputProps={{
                  className: 'py-2 px-3 text-sm border-gray-300',
                }}
              />
              <FormControl fullWidth variant="outlined" size="small" className="bg-white rounded-md">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={
                    formData.status === 1
                      ? 'Active'
                      : formData.status === 0
                      ? 'Inactive'
                      : formData.status === 2
                      ? 'Pending'
                      : ''
                  }
                  onChange={handleChange}
                  label="Status"
                  required
                  className="py-2 px-3 text-sm border-gray-300"
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Address"
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                fullWidth
                variant="outlined"
                size="small"
                className="bg-white rounded-md"
                InputProps={{
                  className: 'py-2 px-3 text-sm border-gray-300',
                }}
              />
            </div>
            <div className="flex justify-center mt-6">
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                className={`bg-[#7366F1] hover:bg-[#5a4ed1] text-white font-medium rounded-md px-6 py-2 transition-colors duration-200 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddClient;