import { Navigate, Route, Routes } from "react-router-dom";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import InviteAccept from "../pages/InviteAccept";
import Dashboard from "../pages/Dashboard";
import Properties from "../pages/property";
import PropertyForm from "../pages/PropertyForm";
import PropertyDetails from "../pages/PropertyDetails";
import AdminUsers from "../pages/AdminUsers";
import AdminMasterData from "../pages/AdminMasterData";
import SuperAdminTenants from "../pages/SuperAdminTenants";
import Forbidden from "../pages/Forbidden";
import NotFound from "../pages/NotFound";
import ProtectedRoute from "./protectedRouter";
import PublicRoute from "./PublicRouter";
import RoleRoute from "../components/RoleRoute";
import MainLayout from "../layouts/MainLayout";
import SiteVisits from "../pages/SiteVisites";
import { siteVisitPath } from "./siteVisitRoutes";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/accept-invite" element={<InviteAccept />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/new" element={<PropertyForm />} />
          <Route path="/properties/:id/edit" element={<PropertyForm />} />
          <Route path="/properties/:id" element={<PropertyDetails />} />
          <Route path={siteVisitPath} element={<SiteVisits />} />

          <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/master-data" element={<AdminMasterData />} />
          </Route>

        </Route>

        <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN"]} />}>
          <Route path="/super-admin/tenants" element={<SuperAdminTenants />} />
        </Route>
      </Route>

      <Route path="/403" element={<Forbidden />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

export default AppRoutes;