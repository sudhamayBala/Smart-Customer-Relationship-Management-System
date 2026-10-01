import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetMeQuery } from "../store/api/AuthApi";

function RoleRoute({ allowedRoles }) {
  const location = useLocation();
  const user = useSelector((state) => state.auth?.user);
  const accessToken = useSelector((state) => state.auth?.accessToken);
  const { data, isFetching, error } = useGetMeQuery(undefined, {
    skip: !accessToken || Boolean(user),
  });

  const role =
    user?.role ||
    user?.user?.role ||
    user?.data?.role ||
    data?.user?.role;

  if (!role) {
    if (accessToken && isFetching) return null;
    if (error?.status === 401) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}

export default RoleRoute;