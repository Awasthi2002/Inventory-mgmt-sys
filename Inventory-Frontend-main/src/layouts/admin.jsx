import { Routes, Route, Outlet } from "react-router-dom";
import { Cog6ToothIcon } from "@heroicons/react/24/solid";
import { IconButton } from "@material-tailwind/react";
import { Sidenav, DashboardNavbar, Configurator, Footer } from "@/widgets/layout";
import routes from "@/routes";
import { useMaterialTailwindController, setOpenConfigurator } from "@/context";
import { Package } from "lucide-react";

export function Admin() {
  const [controller, dispatch] = useMaterialTailwindController();
  const { sidenavType } = controller;

  // Filter routes to only include those with layout: 'admin'
  const adminRoutes = routes.filter(route => route.layout === 'admin');

  return (
    <div className="min-h-screen bg-blue-gray-50/50">
      <Sidenav
        routes={adminRoutes}
        brandImg={
          sidenavType === "dark" ? "/img/logo-ct.png" : "/img/logo-ct-dark.png"
        }
      />
      <div className="p-4 xl:ml-80">
        <DashboardNavbar />
        <Configurator />
        <IconButton
          size="lg"
          color="white"
          className="fixed bottom-8 right-8 z-40 rounded-full shadow-blue-gray-900/10"
          ripple={false}
          onClick={() => setOpenConfigurator(dispatch, true)}
          as="div"
        >
          <Cog6ToothIcon className="h-5 w-5" />
        </IconButton>

        <Routes>
          {adminRoutes.map(({ pages }) =>
            pages.map(({ path, element, subroutes }) => (
              <Route key={path} path={path} element={<OutletWrapper element={element} />}>
                {subroutes && subroutes.map(({ path: subPath, element: subElement }) => (
                  <Route key={subPath} path={subPath} element={subElement} />
                ))}
              </Route>
            ))
          )}
        </Routes>

        <div className="text-blue-gray-600">
          <Footer />
        </div>
      </div>
    </div>
  );
}

const OutletWrapper = ({ element }) => (
  <>
    {element}
    <Outlet />
  </>
);

Admin.displayName = "/src/layout/admin.jsx";

export default Admin;
