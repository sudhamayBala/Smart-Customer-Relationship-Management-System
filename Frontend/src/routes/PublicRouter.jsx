import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

function PublicRoute() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to={user?.role === "SUPER_ADMIN" ? "/super-admin/tenants" : "/dashboard"} replace />;
  }

  return <Outlet />;
}

export default PublicRoute;