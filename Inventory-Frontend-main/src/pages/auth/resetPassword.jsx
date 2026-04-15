import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Input, Button, Typography } from "@material-tailwind/react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Swal from 'sweetalert2';
import config from '@/config';


export function ResetPassword() {
  const { id, token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!validatePassword(password)) {
      toast.error('Password must be at least 8 characters long, contain one capital letter, one special character, and one number');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${config.apiurl}/reset-password/${id}/${token}`, { password });

      // Show SweetAlert on successful password reset
      Swal.fire({
        title: 'Password Changed!',
        text: response.data.message,
        icon: 'success',
        confirmButtonColor: '#008000',
        confirmButtonText: 'Go to Login'
      }).then(() => {
        // Navigate to login after clicking the confirm button
        navigate('/login');
      });

    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col justify-between overflow-hidden">
      <ToastContainer />
      <section className="m-4 md:m-8 flex flex-col lg:flex-row flex-grow items-center justify-center">
        <div className="w-full lg:w-3/5 mt-12 lg:mt-24 flex flex-col items-center px-4">
          <div className="w-full max-w-md" style={{ marginLeft: '1rem' }}>
            <div className="text-center">
              <Typography variant="h2" className="font-bold mb-4">
                {loading ? <Skeleton width={250} /> : 'Reset Your Password'}
              </Typography>
              <Typography variant="paragraph" color="blue-gray" className="text-lg font-normal mb-8">
                {loading ? <Skeleton width={300} /> : 'Resolving Password Issues: Find Your Solution Here.'}
              </Typography>
            </div>
            <form className="w-full" onSubmit={handleSubmit}>
              <div className="mb-6">
                {loading ? (
                  <Skeleton height={40} />
                ) : (
                  <Input
                    label='Enter new password'
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    size="lg"
                  />
                )}
              </div>
              <div className="mb-6">
                {loading ? (
                  <Skeleton height={40} />
                ) : (
                  <Input
                    label='Confirm new password'
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    size="lg"
                  />
                )}
              </div>
              <Button className="mt-6 bg-[#7366F1]" fullWidth type="submit" disabled={loading}>
                {loading ? <Skeleton width={100} /> : 'Reset Password'}
              </Button>
            </form>
          </div>
        </div>
        <div className="w-full lg:w-2/5 h-64 lg:h-[90vh] hidden lg:block lg:ml-[80px] mt-4">
          <img
            src="/img/v2-reset-password-light.png"
            className="w-full h-full object-contain rounded-3xl"
            alt="Pattern"
          />
        </div>
      </section>
      <footer className="py-4 bg-gray-100 w-full mt-auto flex justify-center">
        <Typography variant="small" className="text-gray-700 text-center font-bold">
          © 2024 Marcadeo Finance
        </Typography>
      </footer>
    </div>
  );
}

export default ResetPassword;
