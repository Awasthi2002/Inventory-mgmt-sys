import React, { useState, useEffect } from 'react';
import { Calendar, Users, FileText, TrendingUp, AlertCircle, Loader2, ShoppingCart  } from 'lucide-react';
import { Box, Card, CardContent, Typography, Button, Stack } from '@mui/material';
import config from "@/config";

const EmployeeStats = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  // Set default dates on component mount
  useEffect(() => {
    const today = new Date();
    const currentDate = today.toISOString().split('T')[0];
    setStartDate(currentDate);
    setEndDate(currentDate);
  }, []);

  // Validate dates
  const validateDates = (start, end) => {
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const today = new Date();
    
    if (startDateObj > today) {
      return 'Start date cannot be in the future';
    }
    // if (endDateObj > today) {
    //   return 'End date cannot be in the future';
    // }
    if (startDateObj > endDateObj) {
      return 'End date must be after start date';
    }
    return '';
  };

  // Fetch data from API
  const fetchData = async () => {
    if (!startDate || !endDate) return;
    
    const validationError = validateDates(startDate, endDate);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${config.apiurl}/offer/emp-data-analytics?startDate=${startDate}&endDate=${endDate}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to connect to server. Please check if the API is running.');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

    // Auto-fetch data when dates change
  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate]);



  // Format date for display
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
           <Card
                elevation={0}
                sx={{
                  mb: 3,
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                  marginTop: '-28px',
                }}
              >
                <CardContent>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    justifyContent="space-between"
                    sx={{ py: 1 }}
                  >
                    <Typography
                      variant="h5"
                      component="h1"
                      sx={{
                        fontWeight: 600,
                        color: '#1F2937',
                      }}
                    >
                     Employee Stats Dashboard
                     <span>
                                  <p className="text-gray-600 text-sm">Monitor employee entry statistics and performance metrics</p>

                     </span>
                    </Typography>
                    
                     <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div className="flex-1">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
          
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}
                  
                  </Stack>
                </CardContent>
              </Card>

   
      

        {/* Results Section */}
        {data ? (
          <>
            {/* Summary Cards */}
        {/* Summary Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mb-8">
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center">
      <div className="p-2 bg-blue-100 rounded-lg">
        <FileText className="h-6 w-6 text-blue-600" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">Total Entries</p>
        <p className="text-2xl font-bold text-gray-900">{data.overall.totalEntries}</p>
      </div>
    </div>
  </div>
  
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center">
      <div className="p-2 bg-green-100 rounded-lg">
        <TrendingUp className="h-6 w-6 text-green-600" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">Completed</p>
        <p className="text-2xl font-bold text-gray-900">{data.overall.completedEntries}</p>
      </div>
    </div>
  </div>
  
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center">
      <div className="p-2 bg-red-100 rounded-lg">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">Pending</p>
        <p className="text-2xl font-bold text-gray-900">{data.overall.pendingEntries}</p>
      </div>
    </div>
  </div>
  
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center">
      <div className="p-2 bg-purple-100 rounded-lg">
        <Users className="h-6 w-6 text-purple-600" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600"> Employees</p>
        <p className="text-2xl font-bold text-gray-900">{data.summary.totalUniqueEmployees}</p>
      </div>
    </div>
  </div>

  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center">
      <div className="p-2 bg-blue-100 rounded-lg">
        <ShoppingCart  className="h-6 w-6 text-blue-600" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">Offers</p>
        <p className="text-2xl font-bold text-gray-900">{data.summary.totalOffers}</p>
      </div>
    </div>
  </div>
</div>

        

            {/* Offers Section */}
            {data.offers && data.offers.length > 0 ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Offer Details</h2>
                
                {data.offers.map((offer) => (
                  <div key={offer.offerId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">{offer.offerTitle}</h3>
                        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                          <span className="text-sm text-blue-600">
                            Total: <span className="font-medium bg-blue-500 px-2 py-1 text-white rounded-full">{offer.offerTotals.totalEntries}</span>
                          </span>
                          <span className="text-sm text-green-600">
                            Completed: <span className="font-medium  bg-green-500 px-2 py-1 text-white rounded-full">{offer.offerTotals.completedEntries}</span>
                          </span>
                          <span className="text-sm text-red-600">
                            Pending: <span className="font-medium bg-red-500 px-2 py-1 text-white rounded-full">{offer.offerTotals.pendingEntries}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      {offer.employees && offer.employees.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                                  Employee
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                                  Email
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                                  Assigned
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                                  Completed
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                                  Pending
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Progress
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {offer.employees.map((employee) => {
                                const progressPercentage = employee.assignedEntries > 0 
                                  ? Math.round((employee.completedEntries / employee.assignedEntries) * 100) 
                                  : 0;
                                
                                return (
                                  <tr key={employee.employeeId} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">{employee.employeeName}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-600">{employee.employeeEmail}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{employee.assignedEntries}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-green-600 font-medium">{employee.completedEntries}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm text-red-600 font-medium">{employee.pendingEntries}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                          <div 
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${progressPercentage}%` }}
                                          ></div>
                                        </div>
                                        <span className="text-xs text-gray-600">{progressPercentage}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No employees assigned to this offer</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600">No offers found for the selected date range. Try adjusting your date filters.</p>
              </div>
            )}
          </>
        ) : !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Analyze</h3>
            <p className="text-gray-600">Select your date range and click "Analyze" to view employee analytics data.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeStats;