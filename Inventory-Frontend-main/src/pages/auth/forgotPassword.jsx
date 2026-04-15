import React, { useState } from 'react';
import { Input, Button, Typography } from "@material-tailwind/react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import config from '@/config';

export function Forgotpassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Show loading toast
      toast.info('Sending email...', { autoClose: false, toastId: 'loadingToast' });

      const response = await fetch(`${config.apiurl}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(data.message);

      // Close loading toast and show success
      toast.dismiss('loadingToast');
      toast.success(data.message);
    } catch (error) {
      setMessage('An error occurred. Please try again later.');
      // Close loading toast and show error
      toast.dismiss('loadingToast');
      toast.error('An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between overflow-hidden">
      <ToastContainer />
      <section className="m-4 md:m-8 flex flex-col lg:flex-row flex-grow items-center justify-center">
        <div className="w-full lg:w-3/5 mt-12 lg:mt-24 flex flex-col items-center px-4">
          <div className="text-center w-full max-w-md" style={{ marginLeft: '1rem' }}>
            {loading ? (
              <Skeleton width={250} height={40} />
            ) : (
              <Typography variant="h2" className="font-bold mb-4">
                Reset Your Password 🔒
              </Typography>
            )}
            {loading ? (
              <Skeleton width={300} height={20} />
            ) : (
              <Typography variant="paragraph" color="blue-gray" className="text-lg font-normal">
                Resolving Password Issues: Find Your Solution Here.
              </Typography>
            )}
          </div>
          <form className="mt-8 mb-2 w-full max-w-md" onSubmit={handleSubmit}>
            <div className="mb-1 flex flex-col gap-6">
              <Typography variant="small" color="blue-gray" className="-mb-3 font-medium">
                Your email
              </Typography>
              <Input
                size="lg"
                placeholder="name@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="!border-t-blue-gray-200 focus:!border-t-gray-900 w-full"
                labelProps={{
                  className: "before:content-none after:content-none",
                }}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="mt-6 bg-gray-200 text-white bg-[#7366F1]" fullWidth disabled={loading}>
              {loading ? <Skeleton height={20} width={150} /> : 'Send Password Reset Link'}
            </Button>
          </form>
          {message && (
            <Typography variant="small" color="red" className="mt-4">
              {message}
            </Typography>
          )}
        </div>
        <div className="w-full lg:w-2/5 h-64 lg:h-[90vh]  hidden lg:block lg:ml-[80px] mt-4">
          <img
            src="/img/v2-forgot-password-light.png"
            className="w-full h-auto max-h-full object-contain rounded-3xl"
            alt="Pattern"
            loading="lazy"
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

export default Forgotpassword;
