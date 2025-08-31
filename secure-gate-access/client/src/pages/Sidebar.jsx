import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar({ role }) {
  const menuItems = {
    admin: [
      { label: "Dashboard", path: "/dashboard/admin" },
      { label: "User Management", path: "/dashboard/admin/users" },
      { label: "Visitor Logs", path: "/dashboard/admin/visitors" },
    ],
    guard: [
      { label: "Dashboard", path: "/dashboard/guard" },
      { label: "Scan Visitor", path: "/dashboard/guard/scan" },
      { label: "Validations", path: "/dashboard/guard/validations" },
    ],
    resident: [
      { label: "Dashboard", path: "/dashboard/resident" },
      { label: "My Visitors", path: "/dashboard/resident/visitors" },
      { label: "Requests History", path: "/pages/resident/VisitorHistory" },
    ],
  };

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Secure Gate</h2>
      <ul>
        {menuItems[role]?.map((item, idx) => (
          <li key={idx}>
            <Link to={item.path}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
