import React, { useState } from 'react';
import { Typography } from "@mui/material";
import AssignDailyWork from './AssignDailyWork';
import EmpAssignDailyWork from './EmpAssignDailyWork';
import EmployeeStats from "./EmployeeStats"



export function AssignWorkTable() {
  const [activeTab, setActiveTab] = useState("Assign_Daily_Work");

  const tabs = [
    { id: "Assign_Daily_Work", label: "Assign Daily Work" },
    { id: "EmpAssign_Daily_Work", label: "Employee wise Assign Daily Work" },
        { id: "Employee_Stats", label: "Employee Stats" },

 
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "Assign_Daily_Work":
        return <AssignDailyWork />;
      case "EmpAssign_Daily_Work":
        return <EmpAssignDailyWork />;
        case "Employee_Stats":
        return <EmployeeStats />;
   
      default:
        return <AssignDailyWork />;
    }
  };

  return (
    <div className="lg:pr-4  lg:-ml-4">
      <div className="bg-white rounded-3xl shadow-lg">
      

        <div className="w-full  border-b border-blue-100">
          <div className="flex flex-wrap gap-6 p-4 max-w-screen-xl mx-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
              relative px-6 py-3 rounded-xl font-medium text-sm
              
              ${activeTab === tab.id
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

        {renderActiveComponent()}
      </div>
    </div>
  );
}

export default AssignWorkTable;