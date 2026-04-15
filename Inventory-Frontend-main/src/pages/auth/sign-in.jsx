import {
  Card,
  Input,
  Checkbox,
  Button,
  Typography,
} from "@material-tailwind/react";
import { Link } from "react-router-dom";

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { useAuth } from "./AuthContext";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import config from "@/config";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${config.apiurl}/login`, {
        email,
        password,
      });

      if (response.data.user.status !== 1) {
        toast.error("Your account is inactive. Please contact your administrator.");
        setLoading(false);
        return;
      }
      const user = response.data.user;
      const token = response.data.token;
      login(user, token);

      const redirectPath = sessionStorage.getItem("redirectPath");
      if (redirectPath) {
        sessionStorage.removeItem("redirectPath");
        navigate(redirectPath);
      } else {
        if (user.role === "admin") {
          navigate("/admin/dashboard");
        } else if (user.role === "manager") {
          navigate("/manager/dashboard");
        } else if (user.role === "warehouse") {
          navigate("/warehouse/dashboard");
        } else if (user.role === "stockist") {
          navigate("/stockist/dashboard");
        } else if (user.role === "auditor") {
          navigate('/auditor/dashboard');
        } else {
          toast.error("Unauthorized role for inventory system");
        }
      }
    } catch (err) {
      if (err.response && err.response.data) {
        toast.error(err.response.data);
      } else {
        toast.error("Login failed. Please verify your credentials and try again.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <ToastContainer />
      <section className="flex flex-col lg:flex-row items-center justify-center w-full max-w-screen-lg mx-4 lg:mx-8">
        <div className="w-full lg:w-1/2 flex flex-col items-center">
          <div className="text-left mb-8 w-full max-w-sm">
            <div className="flex items-center mb-6">
              <img 
                src="/img/asset.png" 
                alt="Inventory Logo" 
                className="h-10 mr-3"
              />
              <Typography variant="h4" className="text-blue-gray-800 font-bold">
                {loading ? <Skeleton width={250} /> : `Inventory`}
              </Typography>
            </div>
            <Typography variant="h2" className="mb-4 text-blue-gray-900">
              {loading ? <Skeleton width={200} /> : `Welcome Back 📦`}
            </Typography>
            <Typography variant="paragraph" color="blue-gray" className="text-lg font-normal">
              {loading ? <Skeleton width={300} /> : 'Sign in to manage your inventory system.'}
            </Typography>
          </div>

          <form className="w-full max-w-sm bg-gray-100 p-6 rounded-xl shadow-sm" onSubmit={handleSubmit}>
            <div className="mb-6 flex flex-col gap-6">
              <Typography variant="small" color="blue-gray" className="-mb-3 font-medium">
                {loading ? <Skeleton width={80} /> : 'Email Address'}
              </Typography>
              {loading ? (
                <Skeleton height={40} />
              ) : (
                <Input
                  size="lg"
                  placeholder="username@company.com"
                  className="!border-t-blue-gray-200 focus:!border-t-gray-900 bg-amber-50"
                  labelProps={{
                    className: "before:content-none after:content-none",
                  }}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  icon={<i className="fas fa-envelope text-blue-gray-300" />}
                />
              )}
              <Typography variant="small" color="blue-gray" className="-mb-3 font-medium">
                {loading ? <Skeleton width={80} /> : 'Password'}
              </Typography>
              {loading ? (
                <Skeleton height={40} />
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Enter your password"
                    type={showPassword ? "text" : "password"}
                    size="lg"
                    className="!border-t-blue-gray-200 focus:!border-t-gray-900 pr-10 bg-amber-50"
                    labelProps={{
                      className: "before:content-none after:content-none",
                    }}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<i className="fas fa-lock text-blue-gray-300" />}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <i className="fas fa-eye-slash" />
                    ) : (
                      <i className="fas fa-eye" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <Button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white" fullWidth type="submit" disabled={loading}>
              {loading ? <Skeleton width={80} /> : 'Access Inventory System'}
            </Button>

            <div className="flex items-center justify-between gap-2 mt-6">
              {loading ? (
                <Skeleton width={80} />
              ) : (
                <Checkbox
                  label={
                    <Typography
                      variant="small"
                      color="gray"
                      className="flex items-center justify-start font-medium"
                    >
                      Remember Me
                    </Typography>
                  }
                />
              )}
              <Typography variant="small" className="font-medium text-gray-900">
                {loading ? <Skeleton width={100} /> : <Link to="/auth/forgot_password" className="text-blue-600 hover:text-blue-800">Forgot Password?</Link>}
              </Typography>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Typography variant="small" className="text-center text-gray-600">
                Need help? Contact <span className="text-blue-600">support@inventorypro.com</span>
              </Typography>
            </div>
          </form>
        </div>
        <div className="w-full lg:w-2/5 h-64 lg:h-[90vh] hidden lg:block lg:ml-[80px] mt-4">
          <img
            src="/img/inventory-management-illustration-vector.jpg"
            className="h-full w-full object-cover rounded-3xl"
            alt="Inventory Management"
            loading="lazy"
          />
        </div>
      </section>
      <footer className="py-4 w-full flex justify-center mt-10">
        <Typography variant="small" className="text-gray-700 text-center font-bold">
        © {new Date().getFullYear()} Inventory - All rights reserved
        </Typography>
      </footer>
    </div>
  );
}

export default SignIn;