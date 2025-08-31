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
        </ul>
      </div>
    );
  }

  // Keep existing logic for guard/admin
  if (role === "security") {
    return (
      <div className="sidebar">
        <h2>Guard Menu</h2>
        <ul>
          <li><Link to="/dashboard/guard">Guard Dashboard</Link></li>
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
