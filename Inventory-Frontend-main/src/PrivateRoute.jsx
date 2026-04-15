import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./pages/auth/AuthContext";

const PrivateRoute = ({ children, roles }) => {
  const { user, adminUser } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Save the current path to localStorage
    localStorage.setItem("lastPath", location.pathname);
  }, [location.pathname]);

 

  
  if (!user) {
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  // Check if the user has the required role
  if (roles && !roles.includes(user.role)) {
    // For other unauthorized accesses, redirect to the appropriate dashboard
    let redirectPath;
    switch (user.role) {
      case 'admin':
        redirectPath = '/admin/home';
        break;
      case 'client':
        redirectPath = '/client/home';
        break;
      case 'User':
        redirectPath= '/user/home';
        break;
      case 'Employee':
        redirectPath = '/employee/home';
        break;
      case 'operator':
        redirectPath = '/operator/home';
        break;
      default:
        redirectPath = '/';
    }
    return <Navigate to={redirectPath} replace />;
  }

  // If all checks pass, render the children
  return children;
};

export default PrivateRoute;