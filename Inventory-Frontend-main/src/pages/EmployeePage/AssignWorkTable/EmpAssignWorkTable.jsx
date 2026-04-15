import React, { useState, useEffect } from 'react';
import { Typography } from "@mui/material";
import TodayAssignWork from './TodayAssignWork';
import PendingAssignWork from './PendingAssignWork';
import AssignDashboard from './AssignDashboard';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../../auth/AuthContext';
import config from "@/config";



export function EmpAssignWorkTable() {
  const [activeTab, setActiveTab] = useState("Assign_Dashboard");
  const [pendingCount, setPendingCount] = useState(0); // State for pending count
  const [loading, setLoading] = useState(false); // State for loading
  const [data, setData] = useState([]); // State for API data (if needed elsewhere)
    const { user } = useAuth(); 

  // Fetch employee-entered data using empId
  useEffect(() => {
    if (user && user._id) {
      setLoading(true);
      console.log('Fetching data for empId:', user._id);
      axios.get(`${config.apiurl}/offer/get-all-emp-pending-entries/${user._id}`)
        .then((response) => {
          console.log('Raw API Response:', response);
          const fetchedData = response.data.data || [];
          const count = response.data.count || 0; // Extract count from API response
          console.log('Extracted API Data:', fetchedData);
          setData(fetchedData);
          setPendingCount(count); // Set pending count
          console.log('Data state after set:', fetchedData);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching data:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to fetch data. Please try again.',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
          });
          setLoading(false);
        });
    } else {
      console.log('User or user._id not available:', user);
      setLoading(false);
    }
  }, [user]);

  const tabs = [
     { id: "Assign_Dashboard", label: "Assign Dashboard" },
    { id: "Today_Assign_Work", label: "Today Assign Work" },
    { id: "Pending_Assign_Work", label: `Pending Assign Work -- (${pendingCount})` }, 
   

  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "Today_Assign_Work":
        return <TodayAssignWork />;
      case "Pending_Assign_Work":
        return <PendingAssignWork />;
           case "Assign_Dashboard":
        return <AssignDashboard />;
      default:
        return <TodayAssignWork />;
    }
  };

  return (
    <div className="lg:pr-4  lg:-ml-4">
      <div className="bg-white rounded-3xl shadow-lg">
        <div className="w-full border-b border-blue-100">
          <div className="flex flex-wrap gap-6 p-4 max-w-screen-xl mx-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative px-6 py-3 rounded-xl font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? "bg-gradient-to-b from-blue-500 to-indigo-500 text-white shadow-lg"
                      : "bg-white text-black hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border border-gray-500"
                  }
                `}
              >
                <span className="relative z-10">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-xl blur-sm" />
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Typography>Loading...</Typography> // Display loading state
        ) : (
          renderActiveComponent()
        )}
      </div>
    </div>
  );
}

export default EmpAssignWorkTable;