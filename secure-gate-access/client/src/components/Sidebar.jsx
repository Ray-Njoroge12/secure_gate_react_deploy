// client/src/components/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

const Link = ({ to, children }) => (
  <NavLink to={to} className={({isActive}) => "navlink" + (isActive ? " active" : "")}>
    {children}
  </NavLink>
);

export default function Sidebar({ role, onLogout, error }) {
  return (
    <aside className="sidebar" style={{display:'flex', flexDirection:'column', height:'100%'}}>
      <div>
        <h2>SecureGate</h2>
        {error && <div className="error-message">{error}</div>}
        {role === "resident" && (
          <>
            <div className="group-title">Resident</div>
            <Link to="/dashboard/resident">Dashboard</Link>
            <Link to="/resident/add-visitor">Add Visitor</Link>
            <Link to="/resident/generate-pass">Generate Pass</Link>
            <Link to="/resident/visitor-history">Visitor History</Link>
            <Link to="/resident/bulk-invite">Bulk Invite</Link>
            <Link to="/resident/settings">Settings</Link>
          </>
        )}
        {role === "security" && (
          <>
            <div className="group-title">Guard</div>
            <Link to="/dashboard/guard">Dashboard</Link>
            <Link to="/dashboard/guard/scan-qr">Scan QR</Link>
            <Link to="/dashboard/guard/manual-check">Manual Check</Link>
            <Link to="/dashboard/guard/visitor-history">Visitor History</Link>
          </>
        )}
        {role === "admin" && (
          <>
            <div className="group-title">Admin</div>
            <li><Link to="/admin">Dashboard</Link></li>
            <li><Link to="/admin/users">User Management</Link></li>
            <li><Link to="/admin/guards">Guards</Link></li>
            <li><Link to="/admin/visitors">Visitors</Link></li>
            <li><Link to="/admin/incidents">Incidents</Link></li>
            <li><Link to="/admin/access">Access Control</Link></li>
            <li><Link to="/admin/reports">Reports</Link></li>
            <li><Link to="/admin/settings">Settings</Link></li>
          </>
        )}
      </div>
      <button className="btn" style={{marginTop:'auto', width:'100%'}} onClick={onLogout}>Logout</button>
    </aside>
  );
}
