import {
  Card,
  Input,
  Checkbox,
  Button,
  Typography,
} from "@material-tailwind/react";
import { Link } from "react-router-dom";
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import config from "@/config";

export function SignUp() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("adarsh");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("adarsh");
  const [country, setCountry] = useState("");
  const [role, setRole] = useState("advertiser");
  const [error, setError] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [status, setStatus] = useState("0");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post(`${config.apiurl}/signup`, {
        email,
        password,
        role,
        fullName,
        companyName,
        phone,
        address,
        country,
        postalCode,
        status,
      });
      navigate("/auth/sign-in", { state: { from: "/auth/sign-up" } });
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError(err.response.data);
      } else {
        setError("An error occurred. Please try again.");
      }
    }
  };

  return (
    <section className="m-8 flex">
      <div className="w-2/5 h-full hidden lg:block">
        <img
          src="/img/pattern.png"
          className="h-full w-full object-cover rounded-3xl"
        />
      </div>
      <div className="w-full lg:w-3/5 flex flex-col items-center justify-center">
        <div className="text-center">
          <Typography variant="h2" className="font-bold mb-4">
            Join Us Today
          </Typography>
          <Typography
            variant="paragraph"
            color="blue-gray"
            className="text-lg font-normal"
          >
            Enter your email and password to register.
          </Typography>
        </div>
        <form className="mt-8 mb-2 mx-auto w-full max-w-screen-lg lg:w-1/2">
        {error && (
                <div className="w-full text-red-500 text-center mt-2">
                  {error}
                </div>
              )}
          <div className="mb-1 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/2">
                <Typography
                  variant="small"
                  color="blue-gray"
                  className="font-medium"
                >
                  Company Name
                </Typography>
                <Input
                  size="lg"
                  placeholder="Company Name"
                  className="w-full !border-t-blue-gray-200 focus:!border-t-gray-900"
                  labelProps={{
                    className: "before:content-none after:content-none",
                  }}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                  }}
                />
              </div>
              <div className="w-1/2 md:w-1/2">
                <Typography
                  variant="small"
                  color="blue-gray"
                  className="font-medium"
                >
                  Full Name
                </Typography>
                <Input
                  size="lg"
                  placeholder="Full Name"
                  className="w-full !border-t-blue-gray-200 focus:!border-t-gray-900"
                  labelProps={{
                    className: "before:content-none after:content-none",
                  }}
                  onChange={(e) => {
                    setFullName(e.target.value);
                  }}
                />
              </div>
            </div>
            <div className="w-full">
              <Typography
                variant="small"
                color="blue-gray"
                className="-mb-3 font-medium"
              >
                Email
              </Typography>
              <Input
                size="lg"
                placeholder="name@mail.com"
                className="w-full !border-t-blue-gray-200 focus:!border-t-gray-900"
                labelProps={{
                  className: "before:content-none after:content-none",
                }}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </div>
            <div className="w-full">
              <Typography
                variant="small"
                color="blue-gray"
                className="-mb-3 font-medium"
              >
                Password
              </Typography>
              <Input
                size="lg"
                type="password"
                placeholder="Password"
                className="w-full !border-t-blue-gray-200 focus:!border-t-gray-900"
                labelProps={{
                  className: "before:content-none after:content-none",
                }}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
            </div>
            <div className="w-full">
              <Typography
                variant="small"
                color="blue-gray"
                className="-mb-3 font-medium"
              >
                Phone
              </Typography>
              <Input
                size="lg"
                placeholder="Phone"
                className="w-full !border-t-blue-gray-200 focus:!border-t-gray-900"
                labelProps={{
                  className: "before:content-none after:content-none",
                }}
                onChange={(e) => {
                  setPhone(e.target.value);
                }}
              />
            </div>
            <div className="w-full">
              <Typography
                variant="small"
                color="blue-gray"
                className="-mb-3 font-medium"
              >
                Address
              </Typography>
              <Input
                size="lg"
                placeholder="Address"
                className="w-full !border-t-blue-gray-200 focus:!border-t-gray-900"
                labelProps={{
                  className: "before:content-none after:content-none",
                }}
                onChange={(e) => {
                  setAddress(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/2">
                <Typography
                  variant="small"
                  color="blue-gray"
                  className="font-medium"
                >
                  Country
                </Typography>
                <Input
                  size="lg"
                  placeholder="Country"
                  className="w-full !border-t-blue-gray-200 focus:!border-t-gray-900"
                  labelProps={{
                    className: "before:content-none after:content-none",
                  }}
                  onChange={(e) => {
                    setCountry(e.target.value);
                  }}
                />
              </div>
              <div className="w-full md:w-1/2">
                <Typography
                  variant="small"
                  color="blue-gray"
                  className="font-medium"
                >
                  Postal Code
                </Typography>
                <Input
                  size="lg"
                  placeholder="Postal Code"
                  className="w-full !border-t-blue-gray-200 focus:!border-t-gray-900"
                  labelProps={{
                    className: "before:content-none after:content-none",
                  }}
                  onChange={(e) => {
                    setPostalCode(e.target.value);
                  }}
                />
              </div>
            </div>
          </div>
          <Checkbox
            label={
              <Typography
                variant="small"
                color="gray"
                className="flex items-center justify-start font-medium"
              >
                I agree to the&nbsp;
                <a
                  href="#"
                  className="font-normal text-black transition-colors hover:text-gray-900 underline"
                >
                  Terms and Conditions
                </a>
              </Typography>
            }
            containerProps={{ className: "-ml-2.5" }}
          />
          <Button className="mt-6" fullWidth onClick={handleSubmit}>
            Register Now
          </Button>
          <Typography
            variant="paragraph"
            className="text-center text-blue-gray-500 font-medium mt-4"
          >
            Already have an account?
            <Link to="/auth/register" className="text-gray-900 ml-1">
              Sign in
            </Link>
          </Typography>
        </form>
      </div>
    </section>
  );
}

export default SignUp;
