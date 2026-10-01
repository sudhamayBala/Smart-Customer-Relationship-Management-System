export const navigationItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    roles: ["ADMIN", "MANAGER", "AGENT"],
  },
  {
    label: "Properties",
    path: "/properties",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    label: "My Properties",
    path: "/my-properties",
    roles: ["ADMIN", "MANAGER", "AGENT"],
  },
  {
    label: "Users",
    path: "/admin/users",
    roles: ["ADMIN"],
  },
  {
    label: "Master Data",
    path: "/admin/master-data",
    roles: ["ADMIN"],
  },
  {
    label: "Tenants",
    path: "/super-admin/tenants",
    roles: ["SUPER_ADMIN"],
  },
];