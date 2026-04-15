import { Card, CardBody, Input, Button } from "@material-tailwind/react";
import React, { useState } from "react";
import axios from "axios";
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import config from "@/config";


export function AddEmployees() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    role: "",
    fullName: "",
    phone: "",
    address: "",
    status: "1",
    poc: null,
    companyName: null,
    companyType: null,
    gst_no: null,
    pan_no: null,
  });
  const [error, setError] = useState("");
  const [responseMessage, setResponseMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'status') {
      let statusValue;
      switch (value) {
        case 'Active':
          statusValue = 1;
          break;
        case 'Inactive':
          statusValue = 0;
          break;
        case 'Pending':
          statusValue = 2;
          break;
        default:
          statusValue = "";
      }
      setFormData(prevState => ({
        ...prevState,
        [name]: statusValue
      }));
    } else if (name === 'phone') {
      // Phone number validation
      if (!/^\d*$/.test(value)) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Phone Number',
          text: 'Phone number must contain only digits.',
          confirmButtonColor: '#d33' // Corrected property
        });
        return;
      } else if (value.length > 10) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Phone Number Length',
          text: 'Phone number must be exactly 10 digits.',
          confirmButtonColor: '#d33' // Corrected property
        });
        return;
      } else {
        setFormData(prevState => ({
          ...prevState,
          phone: value
        }));
        return;
      }
    } else {
      setFormData(prevState => ({
        ...prevState,
        [name]: value
      }));
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
  
    // Trim the fullName field silently
    const trimmedFullName = formData.fullName.trim();
    
    // Update the formData with the trimmed fullName without notifying the user
    setFormData(prevData => ({
      ...prevData,
      fullName: trimmedFullName
    }));
  
    // Validate required fields
    const requiredFields = ['email', 'role', 'fullName', 'phone', 'address'];
    for (let field of requiredFields) {
      if (!formData[field]) {
        Swal.fire({
          text: 'All fields are required',
          icon: 'error',
          confirmButtonColor: '#d33'
        });
        setLoading(false);
        return;
      }
    }
  
    if (formData.status === "") {
      Swal.fire({
        text: "Status is required",
        icon: 'error',
        confirmButtonColor: '#d33'
      });
      setLoading(false);
      return;
    }
  
    // Validate email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.email)) {
      Swal.fire({
        text: "Invalid email format",
        icon: 'error',
        confirmButtonColor: '#d33'
      });
      setLoading(false);
      return;
    }
  
    // Validate phone number
    const phonePattern = /^\d{10}$/;
    if (!phonePattern.test(formData.phone)) {
      Swal.fire({
        text: "Phone number must be exactly 10 digits",
        icon: 'error',
        confirmButtonColor: '#d33'
      });
      setLoading(false);
      return;
    }
  
    // Convert email to lowercase
    const lowercaseEmail = formData.email.toLowerCase();
  
    try {
      const response = await axios.post(`${config.apiurl}/register`, {
        ...formData,
        email: lowercaseEmail,
        fullName: trimmedFullName // Use the trimmed fullName here
      });
      const successMessage = `User registered successfully. Generated password: ${response.data.generatedPassword}`;
      
      Swal.fire({
        text: successMessage,
        icon: 'success',
        confirmButtonColor: "#008000"
      }).then(() => {
        navigate('/admin/employees/manageEnployees'); // Navigate to the desired page after success
      });
      
      console.log(response);
    } catch (err) {
      if (err.response) {
        Swal.fire({
          text: err.response.data,
          icon: 'error',
          confirmButtonColor: '#d33'
        });
      } else {
        Swal.fire({
          text: "An error occurred. Please try again.",
          icon: 'error',
          confirmButtonColor: '#d33'
        });
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <p className="font-bold text-lg">Add Employee</p>
            </div>
            <div className="flex items-center">
              <p className="text-black-400 font-bold">Employee</p>
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
              <p className="text-gray-400 ml-1">Add Employee</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <p className="text-red-500 text-center">{error}</p>}
            {responseMessage && (
              <p className={responseMessage.includes('User registered successfully') ? 'text-green-500 text-center' : 'text-red-500 text-center'}>
                {responseMessage.split('Generated password:')[0]}
                {responseMessage.includes('Generated password:') && (
                  <span className="text-green-500">
                    Generated password: <span className="text-red-500">{responseMessage.split('Generated password:')[1]}</span>
                  </span>
                )}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <Input
                  label="Full Name"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  label="Phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="md:col-span-1">
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-black-500 focus:border-black-500 sm:text-sm"
                  required
                >
                  <option value="">Select Role</option>
                  <option value="User">User</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <select
                  name="status"
                  value={formData.status === 1 ? 'Active' : formData.status === 0 ? 'Inactive' : formData.status === 2 ? 'Pending' : ''}
                  onChange={handleChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                >
                  {/* <option value="">Select Status</option> */}
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <Input
                  label="Address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="flex justify-center mt-6">
              <Button type="submit" style={{ backgroundColor: "#7366F1" }} disabled={loading}>
                {loading ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}


export default AddEmployees;
