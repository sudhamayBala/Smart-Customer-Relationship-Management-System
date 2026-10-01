import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import PropertyDetails from "../pages/PropertyDetails";
import PropertyForm from "../pages/PropertyForm";
import ProtectedRoute from "../components/ProtectedRoute";
import PublicRoute from "../components/PublicRoute";
import RoleRoute from "../components/RoleRoute";
import MainLayout from "../layouts/MainLayout";
import Dashboard from "../pages/Dashboard";
import Properties from "../pages/Properties";
import MyProperties from "../pages/MyProperties";
import AdminUsers from "../pages/AdminUsers";
import AdminMasterData from "../pages/AdminMasterData";
import SuperAdminTenants from "../pages/SuperAdminTenants";
import NotFound from "../pages/NotFound";
import Forbidden from "../pages/Forbidden";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route
            element={
              <RoleRoute
                allowedRoles={["ADMIN", "MANAGER"]}
              />
            }
          >
            <Route
              path="/properties"
              element={<Properties />}
            />

            <Route
              path="/properties/new"
              element={<PropertyForm />}
            />

            <Route
              path="/properties/:id/edit"
              element={<PropertyForm />}
            />
          </Route>

          <Route
            path="/my-properties"
            element={<MyProperties />}
          />

          <Route
            element={
              <RoleRoute allowedRoles={["ADMIN"]} />
            }
          >
            <Route
              path="/admin/users"
              element={<AdminUsers />}
            />

            <Route
              path="/admin/master-data"
              element={<AdminMasterData />}
            />
          </Route>

          <Route
            element={
              <RoleRoute
                allowedRoles={["SUPER_ADMIN"]}
              />
            }
          >
            <Route
              path="/super-admin/tenants"
              element={<SuperAdminTenants />}
            />
          </Route>

          <Route
            path="/properties/:id"
            element={<PropertyDetails />}
          />
        </Route>
      </Route>

      <Route
        path="/403"
        element={<Forbidden />}
      />

      <Route
        path="/404"
        element={<NotFound />}
      />

      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/404"
            replace
          />
        }
      />
    </Routes>
  );
}

export default AppRoutes;