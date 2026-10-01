import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useGetMeQuery } from "../store/api/AuthApi";
import { setUser, logout } from "../store/slices/authSlice";

function AuthInitializer({ children }) {
  const dispatch = useDispatch();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const { data, error, isFetching } = useGetMeQuery(undefined, {
    skip: !accessToken,
  });

  useEffect(() => {
    if (data?.user) {
      dispatch(setUser(data.user));
    }

    if (error?.status === 401) {
      dispatch(logout());
    }
  }, [data, error, dispatch]);

  if (accessToken && (isFetching || error?.status === 401)) {
    return null;
  }

  return children;
}

export default AuthInitializer;