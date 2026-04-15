import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardBody, Typography } from "@material-tailwind/react";
import config from '@/config';

export function EmployeeDetails() {
  const { id } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get(`${config.apiurl}/users/${id}`);
        setUser(response.data.data); // Assuming the API returns data in { success: true, data: {...} } format
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    fetchUserDetails();
  }, [id]);

  if (!user) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <Card className="w-full">
        <CardBody>
          <div className="flex flex-col">
            <Typography variant="h5" className="font-bold mb-4" style={{ color: '#7366F1' }}>
              Employee Detail
            </Typography>
            <hr style={{ borderColor: '#7366F1' }} className='mb-3' />
            <div className="space-y-2">
              <Typography variant="paragraph"><strong>ID:</strong> {user._id}</Typography>
              <Typography variant="paragraph"><strong>Full Name:</strong> {user.fullName}</Typography>
              <Typography variant="paragraph"><strong>Email:</strong> {user.email}</Typography>
              <Typography variant="paragraph"><strong>Phone:</strong> {user.phone}</Typography>
              <Typography variant="paragraph"><strong>Address:</strong> {user.address}</Typography>
              <Typography variant="paragraph"><strong>Status:</strong> {user.status === 0 ? 'Inactive' : 'Active'}</Typography>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default EmployeeDetails;
