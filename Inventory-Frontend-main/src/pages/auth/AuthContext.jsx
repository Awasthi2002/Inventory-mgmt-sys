// AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import config from '@/config';


const AuthContext = createContext(null);

const API_BASE_URL = `${config.apiurl}`;

export function AuthProvider  ({ children })  {
  const [user, setUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedAdminUser = localStorage.getItem('adminUser');
        const token = localStorage.getItem('token');

        if (storedUser && token) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          if (storedAdminUser) {
            setAdminUser(JSON.parse(storedAdminUser));
          }
          await refreshToken();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        fallbackLogout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const refreshToken = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/refreshToken`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const { token } = response.data;
      localStorage.setItem('token', token);
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  };

  const login = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const loginAs = async (clientId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/loginAs`, { clientId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const { token, user } = response.data;
      localStorage.setItem('adminUser', JSON.stringify(JSON.parse(localStorage.getItem('user'))));
      setAdminUser(JSON.parse(localStorage.getItem('user')));
      login(user, token);
    } catch (error) {
      console.error('Error logging in as client:', error);
      throw error;
    }
  };

  const logoutAs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/logoutAs`, { token }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.token && response.data.user) {
        // Admin returning to their account
        localStorage.removeItem('adminUser');
        setAdminUser(null);
        login(response.data.user, response.data.token);
      } else {
        // Regular logout
        fallbackLogout();
      }
    } catch (error) {
      console.error('Error during logout process:', error);
      fallbackLogout();
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/logout`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      console.error('Error notifying server about logout:', error);
    } finally {
      fallbackLogout();
    }
  };

  const fallbackLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('adminUser');
    setUser(null);
    setAdminUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, adminUser, login, loginAs, logoutAs, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;