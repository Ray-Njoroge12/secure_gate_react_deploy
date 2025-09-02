// client/src/components/Sidebar.jsx
import { Link, useLocation } from "react-router-dom";

export default function Sidebar({ role }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? "active" : "";

  if (role === "resident") {
    return (
      <div className="sidebar">
        <h2>Resident Menu</h2>
        <ul>
          <li className={isActive("/pages/resident")}>
            <Link to="/pages/resident">Dashboard</Link>
          </li>
          <li className={isActive("/pages/resident/AddVisitor")}>
            <Link to="/pages/resident/AddVisitor">Add Visitor</Link>
          </li>
          <li className={isActive("/pages/resident/GeneratePass")}>
            <Link to="/pages/resident/GeneratePass">Generate Pass</Link>
          </li>
          <li className={isActive("/pages/resident/VisitorHistory")}>
            <Link to="/pages/resident/VisitorHistory">Visitor History</Link>
          </li>
          <li className={isActive("/pages/resident/BulkInvite")}>
            <Link to="/pages/resident/BulkInvite">Bulk Invite</Link>
          </li>
          <li className={isActive("/pages/resident/Settings")}>
            <Link to="/pages/resident/Settings">Settings</Link>
          </li>
        </ul>
      </div>
    );
  }

  // Keep existing logic for guard/admin
  if (role === "guard") {
  return (
    <div className="sidebar">
      <h2>Guard Menu</h2>
      <ul>
        <li className={isActive("/dashboard/guard")}>
          <Link to="/dashboard/guard">Dashboard</Link>
        </li>
        <li className={isActive("/dashboard/guard/scanner")}>
          <Link to="/dashboard/guard/scanner">Open Scanner</Link>
        </li>
        <li className={isActive("/dashboard/guard/manual-check")}>
          <Link to="/dashboard/guard/manual-check">Manual Check</Link>
        </li>
        <li className={isActive("/pages/guard/VisitorHistory")}>
          <Link to="/pages/guard/VisitorHistory">Visitor History</Link>
        </li>
        <li className={isActive("/pages/guard/Settings")}>
          <Link to="/pages/guard/Settings">Settings</Link>
        </li>
        <li>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/login";
            }}
            className="btn"
          >
            Logout
          </button>
        </li>
      </ul>
    </div>
  );
}

  if (role === "admin") {
    return (
      <div className="sidebar">
        <h2>Admin Menu</h2>
        <ul>
          <li><Link to="/dashboard/admin">Admin Dashboard</Link></li>
        </ul>
      </div>
    );
  }

  return null;
}
