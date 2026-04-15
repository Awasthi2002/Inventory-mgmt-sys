import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import {
  Auth,
  Admin, ClientDashboard,
  UserDashboard,
  EmployeeDashboard,
  OperatorDashboard
} from "@/layouts";

import { AuthProvider, useAuth } from "./pages/auth/AuthContext";
import PrivateRoute from "./PrivateRoute";




const PublicRoute = ({ children }) => {
  const { user } = useAuth();

  if (user) {
    // Redirect logged-in users trying to access a public route
    return <Navigate to="/admin" replace />;
  }

  return children;
};



function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();



  useEffect(() => {
    // Update lastPath whenever the route changes
    if (user && !location.pathname.startsWith('/auth')) {
      localStorage.setItem("lastPath", location.pathname);
    }
  }, [location.pathname, user]);

  useEffect(() => {
    // Navigate to lastPath on initial load or when user changes
    const lastPath = localStorage.getItem("lastPath");
    if (lastPath && user && location.pathname === '/') {
      navigate(lastPath);
    }
  }, [user, navigate, location.pathname]);
  return (

    <Routes>
      <Route path="/admin/*" element={
        <PrivateRoute roles={['admin']}>
          <Admin />
        </PrivateRoute>
      } />

      {/* <Route path="/auth/*" element={<Auth />} /> */}
      <Route path="/auth/*" element={
        <PublicRoute>
          <Auth />
        </PublicRoute>
      } />


      <Route path="/client/*" element={
        <PrivateRoute roles={['client']}>
          < ClientDashboard />
        </PrivateRoute>
      } />



      
      <Route path="/user/*" element={
        <PrivateRoute roles={['User']}>
          <UserDashboard />
        </PrivateRoute>
      } />

      <Route path="/employee/*" element={
        <PrivateRoute roles={['Employee']}>
          <EmployeeDashboard />
        </PrivateRoute>
      } />

            <Route path="/operator/*" element={
        <PrivateRoute roles={['operator']}>
          <OperatorDashboard />
        </PrivateRoute>
      } />

      <Route path="*" element={<Navigate to="/auth/sign-in" replace />} />
    </Routes>

  );

}

export default App;
