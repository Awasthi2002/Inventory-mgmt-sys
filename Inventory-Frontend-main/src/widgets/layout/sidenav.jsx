// import React, { useState } from "react";
// import PropTypes from "prop-types";
// import { Link, NavLink } from "react-router-dom";
// import { XMarkIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
// import { Button, Typography } from "@material-tailwind/react";
// import { useMaterialTailwindController, setOpenSidenav } from "@/context";
// import { Package } from "lucide-react";
// import { Store } from "lucide-react";
// import { Building2, ClipboardList } from "lucide-react"; 
// import InventoryIcon from '@mui/icons-material/Inventory';

// export function Sidenav({ brandImg, brandName, routes }) {
//   const [controller, dispatch] = useMaterialTailwindController();
//   const { sidenavColor, sidenavType, openSidenav } = controller;
//   const [expandedMenu, setExpandedMenu] = useState("");
//   const [activeRoute, setActiveRoute] = useState("");

//   const sidenavTypes = {
//     dark: "bg-gradient-to-r from-[#7366F1] to-[#7366F1] text-white",
//     white: "bg-white shadow-sm",
//     transparent: "bg-transparent",
//     active: "bg-gradient-to-r from-[#7366F1] to-[#7366F1] text-white"
//   };

//   const handleMenuClick = (menuName) => {
//     setExpandedMenu(prev => (prev === menuName ? "" : menuName));
//   };

//   const handleRouteClick = (path) => {
//     setActiveRoute(path);
//   };

//   const iconColor = (isActive, menuName) => {
//     return isActive || expandedMenu === menuName
//       ? sidenavColor
//       : sidenavType === "dark"
//         ? "text-white"
//         : "text-blue-gray-800";
//   };

//   const renderSubroutes = (subroutes, layout, parentPath = "") => (
//     <ul className="ml-8 mt-2">
//       {subroutes
//         .filter(({ visible }) => visible !== false)
//         .map(({ path, name, subroutes: childSubroutes }) => (
//           <li key={`${parentPath}/${path}-${name}`}>
//             {childSubroutes ? (
//               <>
//                 <div onClick={() => handleMenuClick(name)} className="flex justify-between items-center px-4 w-full cursor-pointer">
//                   <Button
//                     variant="text"
//                     color={sidenavType === "dark" ? "white" : "blue-gray"}
//                     className="flex items-center gap-4 capitalize w-full text-left"
//                   >
//                     <div className="flex items-center gap-4">
//                       <Typography color="inherit" className="font-medium capitalize">
//                         {name}
//                       </Typography>
//                     </div>
//                   </Button>
//                   <div className="flex items-center">
//                     {expandedMenu === name ? (
//                       <ChevronDownIcon className={`h-5 w-5 ${iconColor(false, name)}`} />
//                     ) : (
//                       <ChevronRightIcon className={`h-5 w-5 ${iconColor(false, name)}`} />
//                     )}
//                   </div>
//                 </div>

//                 {expandedMenu === name && renderSubroutes(childSubroutes, layout, `${parentPath}/${path}`)}
//               </>
//             ) : (
//               <NavLink
//                 to={`/${layout}${parentPath}/${path}`}
//                 onClick={() => handleRouteClick(`${layout}${parentPath}/${path}`)}
//               >
//                 {({ isActive }) => (
//                   <Button
//                     variant={isActive ? "gradient" : "text"}
//                     color={getButtonColor(isActive)}
//                     className={`flex items-center justify-between gap-4 px-4 capitalize w-full text-left ${activeRoute === `${layout}${parentPath}/${path}` ? sidenavTypes.active : ''}`}
//                   >
//                     <Typography color="inherit" className="font-medium capitalize">
//                       {name}
//                     </Typography>
//                   </Button>
//                 )}
//               </NavLink>
//             )}
//           </li>
//         ))}
//     </ul>
//   );

//   const getButtonColor = (isActive) => {
//     const buttonColor = isActive ? sidenavColor : (sidenavType === "dark" ? "white" : "blue-gray");
//     const validColors = ["white", "blue-gray", "gray", "brown", "deep-orange", "orange", "amber", "yellow", "lime", "light-green", "green", "teal", "cyan", "light-blue", "blue", "indigo", "deep-purple", "purple", "pink", "red"];
//     return validColors.includes(buttonColor) ? buttonColor : "blue-gray";
//   };

//   return (
//     <aside
//       className={`${sidenavTypes[sidenavType]} ${
//         openSidenav ? "translate-x-0" : "-translate-x-72"
//       } fixed inset-0 z-50 h-full w-72 transition-transform duration-300 xl:translate-x-0 border border-blue-gray-100`}
//     >
//       <div className="relative">
//       <Link to="/admin/home" className="relative border-b border-blue-gray-50">
//   <div className="flex items-center gap-3 px-8 py-6">
//     <div className="flex items-center gap-2">
//       <Package 
//         size={28} 
//         className={`${
//           sidenavType === "dark" 
//             ? "text-white" 
//             : "text-[#7366F1]"
//         } transition-colors duration-300`}
//         strokeWidth={1.5}
//       />
//       <div className="flex flex-col">
//         <Typography
//           variant="h6"
//           color={sidenavType === "dark" ? "white" : "blue-gray"}
//           className="font-bold tracking-wide text-xl md:text-2xl" 

//         >
//           {brandName}
//         </Typography>
//         <Typography
//           variant="small"
//           className={`${
//             sidenavType === "dark" 
//               ? "text-blue-gray-100" 
//               : "text-blue-gray-600"
//           } text-xs font-medium`}
//         >
//           Management System
//         </Typography>
//       </div>
//     </div>
//   </div>
//   </Link>
  
//   {/* Responsive close button - improved positioning */}
//   <Button
//     variant="text"
//     color="blue-gray"
//     size="sm"
//     ripple={false}
//     className="absolute right-0 top-0 grid rounded-br-none rounded-tl-none xl:hidden "
//     onClick={() => setOpenSidenav(dispatch, false)}
//   >
//     <XMarkIcon strokeWidth={2.5} className="h-5 w-5 text-blue-gray-500" />
//   </Button>

//       </div>

//       <div className="m-4 h-[calc(100vh-112px)] overflow-y-auto">
//         {routes.map(({ layout, title, pages }, key) => (
//           <ul key={`${layout}-${title || key}`} className="mb-4 flex flex-col gap-1">
//             {title && (
//               <li className="mx-3.5 mt-4 mb-2">
//                 <Typography
//                   variant="small"
//                   color={sidenavType === "dark" ? "white" : "blue-gray"}
//                   className="font-black uppercase opacity-75"
//                 >
//                   {title}
//                 </Typography>
//               </li>
//             )}
//             {pages
//               .filter(({ visible }) => visible !== false)
//               .map(({ icon, name, path, subroutes }) => (
//                 <li key={`${layout}-${path}-${name}`}>
//                   {subroutes ? (
//                     <>
//                       <div onClick={() => handleMenuClick(name)} className="flex justify-between items-center px-4 w-full cursor-pointer">
//                         <Button
//                           variant="text"
//                           color={sidenavType === "dark" ? "white" : "blue-gray"}
//                           className="flex items-center justify-between gap-4 px-4 capitalize w-full text-left"
//                         >
//                           <div className="flex items-center gap-4">
//                             {icon}
//                             <Typography
//                               color="inherit"
//                               className="font-medium capitalize"
//                             >
//                               {name}
//                             </Typography>
//                           </div>
//                         </Button>
//                         <div className="flex items-center">
//                           {expandedMenu === name ? (
//                             <ChevronDownIcon className={`h-5 w-5 ${iconColor(false, name)}`} />
//                           ) : (
//                             <ChevronRightIcon className={`h-5 w-5 ${iconColor(false, name)}`} />
//                           )}
//                         </div>
//                       </div>
//                       {expandedMenu === name && renderSubroutes(subroutes, layout, path)}
//                     </>
//                   ) : (
//                     <NavLink
//                       to={`/${layout}${path}`}
//                       onClick={() => handleRouteClick(`${layout}${path}`)}
//                     >
//                       {({ isActive }) => (
//                         <Button
//                           variant={isActive ? "gradient" : "text"}
//                           color={getButtonColor(isActive)}
//                           className={`flex items-center justify-between gap-4 px-4 capitalize w-full text-left ${activeRoute === `${layout}${path}` ? sidenavTypes.active : ''}`}
//                         >
//                           <div className="flex items-center gap-4 ml-4">
//                             {icon}
//                             <Typography
//                               color="inherit"
//                               className="font-medium capitalize"
//                             >
//                               {name}
//                             </Typography>
//                           </div>
//                         </Button>
//                       )}
//                     </NavLink>
//                   )}
//                 </li>
//               ))}
//           </ul>
//         ))}
//       </div>
//     </aside>
//   );
// }

// Sidenav.defaultProps = {
//   brandImg: "/img/logo-ct.png",
//   brandName: "INVENTORY",
// };

// Sidenav.propTypes = {
//   brandImg: PropTypes.string,
//   brandName: PropTypes.string,
//   routes: PropTypes.arrayOf(PropTypes.object).isRequired,
// };

// Sidenav.displayName = "/src/widgets/layout/sidenav.jsx";

// export default Sidenav;






import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link, NavLink } from "react-router-dom";
import { XMarkIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Button, Typography } from "@material-tailwind/react";
import { useMaterialTailwindController, setOpenSidenav } from "@/context";
import { Package } from "lucide-react";

export function Sidenav({ brandImg, brandName, routes }) {
  const [controller, dispatch] = useMaterialTailwindController();
  const { sidenavColor, sidenavType, openSidenav } = controller;
  const [expandedMenu, setExpandedMenu] = useState("");
  const [activeRoute, setActiveRoute] = useState("");

  const sidenavTypes = {
    dark: "bg-slate-900 text-white border-slate-700",
    white: "bg-white shadow-sm border-slate-200",
    transparent: "bg-white/95 backdrop-blur-sm",
    active: "bg-indigo-600 text-white"
  };

  const handleMenuClick = (menuName) => {
    setExpandedMenu(prev => (prev === menuName ? "" : menuName));
  };

  const handleRouteClick = (path) => {
    setActiveRoute(path);
  };

  const iconColor = (isActive, menuName) => {
    return isActive || expandedMenu === menuName
      ? sidenavColor
      : sidenavType === "dark"
        ? "text-slate-300"
        : "text-slate-500";
  };

  const renderSubroutes = (subroutes, layout, parentPath = "") => (
    <ul className="ml-6 mt-1 space-y-2 border-l border-slate-200/50 pl-3">
      {subroutes
        .filter(({ visible }) => visible !== false)
        .map(({ path, name, subroutes: childSubroutes }) => (
          <li key={`${parentPath}/${path}-${name}`}>
            {childSubroutes ? (
              <>
                <div 
                  onClick={() => handleMenuClick(name)} 
                  className="flex justify-between items-center px-2 py-1.5 w-full cursor-pointer rounded hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    <Typography color="inherit" className="font-medium text-sm">
                      {name}
                    </Typography>
                  </div>
                  <div className="flex items-center">
                    {expandedMenu === name ? (
                      <ChevronDownIcon className={`h-3 w-3 ${iconColor(false, name)}`} />
                    ) : (
                      <ChevronRightIcon className={`h-3 w-3 ${iconColor(false, name)}`} />
                    )}
                  </div>
                </div>
                {expandedMenu === name && renderSubroutes(childSubroutes, layout, `${parentPath}/${path}`)}
              </>
            ) : (
              <NavLink
                to={`/${layout}${parentPath}/${path}`}
                onClick={() => handleRouteClick(`${layout}${parentPath}/${path}`)}
              >
                {({ isActive }) => (
                  <div
                    className={`flex items-center gap-2 px-2 py-1.5 capitalize w-full text-left rounded text-sm transition-colors ${
                      activeRoute === `${layout}${parentPath}/${path}` 
                        ? 'bg-indigo-600 text-white' 
                        : 'hover:bg-blue-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    <Typography color="inherit" className="font-medium text-sm">
                      {name}
                    </Typography>
                  </div>
                )}
              </NavLink>
            )}
          </li>
        ))}
    </ul>
  );

  const getButtonColor = (isActive) => {
    const buttonColor = isActive ? sidenavColor : (sidenavType === "dark" ? "white" : "blue-gray");
    const validColors = ["white", "blue-gray", "gray", "brown", "deep-orange", "orange", "amber", "yellow", "lime", "light-green", "green", "teal", "cyan", "light-blue", "blue", "indigo", "deep-purple", "purple", "pink", "red"];
    return validColors.includes(buttonColor) ? buttonColor : "blue-gray";
  };

  return (
    <aside
      className={`${sidenavTypes[sidenavType]} ${
        openSidenav ? "translate-x-0" : "-translate-x-64"
      } fixed inset-0 z-50 h-full w-64 transition-transform duration-300 xl:translate-x-0 border-r`}
    >
      <div className="relative">
        <Link to="/admin/home" className="border-b border-slate-200/50">
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="p-1.5 rounded-lg bg-indigo-600">
              <Package 
                size={20} 
                className="text-white"
                strokeWidth={2}
              />
            </div>
            <div className="flex flex-col">
              <Typography
                variant="h6"
                color={sidenavType === "dark" ? "white" : "blue-gray"}
                className="font-semibold text-lg leading-tight"
              >
                {brandName}
              </Typography>
              <Typography
                variant="small"
                className={`${
                  sidenavType === "dark" 
                    ? "text-slate-400" 
                    : "text-slate-500"
                } text-xs font-medium`}
              >
                Management System
              </Typography>
            </div>
          </div>
        </Link>
        
        <Button
          variant="text"
          color="blue-gray"
          size="sm"
          ripple={false}
          className="absolute right-2 top-2 grid rounded xl:hidden hover:bg-blue-100 p-1.5"
          onClick={() => setOpenSidenav(dispatch, false)}
        >
          <XMarkIcon strokeWidth={2} className="h-4 w-4 text-slate-500" />
        </Button>
      </div>

      <div className="px-3 py-1 h-[calc(100vh-100px)]overflow-y-auto scrollbar-hide">
        {routes.map(({ layout, title, pages }, key) => (
          <ul key={`${layout}-${title || key}`} className="mb-4 flex flex-col gap-0.5">
            {title && (
              <li className="mx-1 mt-4 mb-2">
                <Typography
                  variant="small"
                  color={sidenavType === "dark" ? "white" : "blue-gray"}
                  className="font-semibold uppercase opacity-60 tracking-wide text-xs"
                >
                  {title}
                </Typography>
              </li>
            )}
            {pages
              .filter(({ visible }) => visible !== false)
              .map(({ icon, name, path, subroutes }) => (
                <li key={`${layout}-${path}-${name}`}>
                  {subroutes ? (
                    <>
                      <div 
                        onClick={() => handleMenuClick(name)} 
                        className="flex justify-between items-center px-3 py-2 w-full cursor-pointer rounded hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {React.cloneElement(icon, { 
                            className: "w-4 h-4 text-slate-600 dark:text-slate-300" 
                          })}
                          <Typography
                            color="inherit"
                            className="font-medium text-sm"
                          >
                            {name}
                          </Typography>
                        </div>
                        <div className="flex items-center">
                          {expandedMenu === name ? (
                            <ChevronDownIcon className={`h-4 w-4 ${iconColor(false, name)}`} />
                          ) : (
                            <ChevronRightIcon className={`h-4 w-4 ${iconColor(false, name)}`} />
                          )}
                        </div>
                      </div>
                      {expandedMenu === name && (
                        <div className="mt-1 mb-2">
                          {renderSubroutes(subroutes, layout, path)}
                        </div>
                      )}
                    </>
                  ) : (
                    <NavLink
                      to={`/${layout}${path}`}
                      onClick={() => handleRouteClick(`${layout}${path}`)}
                    >
                      {({ isActive }) => (
                        <div
                          className={`flex items-center gap-3 px-3 py-2 capitalize w-full text-left rounded text-sm transition-colors ${
                            activeRoute === `${layout}${path}` 
                              ? 'bg-indigo-600 text-white' 
                              : 'hover:bg-blue-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {React.cloneElement(icon, { 
                            className: `w-4 h-4 transition-colors ${
                              isActive || activeRoute === `${layout}${path}`
                                ? 'text-white'
                                : 'text-slate-600 dark:text-slate-300'
                            }` 
                          })}
                          <Typography
                            color="inherit"
                            className="font-medium text-sm"
                          >
                            {name}
                          </Typography>
                        </div>
                      )}
                    </NavLink>
                  )}
                </li>
              ))}
          </ul>
        ))}
      </div>
    </aside>
  );
}

Sidenav.defaultProps = {
  brandImg: "/img/logo-ct.png",
  brandName: "INVENTORY",
};

Sidenav.propTypes = {
  brandImg: PropTypes.string,
  brandName: PropTypes.string,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

Sidenav.displayName = "/src/widgets/layout/sidenav.jsx";

export default Sidenav;