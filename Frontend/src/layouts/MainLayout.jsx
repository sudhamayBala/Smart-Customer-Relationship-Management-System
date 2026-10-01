import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import HomeWorkOutlined from "@mui/icons-material/HomeWorkOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";
import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import PeopleAltOutlined from "@mui/icons-material/PeopleAltOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import "../style/MainLayout.css";

function MainLayout() {
  const { pathname } = useLocation();
  const user = useSelector((state) => state.auth.user);
  const role = user?.role
    ? user.role.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Team member";

  if (/^\/properties\/[^/]+$/.test(pathname)) {
    return <Outlet />;
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <NavLink className="sidebar-brand" to="/properties" aria-label="PropFlow home">
          <span className="sidebar-logo-mark" aria-hidden="true" />
          <span>PropFlow</span>
        </NavLink>

        <nav className="sidebar-navigation" aria-label="Main navigation">
          <NavLink className="sidebar-link" to="/dashboard" end>
            <DashboardOutlined aria-hidden="true" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink className="sidebar-link" to="/properties">
            <HomeWorkOutlined aria-hidden="true" />
            <span>Properties</span>
          </NavLink>
          <NavLink className="sidebar-link" to="/site-visits">
            <EventOutlined aria-hidden="true" />
            <span>Site visits</span>
          </NavLink>
          {user?.role === "ADMIN" && (
            <div className="sidebar-admin-group">
              <span className="sidebar-section-label">ADMIN</span>
              <NavLink className="sidebar-link" to="/admin/users">
                <PeopleAltOutlined aria-hidden="true" />
                <span>Users</span>
              </NavLink>
              <NavLink className="sidebar-link" to="/admin/master-data">
                <TuneOutlined aria-hidden="true" />
                <span>Master data</span>
              </NavLink>
            </div>
          )}
          {user?.role === "SUPER_ADMIN" && (
            <NavLink className="sidebar-link" to="/super-admin/tenants">
              <AdminPanelSettingsOutlined aria-hidden="true" />
              <span>Platform console</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-user" title={user?.email || "Signed in account"}>
          <span className="sidebar-user-context">PropFlow · {role}</span>
          <strong>{user?.name || user?.email || "Signed in"}</strong>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;