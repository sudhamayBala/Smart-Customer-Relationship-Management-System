import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useLogoutMutation } from "../store/api/AuthApi";
import { logout } from "../store/slices/authSlice";

function LogoutButton() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [logoutRequest, { isLoading }] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutRequest().unwrap();
    } catch (error) {
      if (error?.status !== 401) {
        console.error(error);
      }
    } finally {
      dispatch(logout());
      navigate("/login", { replace: true });
    }
  };

  return (
    <button type="button" onClick={handleLogout} disabled={isLoading}>
      {isLoading ? "Signing out..." : "Sign out"}
    </button>
  );
}

export default LogoutButton;