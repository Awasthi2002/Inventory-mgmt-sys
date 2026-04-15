import React, { useState } from 'react';
import { Input, Button, Typography, Select, Option } from "@material-tailwind/react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Skeleton from 'react-loading-skeleton';
import config from '@/config';

export function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [poc, setPoc] = useState('admin');
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [role, setRole] = useState("vendor");
  const [gst_no, setGst_no] = useState("");
  const [pan_no, setPan_no] = useState("");
  const [createdDate, setCreatedDate] = useState("");
  const [updatedDate, setUpdatedDate] = useState("");
  const [status, setStatus] = useState("2");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Invalid email format',
        confirmButtonColor: "#d33"
      });
      return false;
    }
    return true;
  };

  const validatePhone = (phone) => {
    if (!/^[0-9]+$/.test(phone)) {
      Swal.fire({
        title: "Invalid Phone Number!",
        text: "Phone number must contain only digits.",
        icon: "error",
        confirmButtonColor: "#d33"
      });
      return false;
    }

    if (phone.length !== 10) {
      Swal.fire({
        title: "Invalid Phone Number Length!",
        text: "Phone number must be exactly 10 digits.",
        icon: "error",
        confirmButtonColor: "#d33"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!fullName || !email || !password || !companyName || !phone || !address || !companyType) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'All fields are required.',
        confirmButtonColor: "#d33"
      });
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setLoading(false);
      return;
    }

    if (!validatePhone(phone)) {
      setLoading(false);
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0];

    // Convert email to lowercase
    const lowercaseEmail = email.toLowerCase();
    try {
      await axios.post(`${config.apiurl}/signup`, {
        email: lowercaseEmail,
        password,
        role,
        fullName,
        companyName,
        companyType,
        gst_no,
        pan_no,
        poc: "admin",
        phone,
        address,
        status,
        createdDate: currentDate,
        updatedDate: currentDate,
      });
      Swal.fire({
        icon: 'success',
        title: 'Registration Successful!',
        text: 'You have been registered successfully.',
        confirmButtonColor: "#008000"
      }).then(() => {
        // Navigate to the sign-in page after the user clicks the confirmation button
        navigate("/auth/sign-in", { state: { from: "/auth/sign-up" } });
      });
    } catch (err) {
      if (err.response) {
        if (err.response.status === 400) {
          // Check for specific error messages returned by the server
          let errorMessage = '';
          if (err.response.data === 'User already registered') {
            errorMessage = 'This email is already registered. Please use a different email.';
          } else if (err.response.data === 'Email already exists') {
            errorMessage = 'This email is already in use. Please use another email or log in.';
          } else {
            errorMessage = err.response.data;
          }

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
            confirmButtonColor: "#d33"
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'An error occurred',
            text: 'Please try again later.',
            confirmButtonColor: "#d33"
          });
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'An error occurred',
          text: 'Please try again later.',
          confirmButtonColor: "#d33"
        });
      }
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <ToastContainer />
      <section className="flex flex-col lg:flex-row m-4 md:m-8 flex-grow">
        <div className="w-full lg:w-2/5 flex items-center justify-center mb-8 lg:mb-0 lg:h-[90vh] lg:ml-[85px] mt-4">
          {loading ? (
            <Skeleton height="100%" width="100%" />
          ) : (
            <div className="hidden lg:block w-full h-full">
              <img src="/img/v2-register-light-border.png" alt="Register" className="h-full w-full object-cover rounded-3xl" />
            </div>
          )}
        </div>
        <div className="w-full lg:w-3/5 flex flex-col items-center justify-start">
          <div className="text-center">
            <Typography variant="h2" className="font-bold mb-4 mr-0 lg:mr-14">
              Get your Vendor account now.
            </Typography>
          </div>
          <form className="mt-8 mb-2 mx-auto max-w-screen-sm w-full space-y-4 lg:space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <Input
                    label="Company Name"
                    type="text"
                    name="companyName"
                    value={companyName}
                    required
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="w-full md:w-1/2">
                  <Select
                    size="lg"
                    value={companyType}
                    onChange={(e) => setCompanyType(e)}
                    className="!border-t-blue-gray-200 focus:!border-t-gray-900"
                    labelProps={{
                      className: "before:content-none after:content-none",
                    }}
                    required
                    disabled={loading}
                  >
                    <Option value="" disabled>
                      Choose Company Type
                    </Option>
                    <Option value="Sole Proprietorship">Sole Proprietorship</Option>
                    <Option value="Partnership">Partnership</Option>
                    <Option value="Private Limited">Private Limited</Option>
                    <Option value="Public Company">Public Company</Option>
                    <Option value="Others">Others</Option>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <Input
                    label="Name"
                    type="text"
                    name="name"
                    value={fullName}
                    required
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="w-full md:w-1/2">
                  <Input
                    label="Email"
                    type="email"
                    name="email"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <Input
                    label="Phone"
                    type="text"
                    name="phone"
                    value={phone}
                    required
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="w-full md:w-1/2">
                  <Input
                    label="Password"
                    type="password"
                    name="password"
                    value={password}
                    required
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="w-full">
                <Input
                  label="Address"
                  type="text"
                  name="address"
                  value={address}
                  required
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <Button className="mt-6 bg-gray-200 text-white bg-[#7366F1]" fullWidth type="submit" disabled={loading}>
              {loading ? <Skeleton width={100} height={20} /> : "Register Now"}
            </Button>
            <Typography variant="paragraph" className="text-center text-blue-gray-500 font-medium mt-4">
              Already have an account?
              <Link to="/auth/sign-in" className="text-gray-900 ml-1" style={{ color: '#7366F1' }}>Sign in</Link>
            </Typography>
          </form>
        </div>
      </section>
      <footer className="py-4 bg-gray-100 w-full flex justify-center mt-10">
        <Typography variant="small" className="text-gray-700 text-center font-bold">
          © 2024 Marcadeo Finance
        </Typography>
      </footer>
    </div>
  );
}

export default Register;
