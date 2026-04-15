import React, { useState, useEffect } from 'react';
import { Users, FileText, TrendingUp, AlertCircle, Loader2,ShoppingCart } from 'lucide-react';
import { Card, CardContent, Typography, Stack } from '@mui/material';
import { useAuth } from '../../auth/AuthContext';
import axios from 'axios';
import Swal from 'sweetalert2';
import config from '@/config';

const AssignDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Fetch data from API using user._id
  useEffect(() => {
    if (user && user._id) {
      setLoading(true);
      console.log('Fetching data for employeeId:', user._id);
      axios.get(`${config.apiurl}/offer/emp-specific-analytics?employeeId=${user._id}`)
        .then((response) => {
          console.log('Raw API Response:', response);
          const fetchedData = response.data;
          if (fetchedData.success) {
            setData(fetchedData.data);
            console.log('Extracted API Data:', fetchedData.data);
          } else {
            setError(fetchedData.message || 'Failed to fetch data');
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: fetchedData.message || 'Failed to fetch data',
              confirmButtonColor: '#3085d6',
            });
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error('API Error:', error);
          setError('Failed to connect to server. Please check if the API is running.');
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to connect to server. Please try again.',
            confirmButtonColor: '#3085d6',
          });
          setLoading(false);
        });
    } else {
      console.log('User or user._id not available:', user);
      setError('User not authenticated');
      setLoading(false);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            mt: -3.5,
          }}
          className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-48'
        >
          <CardContent>
            <Stack spacing={2} sx={{ py: 1 }}>
              <Typography
                variant="h5"
                component="h1"
                sx={{
                  fontWeight: 600,
                  color: '#1F2937',
                }}
              >
                Employee Stats Dashboard
                <Typography component="p" sx={{ color: '#6B7280', fontSize: '0.875rem', mt: 1 }}>
                  Monitor your entry statistics and performance metrics
                </Typography>
              </Typography>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              )}
            </Stack>
          </CardContent>
          <CardContent>
            {data && data.employee ? (
              <Stack direction="row" spacing={2} alignItems="center">
                <Users className="h-6 w-6 text-blue-600" />
                <Stack>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {data.employee.employeeName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>
                    {data.employee.employeeEmail}
                  </Typography>
                </Stack>
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                Employee data not available
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Results Section */}
        {data && !loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card sx={{ borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <ShoppingCart className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
                        Total Offers
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1F2937' }}>
                        {data.summary.totalOffers}
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card sx={{ borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
                        Total Entries
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1F2937' }}>
                        {data.overall.totalEntries}
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card sx={{ borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
                        Completed
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1F2937' }}>
                        {data.overall.completedEntries}
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card sx={{ borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
                        Pending
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1F2937' }}>
                        {data.overall.pendingEntries}
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Offer Details */}
            {data.offers && data.offers.length > 0 ? (
           <div className="space-y-6">
  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1F2937', mb: 2 }}>
    Offer Details
  </Typography>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {data.offers.map((offer) => (
      <Card
        key={offer.offerId}
        sx={{
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ bgcolor: '#F9FAFB' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1F2937' }}>
              {offer.offerTitle}
            </Typography>
            <Stack direction="row" spacing={3}>
              <Typography variant="body1" sx={{ color: '#2563EB' }}>
                Total: <span className="font-medium bg-blue-500 px-2 py-1 text-white rounded-full">{offer.assignedEntries}</span>
              </Typography>
              <Typography variant="body1" sx={{ color: '#16A34A' }}>
                Completed: <span className="font-medium bg-green-500 px-2 py-1 text-white rounded-full">{offer.completedEntries}</span>
              </Typography>
              <Typography variant="body1" sx={{ color: '#DC2626' }}>
                Pending: <span className="font-medium bg-red-500 px-2 py-1 text-white rounded-full">{offer.pendingEntries}</span>
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
        <CardContent>
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${offer.completionRate}%` }}
              ></div>
            </div>
            <Typography variant="body2" sx={{ color: '#6B7280', minWidth: '40px' }}>
              {offer.completionRate}%
            </Typography>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
</div>
            ) : (
              <Card sx={{ borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', p: 6, textAlign: 'center' }}>
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <Typography variant="h6" sx={{ fontWeight: 500, color: '#1F2937', mb: 1 }}>
                  No Offers Available
                </Typography>
                <Typography variant="body2" sx={{ color: '#6B7280' }}>
                  No offers assigned to you at the moment.
                </Typography>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AssignDashboard;