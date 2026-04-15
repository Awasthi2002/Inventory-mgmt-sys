import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Navbar,
  Typography,
  Button,
  IconButton,
  Breadcrumbs,
  Input,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  Avatar,
} from "@material-tailwind/react";
import {
  UserCircleIcon,
  Cog6ToothIcon,
  BellIcon,
  ClockIcon,
  CreditCardIcon,
  Bars3Icon,
} from "@heroicons/react/24/solid";
import {
  useMaterialTailwindController,
  setOpenConfigurator,
  setOpenSidenav,
} from "@/context";

import { Divider } from "@mui/material";

import { useAuth } from "@/pages/auth/AuthContext";
import axios from "axios";
import config from "@/config";

// Custom styles for simplified two-color radial gradients
const radialGradientStyles = `
  .gradient-admin {
    background: radial-gradient(circle at center, #8b5cf6, #d946ef);
  }
  .gradient-client {
    background: radial-gradient(circle at center, #3b82f6, #22d3ee);
  }
  .gradient-employee {
    background: radial-gradient(circle at center, #f97316, #fbbf24);
  }
  .gradient-operator {
    background: radial-gradient(circle at center, #ef4444, #fb7185);
  }
  .gradient-default {
    background: radial-gradient(circle at center, #6b7280, #d1d5db);
  }
`;

const RoleAvatar = ({ role }) => {
  const getGradientClass = (role) => {
    const normalizedRole = role?.toLowerCase();
    const gradientMap = {
      admin: 'gradient-admin',
      client: 'gradient-client',
      employee: 'gradient-employee',
      operator: 'gradient-operator',
    };
    return gradientMap[normalizedRole] || 'gradient-default';
  };

  const getFontSize = (role) => {
    const normalizedRole = role?.toLowerCase();
    // Use smaller font size for Employee to ensure it fits
    if (normalizedRole === 'employee') {
      return 'text-[9px]';
    }
    // Use slightly larger font size for operator
    if (normalizedRole === 'operator') {
      return 'text-[10px]';
    }
    // General rule for other roles
    return role && role.length > 8 ? 'text-[10px]' : 'text-xs';
  };

  const capitalizeFirstLetter = (string) => {
    if (!string) return 'User';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const normalizedRole = role?.toLowerCase();
  const gradientClass = getGradientClass(role);
  const displayRole = capitalizeFirstLetter(role || 'User');
  const fontSize = getFontSize(role);

  return (
    <>
      <style>{radialGradientStyles}</style>
      <div
        className={`w-10 h-10 rounded-full ${gradientClass} flex items-center justify-center shadow-md transform transition-all duration-300 hover:scale-105 ring-1 ring-white/30`}
      >
        <span className={`${fontSize} font-bold text-white text-center leading-tight px-0.5`}>
          {displayRole}
        </span>
      </div>
    </>
  );
};

export function DashboardNavbar() {
  const [controller, dispatch] = useMaterialTailwindController();
  const { fixedNavbar, openSidenav } = controller;
  const { pathname } = useLocation();
  const [error, setError] = useState(null);
  const [users, setUsers] = useState(null);
  const navigate = useNavigate();
  const [layout, page] = pathname.split("/").filter((el) => el !== "");
  const { user, logoutAs } = useAuth(); // Use the auth context

  const handleLogout = () => {
    logoutAs();
    navigate("/auth/sign-in"); // Redirect to sign-in page after logout
  };

  const fetchUser = async () => {
    try {
      if (user && user._id) { // Ensure user is defined before fetching
        const response = await axios.get(`${config.apiurl}/delivery-products/get-userbyid/${user._id}`);
        if (response.data.success) {
          setUsers(response.data.user);
        } else {
          setError(response.data.message);
        }
      }
    } catch (error) {
      setError('An error occurred while fetching user data');
    }
  };

  useEffect(() => {
    fetchUser();
  }, [users]);

  const handleMenuClick = () => {
    if (users?.role === 'admin') {
      navigate('/admin/notification');
    }
    // For other roles, the current functionality (opening the menu) will be preserved
  };

  return (
    <Navbar
      color={fixedNavbar ? "white" : "transparent"}
      className={`rounded-xl transition-all ${fixedNavbar
        ? "sticky top-4 z-40 py-3 shadow-md shadow-blue-gray-500/5"
        : "px-0 py-1"
        }`}
      fullWidth
      blurred={fixedNavbar}
    >
      <div className="flex flex-col-reverse justify-between gap-6 md:flex-row md:items-center">
        <div className="capitalize">
          {/* Add valid Breadcrumb links */}
          <Breadcrumbs
            className={`bg-transparent p-0 transition-all ${fixedNavbar ? "mt-1" : ""}`}
          >

            {layout && <Link to={`/${layout}`}>{layout}</Link>}
            {page && <Typography>{page}</Typography>}
          </Breadcrumbs>

        </div>
        <div className="flex items-center">
          <div className="mr-auto md:mr-4 md:w-56">
            <Input label="Search" />
          </div>
          <IconButton
            variant="text"
            color="blue-gray"
            className="grid xl:hidden"
            onClick={() => setOpenSidenav(dispatch, !openSidenav)}
          >
            <Bars3Icon strokeWidth={3} className="h-6 w-6 text-blue-gray-500" />
          </IconButton>
          <Menu>
            <MenuHandler>
              <Button
                variant="text"
                color="blue-gray"
                className="flex items-center gap-1 px-4 xl:flex md:hidden normal-case"
                onClick={handleMenuClick}
              >
                <RoleAvatar role={users?.role || user?.role || 'admin'} />
                <Typography className="ml-2 font-bold hidden md:block">
                  {users?.fullName || user?.fullName || 'Admin'}
                </Typography>
              </Button>
            </MenuHandler>
            <MenuList className="w-max border-0 transition-transform duration-300 ease-in-out">
              <div className="px-4 py-2">
                <Typography
                  variant="small"
                  color="blue-gray"
                  className="font-semibold"
                >
                  Welcome {users?.fullName || 'Admin'}!
                </Typography>
              </div>
              <Divider />
              <MenuItem onClick={handleLogout} className="flex items-center gap-3 hover:bg-gray-100 transition-colors duration-300">
                <Typography
                  variant="small"
                  color="blue-gray"
                  className="font-normal"
                >
                  Log Out
                </Typography>
              </MenuItem>
            </MenuList>
          </Menu>
          <Menu>
            <MenuHandler>
              <IconButton variant="text" color="blue-gray">
                <BellIcon className="h-5 w-5 text-blue-gray-500" 
                 onClick={handleMenuClick}/>
              </IconButton>
            </MenuHandler>
          </Menu>
          <IconButton
            variant="text"
            color="blue-gray"
            onClick={() => setOpenConfigurator(dispatch, true)}
          >
            <Cog6ToothIcon className="h-5 w-5 text-blue-gray-500" />
          </IconButton>
        </div>
      </div>
    </Navbar>
  );
}

DashboardNavbar.displayName = "/src/widgets/layout/dashboard-navbar.jsx";

export default DashboardNavbar;
